// Updated: changed loadInlineActivity from a const arrow function to a function declaration
// so it's always available for the JSX onClick reference (fixes "Cannot find name 'loadInlineActivity'").
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CallIcon from '@mui/icons-material/Call';
import HistoryIcon from '@mui/icons-material/History';
import ConfirmDialog from './ConfirmDialog';
import adminApi from '../../lib/adminApi';
import UserActivityModal from './UserActivityModal';

type Props = {
  open: boolean;
  onClose: () => void;
  userId: number | string | null;
  userData?: any;
  onUpdated?: (u: any) => void;
};

type ActivityRow = {
  id?: number;
  user_id?: number;
  email?: string;
  ip?: string | null;
  user_agent?: string | null;
  created_at?: string;
};

interface ResetResponse {
  message?: string;
  user?: any;
  [k: string]: any;
}

/**
 * UserDetailModal
 *
 * Notes about the passphrase display / reveal behaviour implemented here:
 * - We prefer the admin API's canonical user object for display.
 * - Many admin endpoints intentionally omit sensitive fields (e.g. the stored
 *   recoveryPassphraseHash). To preserve the masked hash / reveal button when
 *   the modal was opened from a list that included it, we merge the parent's
 *   userData passphrase/hash into the fetched object when the fetched object
 *   does not include any hash field.
 * - This merge is read-only and only for display; it does not send any
 *   sensitive values back to the server or change server behaviour.
 */
export default function UserDetailModal({ open, onClose, userId, userData, onUpdated }: Props) {
  const [saving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPassphraseConfirm, setShowPassphraseConfirm] = useState(false);
  const [showSecurityConfirm, setShowSecurityConfirm] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [showFullPassphrase, setShowFullPassphrase] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  // Snackbar state (admin notifications)
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('info');

  // Inline activity
  const [showActivity, setShowActivity] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityTried, setActivityTried] = useState(false);

  // External activity modal
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityEmail, setActivityEmail] = useState<string | undefined>(undefined);
  const [activityUserId, setActivityUserId] = useState<number | undefined>(undefined);

  // Local canonical user object
  // keep as `any` to match your existing codebase and avoid TS index errors for dynamic shapes
  const [displayUser, setDisplayUser] = useState<any | null>(userData ?? null);
  const [userLoading, setUserLoading] = useState(false);

  // Derived last-login from activity if user object lacks last-login fields
  const [derivedLastLogin, setDerivedLastLogin] = useState<string | null>(null);

  // ---------- Helper functions ----------
  const planExpiryFor = (u: any) => {
    if (!u) return null;
    const candidates = [
      u.planExpiry,
      u.plan_expiry,
      u.plan_expires_at,
      u.plan_expires,
      u.subscription?.ends_at,
      u.subscription?.expires_at,
      u.subscription?.expires,
      u.meta?.planExpiry,
      u.metadata?.plan_expires_at,
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).trim() !== '') return c;
    }
    return null;
  };

  const lastLoginFor = (u: any) => {
    if (!u) return null;
    const candidates = [
      u.lastLogin,
      u.last_login,
      u.lastSeen,
      u.last_seen,
      u.lastActive,
      u.last_active,
      u.signInAt,
      u.last_sign_in_at,
      u.auth?.last_login,
      u.metadata?.last_seen,
      u.profile?.last_login,
      u.stats?.last_login,
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).trim() !== '') return c;
    }
    return null;
  };

  const parseDate = (raw: any) => {
    if (!raw) return null;
    try {
      if (typeof raw === 'number') {
        if (raw < 1e12) return new Date(raw * 1000);
        return new Date(raw);
      }
      if (typeof raw === 'string') {
        const s = raw.trim();
        if (/^\d+$/.test(s)) {
          const n = Number(s);
          return s.length === 10 ? new Date(n * 1000) : new Date(n);
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d;
      }
      if (raw instanceof Date) {
        if (!isNaN(raw.getTime())) return raw;
      }
      return null;
    } catch {
      return null;
    }
  };

  const formatDate = (raw: any) => {
    const d = parseDate(raw);
    if (!d) return '-';
    return d.toLocaleString();
  };

  const phoneFor = (u: any) => u?.phone ?? u?.phoneNumber ?? u?.telephone ?? u?.mobile ?? null;

  const copyToClipboard = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setStatus('Copied to clipboard');
      setTimeout(() => setStatus(null), 1400);
    } catch {
      // ignore
    }
  };

  const openActivityModal = () => {
    const email = displayUser?.email ?? displayUser?.user_email ?? undefined;
    const uid =
      typeof displayUser?.id === 'number'
        ? displayUser.id
        : typeof displayUser?.user_id === 'number'
        ? displayUser.user_id
        : undefined;
    setActivityEmail(email);
    setActivityUserId(uid);
    setActivityModalOpen(true);
  };

  // Mask the hash for safe display (first 6 / last 6)
  const maskedHash = (h?: string | null) => {
    if (!h || typeof h !== 'string' || h.length === 0) return '—';
    if (h.length <= 12) return `${h}`; // short hash, show as-is
    return `${h.slice(0, 6)}...${h.slice(-6)}`;
  };

  // Reveal the stored hash (attempts to create an audit/reveal record on the server)
  const handleRevealPassphrase = async () => {
    setStatus(null);
    try {
      const id = userId ?? displayUser?.id ?? displayUser?.user_id ?? displayUser?.user_uid;
      try {
        // This call should audit the action server-side and (optionally) allow reveal.
        await adminApi.post(`/admin/users/${encodeURIComponent(String(id))}/reveal-passphrase`, { action: 'reveal' });
      } catch (auditErr) {
        // audit attempt failed (non-fatal)
        console.warn('reveal-passphrase audit failed', auditErr);
      }

      setShowFullPassphrase(true);
      setShowRevealConfirm(false);
      setStatus('Passphrase hash revealed (audit attempted)');
      setTimeout(() => setStatus(null), 2200);
    } catch (err: any) {
      setStatus('Unable to reveal passphrase hash');
    }
  };

  // Fetch canonical admin user details (single GET) and merge sensitive fields from userData if missing.
  // The merge is read-only for display only and does not send sensitive values back to the server.
  const fetchDisplayUser = async () => {
    // make a safe idCandidate using String(...) and null checks
    const idCandidate = userId ?? userData?.id ?? userData?.user_id ?? userData?.user_uid ?? null;
    if (idCandidate == null || String(idCandidate).trim() === '') return null;

    try {
      // Tell TypeScript we expect any shape back — prevents "property does not exist on type {}" errors
      const res = await adminApi.get<any>(`/admin/users/${encodeURIComponent(String(idCandidate))}`);
      const fetched: any = res?.data ?? null;

      if (fetched) {
        // Detect whether fetched includes any passphrase/hash-like field (use optional chaining)
        const fetchedHasHash =
          Boolean(fetched?.recoveryPassphraseHash) ||
          Boolean(fetched?.recovery_passphrase_hash) ||
          Boolean(fetched?.passphrase) ||
          Boolean(fetched?.securityPassphrase);

        if (!fetchedHasHash && userData) {
          // If parent-provided userData had a masked hash, preserve it for display so Reveal/Copy remain available.
          const candidateHash =
            userData?.recoveryPassphraseHash ??
            userData?.recovery_passphrase_hash ??
            userData?.passphrase ??
            userData?.securityPassphrase ??
            null;

          if (candidateHash) {
            // shallow clone fetched and inject the candidateHash into a commonly-used property
            const copy = { ...fetched, recoveryPassphraseHash: candidateHash };
            setDisplayUser(copy);
            if (onUpdated) onUpdated(copy);
            return copy;
          }
        }

        setDisplayUser(fetched);
        if (onUpdated) onUpdated(fetched);
      }

      return fetched;
    } catch (err) {
      // On any error, fallback to parent-provided userData (do not throw)
      return null;
    }
  };

  // --- FIXED: declare loadInlineActivity as a function declaration (hoisted) to ensure JSX can reference it reliably.
  async function loadInlineActivity() {
    setActivityTried(true);
    setActivityError(null);
    setActivityLoading(true);
    setActivityRows([]);
    setShowActivity(false);

    const email = displayUser?.email ? String(displayUser.email).trim() : '';
    if (!email) {
      setActivityError('No email available to fetch activity.');
      setActivityLoading(false);
      return;
    }

    try {
      const res = await adminApi.get<ActivityRow[] | { rows?: ActivityRow[] }>('/admin/users/activity-raw', { params: { email } });
      const data = res.data as any;
      const rows: ActivityRow[] = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
      setActivityRows(rows);
      setShowActivity(true);
      if (!Array.isArray(rows) || rows.length === 0) setActivityError('No login activity found for this user.');
      else setActivityError(null);
    } catch (err: any) {
      setActivityError(String(err?.response?.data?.message ?? err?.message ?? 'Failed to load activity'));
    } finally {
      setActivityLoading(false);
    }
  }

  // -----------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    const ensureFullUser = async () => {
      if (!open) {
        setDisplayUser(null);
        setUserLoading(false);
        setActivityRows([]);
        setShowActivity(false);
        setActivityError(null);
        setActivityTried(false);
        setDerivedLastLogin(null);
        setShowFullPassphrase(false);
        return;
      }

      // If parent provided a full user (has phone and created) use it
      const hasPhone = !!(userData?.phone || userData?.phoneNumber || userData?.mobile);
      const hasCreated = !!(userData?.createdAt || userData?.created_at || userData?.created);
      if (userData && hasPhone && hasCreated) {
        setDisplayUser(userData);
        setUserLoading(false);
        return;
      }

      setUserLoading(true);
      try {
        let fetched: any = null;
        const idCandidate = userId ?? userData?.id ?? userData?.user_id ?? userData?.user_uid ?? null;
        const emailCandidate = userData?.email ?? userData?.user_email ?? null;

        if (idCandidate != null && String(idCandidate).trim() !== '') {
          try {
            const res = await adminApi.get<any>(`/admin/users/${encodeURIComponent(String(idCandidate))}`);
            fetched = res?.data ?? null;
          } catch {
            // ignore: fallback to email
          }
        }

        if (!fetched && emailCandidate) {
          try {
            const res = await adminApi.get<any>('/admin/users', { params: { email: emailCandidate } });
            const body = res?.data;
            if (Array.isArray(body) && body.length > 0) fetched = body[0];
            else if (body && typeof body === 'object') fetched = body;
          } catch {
            // ignore
          }
        }

        if (!cancelled) setDisplayUser(fetched ?? userData ?? null);
      } catch {
        if (!cancelled) setDisplayUser(userData ?? null);
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    };

    ensureFullUser();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, userData]);

  // Poll/focus-refresh while modal open so admin sees updated configured state
  useEffect(() => {
    if (!open) return;

    let mounted = true;
    let intervalId: number | undefined;

    // Fetch immediately once
    (async () => {
      await fetchDisplayUser();
    })();

    // Poll every 3s while modal is open; skip polling while saving to avoid conflicting updates
    intervalId = window.setInterval(() => {
      if (!mounted || saving) return;
      fetchDisplayUser();
    }, 3000);

    // Refresh once when window regains focus (useful if admin switched tabs)
    const onFocus = () => {
      if (!mounted) return;
      if (!saving) fetchDisplayUser();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      try { window.clearInterval(intervalId); } catch {}
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, saving]);

  // if the user object has no last-login, attempt to fetch recent activity and derive the last-login
  useEffect(() => {
    let cancelled = false;
    const computeDerivedLastLogin = async () => {
      setDerivedLastLogin(null);
      if (!displayUser) return;

      const direct = lastLoginFor(displayUser);
      if (direct) return; // no need to derive

      const email = displayUser?.email ?? displayUser?.user_email ?? null;
      if (!email) return;

      try {
        const res = await adminApi.get<ActivityRow[] | { rows?: ActivityRow[] }>('/admin/users/activity-raw', { params: { email } });
        const data = res.data as any;
        const rows: ActivityRow[] = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
        if (cancelled) return;
        if (Array.isArray(rows) && rows.length) {
          let newest: ActivityRow | null = null;
          for (const r of rows) {
            if (!r?.created_at) continue;
            if (!newest) { newest = r; continue; }
            const tNew = new Date(r.created_at).getTime();
            const tOld = new Date(newest.created_at!).getTime();
            if (tNew > tOld) newest = r;
          }
          if (newest?.created_at) setDerivedLastLogin(newest.created_at);
        }
      } catch {
        // ignore
      }
    };

    computeDerivedLastLogin();
    return () => {
      cancelled = true;
    };
  }, [displayUser]);

  // Admin actions: reset password (unchanged, snack added)
  const handleResetPassword = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const id = userId ?? displayUser?.id ?? displayUser?.user_id ?? displayUser?.user_uid;
      const res = await adminApi.post<ResetResponse>(`/admin/users/${encodeURIComponent(String(id))}/reset-password`, { newPassword });
      const data = (res?.data ?? {}) as ResetResponse;
      setStatus(data.message ?? 'Password reset');
      const updated = data.user ?? null;
      if (updated) {
        setDisplayUser(updated);
        if (onUpdated) onUpdated(updated);
      }

      // show tiny notification to admin
      setSnackMsg(data.message ?? 'Password reset');
      setSnackSeverity('success');
      setSnackOpen(true);
    } catch (err: any) {
      const serverMsg = (err?.response?.data as ResetResponse)?.message ?? err?.message ?? 'Unable to reset password';
      setStatus(String(serverMsg));

      setSnackMsg(String(serverMsg));
      setSnackSeverity('error');
      setSnackOpen(true);
    } finally {
      setSaving(false);
      setShowResetConfirm(false);
      // auto-hide handled by Snackbar
    }
  };

  // Admin actions: reset security (clears questions & passphrase, revokes sessions, sets require_security_setup flag, audit)
  const handleForceResetSecurity = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const id = userId ?? displayUser?.id ?? displayUser?.user_id ?? displayUser?.user_uid;
      const res = await adminApi.post<ResetResponse>(`/admin/users/${encodeURIComponent(String(id))}/reset-security`, {});
      const data = (res?.data ?? {}) as ResetResponse;
      setStatus(data.message ?? 'Security reset');
      const updated = data.user ?? null;
      if (updated) {
        setDisplayUser(updated);
        setShowFullPassphrase(false);
        if (onUpdated) onUpdated(updated);
      }

      // show tiny notification to admin
      setSnackMsg(data.message ?? 'Security reset');
      setSnackSeverity('success');
      setSnackOpen(true);
    } catch (err: any) {
      const serverMsg = (err?.response?.data as ResetResponse)?.message ?? err?.message ?? 'Unable to reset security data';
      setStatus(String(serverMsg));

      setSnackMsg(String(serverMsg));
      setSnackSeverity('error');
      setSnackOpen(true);
    } finally {
      setSaving(false);
      setShowSecurityConfirm(false);
    }
  };

  // Admin action: reset passphrase specifically (same server-side semantics as reset-security)
  const handleForceResetPassphrase = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const id = userId ?? displayUser?.id ?? displayUser?.user_id ?? displayUser?.user_uid;
      const res = await adminApi.post<ResetResponse>(`/admin/users/${encodeURIComponent(String(id))}/reset-passphrase`, {});
      const data = (res?.data ?? {}) as ResetResponse;
      setStatus(data.message ?? 'Passphrase reset');
      const updated = data.user ?? null;
      if (updated) {
        setDisplayUser(updated);
        setShowFullPassphrase(false);
        if (onUpdated) onUpdated(updated);
      }

      // show tiny notification to admin
      setSnackMsg(data.message ?? 'Passphrase reset');
      setSnackSeverity('success');
      setSnackOpen(true);
    } catch (err: any) {
      const serverMsg = (err?.response?.data as ResetResponse)?.message ?? err?.message ?? 'Unable to reset passphrase';
      setStatus(String(serverMsg));

      setSnackMsg(String(serverMsg));
      setSnackSeverity('error');
      setSnackOpen(true);
    } finally {
      setSaving(false);
      setShowPassphraseConfirm(false);
    }
  };

  if (!displayUser && !userLoading && !open) return null;
  if (!displayUser && userLoading) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="user-details-loading">
        <DialogTitle id="user-details-loading">User details</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  // Determine which last-login to show: direct field first, then derived from activity
  const lastLoginValue = lastLoginFor(displayUser) ?? derivedLastLogin ?? null;

  // Determine stored hash value from whatever shape backend returns (handle common names)
  const storedHash =
    displayUser?.recoveryPassphraseHash ??
    displayUser?.recovery_passphrase_hash ??
    displayUser?.passphrase ??
    displayUser?.securityPassphrase ??
    null;

  // Determine whether security questions are considered configured for display.
  // Rules:
  // - If the server explicitly requires security setup (require_security_setup / requireSecuritySetup) show "Not configured".
  // - Otherwise, treat securityConfigured / security_configured true OR presence of securityQuestions array OR presence of security answer count as configured.
  const requireSecurityFlag = !!(displayUser?.require_security_setup ?? displayUser?.requireSecuritySetup ?? false);
  const serverConfiguredFlag = !!(displayUser?.security_configured ?? displayUser?.securityConfigured ?? false);
  const hasQuestionsArray = Array.isArray(displayUser?.securityQuestions) && displayUser.securityQuestions.length > 0;
  const securityAnswerCount = Number(displayUser?.securityAnswerCount ?? displayUser?.security_answers_count ?? displayUser?.security_answers_count ?? 0) || 0;
  const computedConfigured = !requireSecurityFlag && (serverConfiguredFlag || hasQuestionsArray || securityAnswerCount > 0);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="user-details-title">
        <DialogTitle id="user-details-title">User details</DialogTitle>

        {/* DialogContent set to relative so we can show a saving overlay while admin actions are in-flight */}
        <DialogContent dividers sx={{ position: 'relative' }}>
          {/* Saving overlay */}
          {saving && (
            <Box
              sx={{
                position: 'absolute',
                zIndex: 1200,
                inset: 0,
                backgroundColor: 'rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 1,
                p: 2,
              }}
            >
              <CircularProgress />
              <Typography variant="body2">Processing…</Typography>
            </Box>
          )}

          <Box sx={{ display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption">User ID</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {displayUser?.user_uid ?? displayUser?.id ?? '—'}
                </Typography>
              </Box>
              <Box>
                <Tooltip title="Copy ID">
                  <IconButton size="small" onClick={() => copyToClipboard(displayUser?.user_uid ?? displayUser?.id)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Typography variant="caption">Full name</Typography>
            <Typography variant="body1">{displayUser?.name ?? '—'}</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption">Email</Typography>
                <Typography variant="body1">{displayUser?.email ?? displayUser?.user_email ?? '—'}</Typography>
              </Box>
              <Box>
                <Tooltip title="Copy email">
                  <IconButton size="small" onClick={() => copyToClipboard(displayUser?.email ?? displayUser?.user_email)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Typography variant="caption">Phone</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                {phoneFor(displayUser) ?? '—'}
              </Typography>
              {phoneFor(displayUser) && (
                <Tooltip title="Call">
                  <IconButton size="small" component="a" href={`tel:${phoneFor(displayUser)}`}>
                    <CallIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Typography variant="caption">Plan</Typography>
            <Typography variant="body1">{displayUser?.plan ?? '—'}</Typography>

            <Typography variant="caption">Plan expiry</Typography>
            <Typography variant="body1">{formatDate(planExpiryFor(displayUser))}</Typography>

            <Typography variant="caption">Role</Typography>
            <Typography variant="body1">{displayUser?.role ?? displayUser?.user_role ?? 'user'}</Typography>

            <Typography variant="caption">Created</Typography>
            <Typography variant="body1">{formatDate(displayUser?.createdAt ?? displayUser?.created_at ?? displayUser?.created)}</Typography>

            <Typography variant="caption">Last login</Typography>
            <Typography variant="body1">{lastLoginValue ? formatDate(lastLoginValue) : '-'}</Typography>

            <Typography variant="caption">Security questions</Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              {Array.isArray(displayUser?.securityQuestions)
                ? displayUser.securityQuestions.join(', ')
                : computedConfigured
                ? 'Configured'
                : 'Not configured'}
            </Typography>

            {/* Show stored hash (masked by default) */}
            <Typography variant="caption">Stored recovery passphrase hash</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {storedHash ? (showFullPassphrase ? storedHash : maskedHash(storedHash)) : '—'}
              </Typography>

              {storedHash && (
                <>
                  <Tooltip title={showFullPassphrase ? "Copy full hash" : "Reveal full hash"}>
                    <span>
                      <Button
                        size="small"
                        variant={showFullPassphrase ? "outlined" : "contained"}
                        color={showFullPassphrase ? "primary" : "warning"}
                        onClick={() => setShowRevealConfirm(true)}
                      >
                        {showFullPassphrase ? "Revealed" : "Reveal hash"}
                      </Button>
                    </span>
                  </Tooltip>

                  <Tooltip title="Copy hash">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (showFullPassphrase) copyToClipboard(storedHash);
                          else {
                            copyToClipboard(maskedHash(storedHash));
                            setStatus('Copied masked hash');
                            setTimeout(() => setStatus(null), 1200);
                          }
                        }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              )}
            </Box>
            <Typography variant="caption" sx={{ color: '#666' }}>
              This displays the stored recoveryPassphraseHash (HMAC) — not the user's plaintext passphrase. Revealing or copying this value is sensitive and should be audited.
            </Typography>

            {/* SINGLE Activity control: opens the Activity modal. */}
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" startIcon={<HistoryIcon />} onClick={openActivityModal}>
                Activity
              </Button>
              <Button
                variant="outlined"
                sx={{ ml: 1 }}
                onClick={loadInlineActivity}
                disabled={activityLoading}
              >
                Load activity
              </Button>
              {activityLoading && <CircularProgress size={18} sx={{ ml: 1 }} />}
            </Box>

            {activityTried && activityError && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {activityError}
              </Typography>
            )}

            {showActivity && activityRows.length > 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 240, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>IP</TableCell>
                      <TableCell>User agent</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activityRows.map((r) => (
                      <TableRow key={r.id ?? `${r.created_at}-${r.ip}`}>
                        <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</TableCell>
                        <TableCell>{r.ip ?? '-'}</TableCell>
                        <TableCell sx={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.user_agent ?? '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {status && <Typography variant="body2" color="error" sx={{ mt: 2 }}>{status}</Typography>}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Close</Button>
          <Button variant="outlined" color="warning" onClick={() => setShowPassphraseConfirm(true)} disabled={saving}>
            Reset passphrase
          </Button>
          <Button variant="outlined" color="warning" onClick={() => setShowSecurityConfirm(true)} disabled={saving}>
            Reset security
          </Button>
          <Button variant="contained" color="primary" onClick={() => setShowResetConfirm(true)} disabled={saving}>
            Reset password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm dialog for password reset */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Confirm password reset"
        description="Are you sure you want to reset this user's password? This action will update their password or generate a temporary token."
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetPassword}
        confirmLabel="Yes, reset"
      />

      {/* Confirm dialog for passphrase reset */}
      <ConfirmDialog
        open={showPassphraseConfirm}
        title="Confirm passphrase reset"
        description="Resetting the user's passphrase will delete the stored passphrase. The user will be required to set a new passphrase on next login. This will also revoke sessions and be logged."
        onClose={() => setShowPassphraseConfirm(false)}
        onConfirm={handleForceResetPassphrase}
        confirmLabel="Yes, reset passphrase"
      />

      {/* Confirm dialog for security reset */}
      <ConfirmDialog
        open={showSecurityConfirm}
        title="Confirm security reset"
        description="Resetting the user's security will clear their security questions and passphrase, revoke sessions, and require them to reconfigure on next login. This action is auditable."
        onClose={() => setShowSecurityConfirm(false)}
        onConfirm={handleForceResetSecurity}
        confirmLabel="Yes, reset security"
      />

      {/* Confirm dialog for revealing the stored hash */}
      <ConfirmDialog
        open={showRevealConfirm}
        title="Reveal stored passphrase hash?"
        description="Revealing the stored recovery passphrase hash is sensitive. This action will be recorded in audit logs (if supported). Do you want to proceed?"
        onClose={() => setShowRevealConfirm(false)}
        onConfirm={handleRevealPassphrase}
        confirmLabel="Yes, reveal"
      />

      <UserActivityModal
        open={activityModalOpen}
        email={activityEmail}
        userId={activityUserId}
        onClose={() => setActivityModalOpen(false)}
      />

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>
          {snackMsg}
        </Alert>
      </Snackbar>
    </>
  );
}
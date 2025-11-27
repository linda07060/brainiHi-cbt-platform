// pages/admin/settings.tsx
import React, { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Grid,
  Button,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
} from '@mui/material';
import adminApi from '../../lib/adminApi';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';

type PerPlanLimits = {
  testsPerDay?: number;
  questionCountMax?: number;
  attemptsPerTest?: number;
  explanationsPerMonth?: number;
};

type SettingsShape = {
  siteTitle?: string;
  siteDescription?: string;
  footerHtml: string;
  logoDataUrl?: string | null;
  brandColor?: string;
  accentColor?: string;
  limits?: {
    perPlan?: { free?: PerPlanLimits; pro?: PerPlanLimits; tutor?: PerPlanLimits };
    enforcePlanLimits?: boolean;
  };
  announcement: { enabled: boolean; html: string };
  support: { email?: string; phone?: string; url?: string };
  maintenance: { enabled: boolean; message: string };
  lastSavedAt?: string | null;
  [k: string]: any;
};

type ServerSaveResponse = {
  ok?: boolean;
  saved?: Partial<SettingsShape>;
};

type ServerGetResponse = {
  ok?: boolean;
  settings?: Partial<SettingsShape>;
  saved?: Partial<SettingsShape>;
};

type ServerHealthResponse = {
  ok?: boolean;
  server?: string;
  db?: boolean;
  timestamp?: string;
};

// Admin defaults (siteTitle/siteDescription intentionally empty if not used)
const DEFAULTS: SettingsShape = {
  siteTitle: '',
  siteDescription: '',
  footerHtml: '<p>&copy; Your Company. All rights reserved.</p>',
  logoDataUrl: null,
  brandColor: '#861f41',
  accentColor: '#f6b024',
  limits: {
    perPlan: {
      free: { testsPerDay: 1, questionCountMax: 10, attemptsPerTest: 1, explanationsPerMonth: 5 },
      pro: { testsPerDay: 20, questionCountMax: 50, attemptsPerTest: 3, explanationsPerMonth: 500 },
      tutor: { testsPerDay: 9999, questionCountMax: 999, attemptsPerTest: 10, explanationsPerMonth: 9999 },
    },
    enforcePlanLimits: false,
  },
  announcement: { enabled: false, html: '' },
  support: { email: '', phone: '', url: '' },
  maintenance: { enabled: false, message: 'Site is under maintenance. Please check back later.' },
  lastSavedAt: null,
};

const STORAGE_KEY = 'adminSettings';
const PUBLIC_CACHE_KEY = 'publicSiteSettings';
const FORCE_LOCAL_UNTIL_KEY = 'ADMIN_SETTINGS_FORCE_LOCAL_UNTIL';
const FORCE_LOCAL_GRACE_MS = 5 * 60 * 1000;

function isPlainObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function deepMerge<T = any>(target: T, source: Partial<T>): T {
  if (!isPlainObject(target)) return (source as any) ?? target;
  if (!isPlainObject(source)) return (source as any) ?? target;
  const out: any = { ...(target as any) };
  for (const key of Object.keys(source as any)) {
    const sVal = (source as any)[key];
    const tVal = (target as any)[key];
    if (isPlainObject(tVal) && isPlainObject(sVal)) out[key] = deepMerge(tVal, sVal);
    else out[key] = sVal;
  }
  return out;
}

/**
 * WHITELIST: keys we still want persisted to server/public cache.
 * Update this list if you add/remove admin-managed sections.
 */
const ALLOWED_SAVE_KEYS: Array<keyof SettingsShape> = [
  'footerHtml',
  'announcement',
  'support',
  'maintenance',
  'lastSavedAt',
];

/**
 * pruneSettingsForServer
 * - Return a shallow object containing only allowed keys from the provided settings.
 * - For nested allowed keys (announcement/support/maintenance) we copy them through if present.
 * - This prevents removed/unused keys from being sent to the server and thus from being stored.
 */
function pruneSettingsForServer(src: Partial<SettingsShape> | SettingsShape): Partial<SettingsShape> {
  const out: Partial<SettingsShape> = {};
  for (const k of ALLOWED_SAVE_KEYS) {
    if (k in src) {
      const val = (src as any)[k];
      // clone objects to avoid sharing references
      if (isPlainObject(val)) out[k] = JSON.parse(JSON.stringify(val));
      else out[k] = val;
    }
  }
  // ensure footerHtml exists (fallback) so server sees at least defaults for visible fields
  if (!('footerHtml' in out)) out.footerHtml = DEFAULTS.footerHtml;
  return out;
}

/**
 * sanitizeSettings
 * - Keep basic sanitization for textual fields that still exist in the admin UI.
 */
function sanitizeSettings(incoming: Partial<SettingsShape>): Partial<SettingsShape> {
  const out: Partial<SettingsShape> = { ...(incoming as any) };

  function looksLikeUrlOrAdmin(value: any) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return true;
    if (trimmed.includes('/admin')) return true;
    if (trimmed.includes('localhost') && trimmed.includes(':')) return true;
    return false;
  }

  if ('footerHtml' in out && typeof out.footerHtml !== 'string') out.footerHtml = DEFAULTS.footerHtml;

  if ('announcement' in out) {
    const a = out.announcement as any;
    if (!isPlainObject(a)) out.announcement = { ...DEFAULTS.announcement };
    else {
      a.html = typeof a.html === 'string' ? a.html : '';
      a.enabled = !!a.enabled;
    }
  }

  if ('support' in out) {
    const s = out.support as any;
    if (!isPlainObject(s)) out.support = { ...DEFAULTS.support };
    else {
      s.email = typeof s.email === 'string' ? s.email.trim() : '';
      s.phone = typeof s.phone === 'string' ? s.phone.trim() : '';
      s.url = typeof s.url === 'string' && !looksLikeUrlOrAdmin(s.url) ? s.url.trim() : s.url ? s.url.trim() : '';
    }
  }

  if ('maintenance' in out) {
    const m = out.maintenance as any;
    if (!isPlainObject(m)) out.maintenance = { ...DEFAULTS.maintenance };
    else {
      m.enabled = !!m.enabled;
      m.message = typeof m.message === 'string' ? m.message : DEFAULTS.maintenance.message;
    }
  }

  return out;
}

export default function AdminSettings(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // auth guard
  useEffect(() => {
    const rawAdmin = typeof window !== 'undefined' ? localStorage.getItem('adminAuth') : null;
    const adminStored = rawAdmin ? JSON.parse(rawAdmin) : null;
    if ((!user || (user as any).role !== 'admin') && !adminStored) {
      router.push('/admin/login');
    }
  }, [user, router]);

  // Avoid reading localStorage during SSR — initialize after mount
  const [settings, setSettings] = useState<SettingsShape>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsShape>;
        const sanitized = sanitizeSettings(parsed);
        const merged = deepMerge(DEFAULTS, sanitized);
        setSettings(merged);
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [statusMsg, setStatusMsg] = useState<string>('');
  const [loadingSection, setLoadingSection] = useState<{ [k: string]: boolean }>({});
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');

  const showToast = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'info', duration = 3000) => {
    setToastMsg(message);
    setToastSeverity(severity);
    setToastOpen(true);
    if (duration > 0) window.setTimeout(() => setToastOpen(false), duration);
  };
  const handleCloseToast = (_?: any, reason?: string) => {
    if (reason === 'clickaway') return;
    setToastOpen(false);
  };

  const preferLocalRef = useRef(false);
  function shouldPreferLocalAfterReset(): boolean {
    try {
      if (preferLocalRef.current) return true;
      const raw = localStorage.getItem(FORCE_LOCAL_UNTIL_KEY);
      if (!raw) return false;
      const until = Number(raw) || 0;
      return Date.now() < until;
    } catch {
      return false;
    }
  }
  function markPreferLocalGrace() {
    try {
      preferLocalRef.current = true;
      const until = Date.now() + FORCE_LOCAL_GRACE_MS;
      localStorage.setItem(FORCE_LOCAL_UNTIL_KEY, String(until));
      setTimeout(() => {
        preferLocalRef.current = false;
      }, FORCE_LOCAL_GRACE_MS + 500);
    } catch {}
  }

  // storage listener (ignore non-JSON writes and obey prefer-local)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      try {
        if (e.key !== STORAGE_KEY && e.key !== PUBLIC_CACHE_KEY && e.key !== FORCE_LOCAL_UNTIL_KEY) return;
        if (e.key === FORCE_LOCAL_UNTIL_KEY) return;
        if (shouldPreferLocalAfterReset()) {
          setStatusMsg('Ignoring settings update from another tab (recent local reset).');
          return;
        }
        const nv = e.newValue;
        if (!nv || typeof nv !== 'string') return;
        const trimmed = nv.trim();
        if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return;
        const parsed = JSON.parse(nv) as Partial<SettingsShape>;
        const sanitized = sanitizeSettings(parsed);
        const merged = deepMerge(DEFAULTS, sanitized);
        setSettings((cur) => deepMerge(cur ?? DEFAULTS, merged));
        setStatusMsg('Settings updated from another tab');
      } catch {
        // ignore
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // fetch settings once on mount (client)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!mounted) return;
      try {
        setLoadingSection((s) => ({ ...s, serverLoad: true }));
        const resp = await adminApi.get<ServerGetResponse>('/admin/settings');
        const serverSettings = (resp?.data?.settings ?? resp?.data?.saved) ?? null;
        if (shouldPreferLocalAfterReset()) {
          setStatusMsg('Local settings preferred after reset (server ignored for a short time).');
          return;
        }
        if (serverSettings && !cancelled) {
          const sanitized = sanitizeSettings(serverSettings as Partial<SettingsShape>);
          const merged = deepMerge(DEFAULTS, sanitized);
          setSettings((cur) => deepMerge(cur ?? DEFAULTS, merged));
          try {
            // store the full admin-local copy
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            // store pruned public cache (only allowed keys)
            const pruned = pruneSettingsForServer(merged);
            localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(pruned));
          } catch {}
          setStatusMsg('Loaded settings from server');
        } else {
          setStatusMsg('Server settings not available — using local settings');
        }
      } catch (err) {
        console.error('Failed to load settings from server', err);
        setStatusMsg('Server settings not available — using local settings');
      } finally {
        setLoadingSection((s) => ({ ...s, serverLoad: false }));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  async function checkServerHealth(): Promise<{ ok: boolean; db?: boolean }> {
    try {
      const resp = await adminApi.get<ServerHealthResponse>('/admin/settings/health');
      if (resp && resp.data && resp.data.ok) return { ok: true, db: !!resp.data.db };
      return { ok: false };
    } catch {
      return { ok: false };
    }
  }

  // helpers
  function update<K extends keyof SettingsShape>(key: K, value: SettingsShape[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }
  function updateNested(path: (string | number)[], value: any) {
    setSettings((s) => {
      const copy: any = JSON.parse(JSON.stringify(s));
      let cur: any = copy;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = value;
      return copy;
    });
  }

  // save helpers: for fullSave we prune to allowed keys before sending and when writing public cache
  async function handleSaveSection(
    sectionKey: string,
    toSaveParam?: Partial<SettingsShape>,
    options?: { preferLocal?: boolean; fullSave?: boolean }
  ) {
    setLoadingSection((s) => ({ ...s, [sectionKey]: true }));
    try {
      const toSave: SettingsShape = toSaveParam
        ? options?.fullSave
          ? (toSaveParam as SettingsShape)
          : (deepMerge(settings, toSaveParam) as SettingsShape)
        : { ...settings, lastSavedAt: new Date().toISOString() };

      // sanitize and persist admin-local copy
      const sanitizedToSave = sanitizeSettings(toSave);
      const adminLocal = deepMerge(DEFAULTS, sanitizedToSave);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(adminLocal));
      } catch {}
      setSettings(adminLocal);

      if (options?.preferLocal) markPreferLocalGrace();

      // Decide payload to send: if fullSave, send only allowed keys (so removed keys get deleted on server)
      let payload: Partial<SettingsShape> = adminLocal;
      if (options?.fullSave) payload = pruneSettingsForServer(adminLocal);

      try {
        const resp = await adminApi.post<ServerSaveResponse>('/admin/settings', payload);

        if (resp?.data?.saved && typeof resp.data.saved === 'object') {
          const serverSaved = resp.data.saved as Partial<SettingsShape>;
          // Merge server saved into adminLocal where appropriate, but keep admin-provided values for fullSave
          let merged: SettingsShape;
          if (options?.fullSave) {
            // treat adminLocal as authoritative, but fill missing allowed keys from serverSaved
            const prunedServer = pruneSettingsForServer(serverSaved as any);
            merged = deepMerge(prunedServer as any, adminLocal) as SettingsShape;
          } else {
            const sanitizedServer = sanitizeSettings(serverSaved);
            merged = deepMerge(adminLocal, sanitizedServer as Partial<SettingsShape>) as SettingsShape;
          }

          merged.lastSavedAt = new Date().toISOString();

          // Persist admin-local final state
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          setSettings(merged);

          // Public cache: always store pruned object (only allowed keys)
          try {
            const prunedPublic = pruneSettingsForServer(merged);
            localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(prunedPublic));
          } catch {}

          setStatusMsg(`${sectionKey}: Saved locally and to server.`);
          showToast(`${sectionKey}: Saved locally and to server.`, 'success');
        } else {
          // server didn't return saved payload; still update public cache from local but pruned
          try {
            const prunedPublic = pruneSettingsForServer(adminLocal);
            localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(prunedPublic));
          } catch {}
          setStatusMsg(`${sectionKey}: Saved locally (server did not return saved payload).`);
          showToast(`${sectionKey}: Saved locally (server did not return saved payload).`, 'warning');
        }
      } catch (err: any) {
        console.error('Failed to POST /admin/settings', err);
        // server save failed - keep local, update public cache from local (pruned)
        try {
          const prunedPublic = pruneSettingsForServer(adminLocal);
          localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(prunedPublic));
        } catch {}
        setStatusMsg(`${sectionKey}: Saved locally. Server not available.`);
        showToast(`${sectionKey}: Saved locally (server not available).`, 'warning');
        if (options?.preferLocal) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(adminLocal));
          } catch {}
          setSettings(adminLocal);
        }
      }
    } catch (err) {
      setStatusMsg(`${sectionKey}: Save failed.`);
      showToast(`${sectionKey}: Save failed.`, 'error');
    } finally {
      setLoadingSection((s) => ({ ...s, [sectionKey]: false }));
    }
  }

  async function handleSaveAll() {
    await handleSaveSection('All', settings, { fullSave: true });
  }

  // reset flows (only keep admin-managed keys)
  function handleResetSection(sectionKey: string) {
    markPreferLocalGrace();
    const copy = JSON.parse(JSON.stringify(settings)) as SettingsShape;

    if (sectionKey === 'announcement') {
      copy.announcement = JSON.parse(JSON.stringify(DEFAULTS.announcement));
    } else if (sectionKey === 'support') {
      copy.support = JSON.parse(JSON.stringify(DEFAULTS.support));
    } else if (sectionKey === 'maintenance') {
      copy.maintenance = JSON.parse(JSON.stringify(DEFAULTS.maintenance));
    } else {
      return;
    }

    // sanitize/merge and persist admin-local
    const sanitized = sanitizeSettings(copy);
    const adminLocal = deepMerge(DEFAULTS, sanitized);
    setSettings(adminLocal);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminLocal));
      // ensure public cache gets pruned version (deleted keys removed)
      localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(pruneSettingsForServer(adminLocal)));
    } catch {}

    setStatusMsg(`${sectionKey}: Reset to defaults (local).`);
    showToast(`${sectionKey}: Reset to defaults (local).`, 'info');

    (async () => {
      try {
        // fullSave will prune before sending — so server will no longer retain deleted keys
        await handleSaveSection(sectionKey, adminLocal, { preferLocal: true, fullSave: true });
      } catch {
        try {
          setSettings(adminLocal);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(adminLocal));
        } catch {}
      }
    })();
  }

  async function handleResetAll() {
    markPreferLocalGrace();
    // Build an admin-local defaults object and persist — public will get pruned version
    const adminDefaults = deepMerge(DEFAULTS, {});
    setSettings(adminDefaults);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminDefaults));
      localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(pruneSettingsForServer(adminDefaults)));
    } catch {}
    setStatusMsg('All sections reset to defaults (local).');
    showToast('All sections reset to defaults (local).', 'info');
    try {
      await handleSaveAll();
    } catch {}
  }

  async function handleMaintenanceToggle(nextEnabled: boolean) {
    const next = { ...settings, maintenance: { ...settings.maintenance, enabled: nextEnabled } };
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // update public pruned
      localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(pruneSettingsForServer(next)));
    } catch {}
    setStatusMsg('Maintenance: Saved locally.');

    setLoadingSection((s) => ({ ...s, MaintenanceHealthCheck: true }));
    try {
      const health = await checkServerHealth();
      if (health.ok && health.db) {
        await handleSaveSection('Maintenance', next, { fullSave: true });
      } else if (health.ok && !health.db) {
        showToast('Server reachable but database unavailable — changes saved locally.', 'warning');
      } else {
        showToast('Server not reachable — changes saved locally.', 'warning');
      }
    } catch {
      showToast('Server check failed — changes saved locally.', 'warning');
    } finally {
      setLoadingSection((s) => ({ ...s, MaintenanceHealthCheck: false }));
    }
  }

  function handleExportAiLogsCsv() {
    // intentionally left no-op
  }

  return (
    <AdminLayout title="Settings">
      <Paper sx={{ p: 3 }}>
        <Box mb={2}>
          <Typography variant="h5">Settings</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Configure quick admin tools.
          </Typography>
        </Box>

        {/* Announcement banner */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Announcement banner</Typography>
            <Box>
              <Button size="small" startIcon={<SaveIcon />} onClick={() => handleSaveSection('Announcement')} disabled={!!loadingSection['Announcement']}>
                Save
              </Button>
              <Button size="small" startIcon={<RestoreIcon />} onClick={() => handleResetSection('announcement')} sx={{ ml: 1 }}>
                Reset
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={<Switch checked={settings.announcement.enabled} onChange={(e) => updateNested(['announcement', 'enabled'], e.target.checked)} />}
                label="Enabled (shows on public site)"
              />
            </Grid>
            <Grid item xs={12} md={9}>
              <TextField
                label="Announcement content (HTML allowed)"
                fullWidth
                multiline
                minRows={2}
                value={settings.announcement.html}
                onChange={(e) => updateNested(['announcement', 'html'], e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Preview:</Typography>
              <Box sx={{ border: '1px solid rgba(0,0,0,0.08)', p: 1, mt: 1, borderRadius: 1, backgroundColor: '#fff' }}>
                <div dangerouslySetInnerHTML={{ __html: settings.announcement.html || '<em>No announcement</em>' }} />
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Support / Contact */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Support / Contact</Typography>
            <Box>
              <Button size="small" startIcon={<SaveIcon />} onClick={() => handleSaveSection('Support')} disabled={!!loadingSection['Support']}>
                Save
              </Button>
              <Button size="small" startIcon={<RestoreIcon />} onClick={() => handleResetSection('support')} sx={{ ml: 1 }}>
                Reset
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <TextField label="Support email" fullWidth value={settings.support.email} onChange={(e) => updateNested(['support', 'email'], e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Support phone" fullWidth value={settings.support.phone} onChange={(e) => updateNested(['support', 'phone'], e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Help URL" fullWidth value={settings.support.url} onChange={(e) => updateNested(['support', 'url'], e.target.value)} size="small" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">These values will be shown in the site header/footer once saved to server settings.</Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Maintenance */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Maintenance</Typography>
            <Box>
              <Button size="small" startIcon={<SaveIcon />} onClick={() => handleSaveSection('Maintenance')} disabled={!!loadingSection['Maintenance']}>
                Save
              </Button>
              <Button size="small" startIcon={<RestoreIcon />} onClick={() => handleResetSection('maintenance')} sx={{ ml: 1 }}>
                Reset
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Switch checked={settings.maintenance.enabled} onChange={(e) => handleMaintenanceToggle(e.target.checked)} />} label="Maintenance mode (on/off)" />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField label="Maintenance message" fullWidth multiline minRows={2} value={settings.maintenance.message} onChange={(e) => updateNested(['maintenance', 'message'], e.target.value)} />
            </Grid>
          </Grid>
        </Paper>

        {/* Global save/reset */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
          <Button startIcon={<SaveIcon />} variant="contained" onClick={() => handleSaveAll()}>
            Save all
          </Button>
          <Button startIcon={<RestoreIcon />} variant="outlined" onClick={() => handleResetAll()}>
            Reset all to defaults
          </Button>

          <Box sx={{ ml: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {mounted ? (statusMsg || (settings.lastSavedAt ? `Last saved: ${new Date(settings.lastSavedAt).toLocaleString()}` : '')) : ''}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Snackbar open={toastOpen} autoHideDuration={3000} onClose={handleCloseToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseToast} severity={toastSeverity} sx={{ width: '100%' }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
}
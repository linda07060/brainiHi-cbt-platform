import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Divider,
  Grid,
  Chip,
  CircularProgress,
  Stack,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import Header from "../components/Header";
import PaymentMethodDisplay from "../components/PaymentMethodDisplay";
import BillingHistory from "../components/BillingHistory";
import UpgradePlanModal from "../components/UpgradePlanModal";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";

/**
 * Derive plan limits for display on the subscription page.
 * Mirrors the product limits you provided.
 */
function getPlanLimits(plan: string) {
  const p = String(plan || "").toLowerCase();
  if (p === "pro") {
    return [
      "Unlimited tests",
      "15–20 questions per test",
      "2 attempts for each test",
      "50 AI explanations per month",
      "No time limits",
    ];
  }
  if (p === "tutor") {
    return [
      "Unlimited tests",
      "20–30 questions per test",
      "Unlimited attempts",
      "1000+ AI explanations per month (soft limit)",
      "Personal AI tutor in chat",
      "Full analytics of weak areas",
    ];
  }
  // Free
  return [
    "1 test per day",
    "10 questions per test",
    "1 attempt only",
    "Up to 3 AI explanations per day",
  ];
}

/**
 * Helper: safe JWT payload parser (client-only usage)
 */
function parseJwtPayload(token?: string | null): any | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Minor helper to normalize plan string
 */
function normalizePlanString(candidate?: any): string | null {
  if (!candidate && candidate !== 0) return null;
  const s = String(candidate).trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low.includes("pro")) return "Pro";
  if (low.includes("tutor")) return "Tutor";
  if (low.includes("free")) return "Free";
  // Return capitalized fallback
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SubscriptionPage(): JSX.Element {
  const { token, user: ctxUser } = useAuth() as any;
  const router = useRouter();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [sub, setSub] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // profile fetched from /auth/me (canonical)
  const [profile, setProfile] = useState<any | null>(null);
  // localStorage fallback
  const [storedUser, setStoredUser] = useState<any | null>(null);
  // parsed token claims (client-only)
  const [tokenClaims, setTokenClaims] = useState<any | null>(null);
  // indicate client ready to avoid SSR/CSR mismatch
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSubscription() {
      setLoading(true);
      try {
        const res = await axios.get("/api/paddle/subscription", { headers });
        if (!mounted) return;
        setSub(res.data ?? null);
      } catch {
        if (!mounted) return;
        setSub(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function loadProfile() {
      try {
        if (!token) {
          if (mounted) setProfile(ctxUser ?? null);
        } else {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ""}/auth/me`, { headers });
          if (!mounted) return;
          setProfile(res.data ?? null);
        }
      } catch {
        if (!mounted) return;
        setProfile(ctxUser ?? null);
      } finally {
        if (mounted) setClientReady(true);
      }
    }

    // read localStorage fallback on client
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("auth");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setStoredUser(parsed?.user ?? null);
          } catch {}
        }
        const claims = parseJwtPayload(token ?? null);
        setTokenClaims(claims);
      }
    } catch {}

    loadSubscription();
    loadProfile();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Hide global footer while on this page, then restore on unmount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const footer = document.querySelector("footer");
    if (!footer) return;
    const prevDisplay = (footer as HTMLElement).style.display;
    (footer as HTMLElement).style.display = "none";
    return () => {
      try {
        (footer as HTMLElement).style.display = prevDisplay || "";
      } catch {}
    };
  }, []);

  async function doCancel() {
    if (!confirm("Cancel subscription? This will stop future renewals.")) return;
    setBusy(true);
    try {
      const res = await axios.post("/api/paddle/cancel", {}, { headers });
      setSub(res.data ?? null);
      alert("Cancellation requested. Check your email for confirmation.");
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Unable to cancel subscription.");
    } finally {
      setBusy(false);
    }
  }

  async function doReactivate() {
    setBusy(true);
    try {
      const res = await axios.post("/api/paddle/reactivate", {}, { headers });
      setSub(res.data ?? null);
      alert("Subscription reactivated.");
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Unable to reactivate subscription.");
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    try {
      const res = await axios.post<{ url?: string }>("/api/paddle/portal", {}, { headers });
      const url = res?.data?.url;
      if (url) window.open(url, "_blank");
      else alert("Billing portal unavailable.");
    } catch {
      alert("Unable to open billing portal.");
    } finally {
      setBusy(false);
    }
  }

  // Resolve displayName and displayPlan with robust fallbacks:
  const displayName = (profile?.name ?? tokenClaims?.name ?? ctxUser?.name ?? storedUser?.name) || "User";

  // Only show plan after clientReady show a neutral loading text
  const rawPlanCandidate = clientReady && (sub?.plan ?? profile?.plan ?? tokenClaims?.plan ?? ctxUser?.plan ?? storedUser?.plan);
  const displayPlan = normalizePlanString(rawPlanCandidate) ?? "Free";

  const billingStatus = (sub?.billing_status ?? profile?.billing_status) || "unknown";
  const nextPayment = sub?.next_billing_date ? new Date(sub.next_billing_date).toLocaleString() : null;
  const lastPayment = sub?.last_payment_date ? new Date(sub.last_payment_date).toLocaleString() : null;

  const planLimits = getPlanLimits(displayPlan);

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Subscription
            </Typography>
            {/* Show user's full name if available. Until clientReady show a neutral loading text */}
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
              {!clientReady ? "Loading profile…" : `Account: ${displayName}`}
            </Typography>
          </Box>

          {/* NEW: button to route back to dashboard */}
          <Box>
            <Button variant="outlined" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6">Plan</Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {displayPlan}
                  </Typography>
                  <Chip
                    label={billingStatus}
                    color={billingStatus === "active" ? "success" : billingStatus === "past_due" ? "warning" : "default"}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {sub?.billing_frequency ? `${sub.billing_frequency} billing` : "No billing frequency available"}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2">Next payment</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {nextPayment ?? "None scheduled"}
                </Typography>

                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Last payment
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {lastPayment ?? "No payments recorded"}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={openPortal} disabled={busy}>
                    Manage billing
                  </Button>

                  {billingStatus !== "active" && (
                    <Button variant="contained" onClick={doReactivate} disabled={busy}>
                      Reactivate
                    </Button>
                  )}

                  {displayPlan && String(displayPlan).toLowerCase() !== "free" && (
                    <Button variant="contained" color="error" onClick={doCancel} disabled={busy}>
                      Cancel
                    </Button>
                  )}

                  <Button variant="text" onClick={() => setUpgradeOpen(true)}>
                    Change plan
                  </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <PaymentMethodDisplay token={token} />

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Plan limits
                  </Typography>
                  <List dense>
                    {planLimits.map((line) => (
                      <ListItem key={line} sx={{ py: 0.25 }}>
                        <ListItemText primary={line} />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                <Box sx={{ mt: 2, fontSize: 13, color: "text.secondary" }}>
                  Need help? <MuiLink href="mailto:support@brainihi.com">support@brainihi.com</MuiLink>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Payments are securely processed by Paddle. VAT/GST may apply based on your location. For refunds, see our{" "}
                    <MuiLink href="/refund-policy">Refund &amp; Cancellation Policy</MuiLink>.
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6">Transaction history</Typography>
                <Box sx={{ mt: 1 }}>
                  <BillingHistory token={token} />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="caption" color="text.secondary">
                  Receipts and invoices are managed by Paddle. For refunds, see our{" "}
                  <MuiLink href="/refund-policy">Refund &amp; Cancellation Policy</MuiLink>.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        <UpgradePlanModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} token={token} />
      </Container>
    </>
  );
}
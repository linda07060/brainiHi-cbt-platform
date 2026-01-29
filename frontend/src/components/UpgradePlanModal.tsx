import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import axios from "axios";

type BillingPeriod = "monthly" | "yearly";

function getPlanLimits(plan: string, period: BillingPeriod) {
  const p = String(plan || "").toLowerCase();
  if (p === "pro") {
    return [
      "Unlimited tests",
      "15–20 questions per test",
      "2 attempts per test",
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

export default function UpgradePlanModal({
  open,
  onClose,
  token,
  allowedPlans,
  defaultPlan,
  defaultPeriod,
}: {
  open: boolean;
  onClose: () => void;
  token?: string | null;
  // optional whitelist of allowed plans to present (e.g. ["Pro","Tutor"])
  allowedPlans?: string[] | undefined;
  // optional defaults (helps parent control initial selection)
  defaultPlan?: string | null;
  defaultPeriod?: BillingPeriod | null;
}) {
  // Initialize plan from:  defaultPlan -> allowedPlans[0] -> "Pro"
  const initialPlan = defaultPlan
    ? normalizePlan(defaultPlan)
    : allowedPlans && allowedPlans.length > 0
    ? normalizePlan(allowedPlans[0])
    : "Pro";

  const [plan, setPlan] = useState<string>(initialPlan);
  const [period, setPeriod] = useState<BillingPeriod>(defaultPeriod ?? "monthly");
  const [busy, setBusy] = useState(false);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // If allowedPlans or defaultPlan changes while modal is open, update selection
  useEffect(() => {
    const sel = defaultPlan ? normalizePlan(defaultPlan) : allowedPlans && allowedPlans.length > 0 ? normalizePlan(allowedPlans[0]) : "Pro";
    setPlan(sel);
  }, [allowedPlans, defaultPlan]);

  useEffect(() => {
    if (defaultPeriod) setPeriod(defaultPeriod);
  }, [defaultPeriod]);

  const limits = useMemo(() => getPlanLimits(plan, period), [plan, period]);

  async function startCheckout() {
    setBusy(true);
    try {
      // Open checkout page in a new tab — checkout page will create the PayPal order and render buttons.
      const qs = new URLSearchParams({ plan, billingPeriod: period }).toString();
      window.open(`/checkout?${qs}`, "_blank");
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Unable to start checkout.");
    } finally {
      setBusy(false);
    }
  }

  // produce options to render: if allowedPlans provided, use that (normalized),
  // otherwise fall back to default two paid plans.
  const planOptions = useMemo(() => {
    const opts = (allowedPlans && allowedPlans.length > 0 ? allowedPlans : ["Pro", "Tutor"]).map((p) => normalizePlan(p));
    // ensure unique and stable ordering
    return Array.from(new Set(opts));
  }, [allowedPlans]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Upgrade plan</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel id="upgrade-plan">Plan</InputLabel>
          <Select
            labelId="upgrade-plan"
            value={plan}
            label="Plan"
            onChange={(e) => setPlan(String((e.target as HTMLInputElement).value))}
          >
            {planOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="upgrade-period">Billing period</InputLabel>
          <Select
            labelId="upgrade-period"
            value={period}
            label="Billing period"
            onChange={(e) => setPeriod((e.target as HTMLInputElement).value as BillingPeriod)}
          >
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Plan limits ({plan})
          </Typography>
          {limits.map((line) => (
            <Box key={line} sx={{ py: 0.25 }}>
              <Typography variant="body2">• {line}</Typography>
            </Box>
          ))}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          By continuing you will be redirected to PayPal for payment. Terms and refunds are handled via PayPal.
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={startCheckout} variant="contained" disabled={busy}>
          {busy ? "Opening…" : "Proceed to checkout"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------- local helpers ---------- */
function normalizePlan(input?: any): string {
  if (!input) return "Pro";
  const s = String(input).trim();
  if (!s) return "Pro";
  const low = s.toLowerCase();
  if (low.includes("pro")) return "Pro";
  if (low.includes("tutor")) return "Tutor";
  if (low.includes("free")) return "Free";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
import React, { useState, useMemo } from "react";
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
}: {
  open: boolean;
  onClose: () => void;
  token?: string | null;
}) {
  const [plan, setPlan] = useState("Pro");
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [busy, setBusy] = useState(false);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const limits = useMemo(() => getPlanLimits(plan, period), [plan, period]);

  async function startCheckout() {
    setBusy(true);
    try {
      // typed response so TypeScript knows .data.url exists
      const res = await axios.post<{ url?: string }>(
        "/api/paddle/checkout-link",
        { plan, billingPeriod: period },
        { headers },
      );
      const url = res?.data?.url;
      if (url) {
        window.open(url, "_blank");
        onClose();
      } else {
        alert("Unable to start checkout.");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Unable to start checkout.");
    } finally {
      setBusy(false);
    }
  }

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
            <MenuItem value="Pro">Pro</MenuItem>
            <MenuItem value="Tutor">Tutor</MenuItem>
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
          <List dense>
            {limits.map((line) => (
              <ListItem key={line} sx={{ py: 0.25 }}>
                <ListItemText primary={line} />
              </ListItem>
            ))}
          </List>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          By continuing you will be redirected to Paddle for payment. Terms and refunds are handled via Paddle.
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
import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import axios from "axios";

export default function PaymentMethodDisplay({ token }: { token?: string | null }) {
  const [pm, setPm] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await axios.get("/api/paddle/payment-method", { headers });
        if (!mounted) return;
        setPm(res.data ?? null);
      } catch {
        setPm(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [token]);

  if (!pm) {
    return null;
  }

  const brand = pm.brand ?? pm.type ?? "Card";
  const last4 = pm.last4 ?? pm.last4 ?? pm.masked?.slice(-4) ?? "****";

  const exp = pm.exp_month && pm.exp_year ? `${String(pm.exp_month).padStart(2, "0")}/${String(pm.exp_year).slice(-2)}` : null;

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary">Payment method</Typography>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{brand}</Typography>
        <Typography variant="body2">•••• {last4}</Typography>
        {exp && <Typography variant="caption" color="text.secondary">Expires {exp}</Typography>}
      </Box>
    </Box>
  );
}
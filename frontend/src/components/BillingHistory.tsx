import React, { useEffect, useState } from "react";
import { Box, Typography, List, ListItem, ListItemText, Link as MuiLink, Button } from "@mui/material";
import axios from "axios";

export default function BillingHistory({ token, compact }: { token?: string | null; compact?: boolean }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await axios.get<any>("/api/payments/invoices", { headers });

        if (!mounted) return;

        const payload = res?.data;

        if (Array.isArray(payload)) {
          setInvoices(payload);
        } else if (payload && Array.isArray(payload.invoices)) {
          setInvoices(payload.invoices);
        } else {
          setInvoices([]);
        }
      } catch {
        if (mounted) setInvoices([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [token]);

  if (loading) {
    if (compact) return null;
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Billing history</Typography>
        <Typography variant="caption" color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  if (invoices.length === 0) {
    if (compact) return null;
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Billing history</Typography>
        <Typography variant="caption" color="text.secondary">No invoices found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: compact ? 1 : 2 }}>
      <Typography variant={compact ? "caption" : "subtitle2"}>Billing history</Typography>
      <List dense sx={{ p: 0 }}>
        {invoices.slice(0, compact ? 3 : 10).map((inv: any) => (
          <ListItem key={inv.id} sx={{ py: 0.5 }}>
            <ListItemText
              primary={`${inv?.date ? new Date(inv.date).toLocaleDateString() : ''}${inv?.amount ? ` — ${inv.amount} ${inv.currency || ''}` : ''}`}
              secondary={inv?.status ? String(inv.status) : undefined}
            />
            {inv?.receipt_url ? (
              <MuiLink href={inv.receipt_url} target="_blank" rel="noopener noreferrer">
                <Button size="small">Receipt</Button>
              </MuiLink>
            ) : null}
          </ListItem>
        ))}
      </List>

      {!compact && invoices.length > 3 && (
        <Box sx={{ textAlign: "right" }}>
          <Button size="small" href="/subscription?tab=invoices">View all</Button>
        </Box>
      )}
    </Box>
  );
}
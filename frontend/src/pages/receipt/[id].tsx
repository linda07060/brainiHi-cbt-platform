import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Box, Container, Typography, Button, CircularProgress } from "@mui/material";
import Header from "../../components/Header";
import axios from "axios";

/**
 * Receipt page: /receipt/[id]
 * Fetches payment by id from /api/payments/:id (authenticated)
 */

export default function ReceiptPage(): JSX.Element {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [loading, setLoading] = useState<boolean>(true);
  const [payment, setPayment] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    axios
      .get(`/api/payments/${encodeURIComponent(String(id))}`)
      .then((res) => {
        if (!mounted) return;
        setPayment(res.data);
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? "Unable to fetch receipt.");
      })
      .then(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  function handleGoDashboard() {
    // Navigate to dashboard and include receipt id in query so dashboard can surface it
    if (id) router.push(`/dashboard?receipt=${id}`);
    else router.push("/dashboard");
  }

  if (loading) {
    return (
      <>
        <Header />
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  if (error || !payment) {
    return (
      <>
        <Header />
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Typography variant="h6">Receipt</Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {error ?? "Receipt not found."}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Button onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Receipt — BrainiHi</title>
      </Head>

      <Header />

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ p: 3, borderRadius: 2, boxShadow: 1 }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Payment receipt
          </Typography>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Receipt ID: {payment.id}
          </Typography>

          <Box sx={{ mb: 1 }}>
            <Typography variant="body2">Plan: <strong>{payment.plan}</strong></Typography>
            <Typography variant="body2">Billing period: <strong>{payment.billingPeriod ?? 'one-off'}</strong></Typography>
            <Typography variant="body2">Amount: <strong>{payment.amount} {payment.currency}</strong></Typography>
            <Typography variant="body2">Status: <strong>{payment.status}</strong></Typography>
            <Typography variant="body2">PayPal Order ID: <strong>{payment.paypalOrderId}</strong></Typography>
            <Typography variant="body2">PayPal Capture ID: <strong>{payment.paypalCaptureId ?? '—'}</strong></Typography>
            <Typography variant="body2">Date: <strong>{new Date(payment.createdAt).toLocaleString()}</strong></Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Payer details</Typography>
            <Typography variant="body2">{payment.payerName ?? payment.payerEmail ?? '—'}</Typography>
          </Box>

          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={() => window.print()}>Print</Button>
            <Button variant="outlined" onClick={handleGoDashboard}>Go to dashboard</Button>
          </Box>
        </Box>
      </Container>
    </>
  );
}
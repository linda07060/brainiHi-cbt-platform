import Head from "next/head";
import Header from "../components/Header";
import LegalDisclaimer from "../components/LegalDisclaimer";
import AITransparency from "../components/AITransparency";
import layout from "../styles/Layout.module.css";
import { Container, Box, Typography, Link } from "@mui/material";

/**
 * /policies — persistent page exposing full legal content for SEO and teams.
 * Added mandatory disclaimer about results under the main hero/intro and
 * included the PayPal onboarding business description verbatim for easy reference.
 */

export default function PoliciesPage(): JSX.Element {
  return (
    <>
      <Head>
        <title>Policies — BrainiHi</title>
        <meta
          name="description"
          content="Policies, content generation policy, AI transparency information, and other legal notices for BrainiHi."
        />
      </Head>

      <Header />

      <main style={{ padding: "40px 0" }} aria-labelledby="policies-heading">
        <Container maxWidth="md" className={layout.container}>
          <Box sx={{ maxWidth: 880, margin: "0 auto" }}>
            <Typography id="policies-heading" component="h1" variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
              Policies
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Below you will find our content generation policy, AI transparency information, and other legal notices. This page is intentionally focused and suitable for sharing with legal teams.
            </Typography>

            {/* Mandatory disclaimer about results */}
            <Box sx={{ mb: 3, p: 2, borderRadius: 1, backgroundColor: "#fbfbfb", border: "1px solid #eee" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Disclaimer:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                BrainiHi provides AI-generated educational practice tools.
                We do not guarantee specific exam results or score improvements.
              </Typography>
            </Box>

            {/* PAYPAL ONBOARDING: exact text (verbatim) - included for onboarding reference */}
            <Box sx={{ mb: 3, p: 2, borderRadius: 1, backgroundColor: "#ffffff", border: "1px solid #eee" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Business description (for PayPal onboarding)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
BrainiHi is an online educational platform that provides AI-powered practice tests,
step-by-step explanations, and personalized learning tools.

Users purchase subscription-based access to digital features delivered electronically.
No physical goods are shipped. The service is intended for educational purposes only.
              </Typography>
            </Box>

            <section aria-labelledby="content-policy-heading" id="policies-content">
              <LegalDisclaimer />
            </section>

            <section aria-labelledby="ai-transparency-heading" style={{ marginTop: 24 }}>
              <AITransparency />
            </section>

            {/* Contact for legal questions — ensure email is a clickable mailto link */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Contact
              </Typography>
              <Typography variant="body2" color="text.secondary">
                For questions about these policies or other legal matters, contact us at{" "}
                <Link href="mailto:support@brainihi.com" underline="always">support@brainihi.com</Link>.
              </Typography>
            </Box>
          </Box>
        </Container>
      </main>
    </>
  );
}
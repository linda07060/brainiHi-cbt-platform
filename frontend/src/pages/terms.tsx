import Head from "next/head";
import Header from "../components/Header";
import layout from "../styles/Layout.module.css";

/**
 * Full Terms of Service page — SaaS-compatible version required for Paddle.
 * Replaces the earlier minimal terms page.
 */
export default function TermsPage(): JSX.Element {
  return (
    <>
      <Head>
        <title>Terms of Service — BrainiHi</title>
        <meta name="description" content="BrainiHi Terms of Service — subscription terms, billing and usage." />
      </Head>

      <Header />

      <main className={layout.container} style={{ padding: "40px 0" }} aria-labelledby="tos-heading">
        <article style={{ maxWidth: 880, margin: "0 auto" }}>
          <h1 id="tos-heading">BrainiHi — Terms of Service</h1>

          {/* Company information required by Paddle */}
          <section aria-labelledby="company-info-heading" style={{ marginBottom: 12 }}>
            <h2 id="company-info-heading" style={{ fontSize: "1rem", margin: "8px 0" }}>Company Information</h2>
            {/* <p style={{ margin: 0 }}>
              Legal business name: <strong>IP Ovcharenko A</strong>
            </p> */}

            {/* Required Paddle wording */}
            <p style={{ margin: "8px 0 0 0" }}>
              The service is provided by IP Ovcharenko A, registered in Kazakhstan.
            </p>
          </section>

          <p><strong>Effective Date:</strong> October 2025</p>

          <p>Welcome to BrainiHi.com (“BrainiHi”, “we”, “our”, “us”). These Terms govern your use of our website and services (“Service”). By using the Service, you agree to these Terms.</p>

          <h2>1. Eligibility</h2>
          <p>You must be at least 13 years old to use the Service.</p>

          <h2>2. Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your login and for all actions that occur under your account.</p>

          <h2>3. Subscriptions and Payments</h2>
          <p>Some features require a paid subscription. Payments are securely processed by our payment provider Paddle, which acts as Merchant of Record for all transactions. By subscribing, you authorize Paddle to charge your payment method on a recurring basis.</p>

          <h2>4. Cancellation</h2>
          <p>Subscriptions can be canceled at any time via your account or the link included in your Paddle receipt email. Cancellation prevents future charges but does not provide refunds for previous periods.</p>

          <h2>5. Intellectual Property</h2>
          <p>All materials provided by the Service are owned by BrainiHi. You may not copy, distribute, or resell any content without our written permission.</p>

          <h2>6. Acceptable Use</h2>
          <p>You agree not to misuse the Service, including attempts to interfere with normal functionality or unauthorized access to other users’ accounts.</p>

          <h2>7. No Official Examination Affiliation</h2>
          <p>BrainiHi is not affiliated with any official exam boards. All practice content is generated for educational purposes only.</p>

          <h2>8. Disclaimer of Warranties</h2>
          <p>The Service is provided “as is” without warranty of any kind.</p>

          <h2>9. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, BrainiHi is not liable for indirect or consequential damages arising from the use of the Service.</p>

          <h2>10. Updates to Terms</h2>
          <p>We may update these Terms at any time by posting a new version on this page.</p>

          <h2>11. Governing Law</h2>
          <p>These Terms are governed by the laws of the Republic of Kazakhstan.</p>

          <h2>12. Contact</h2>
          <p>For support: <a href="mailto:support@brainihi.com">support@brainihi.com</a></p>
        </article>
      </main>
    </>
  );
}
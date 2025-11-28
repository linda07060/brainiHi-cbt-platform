import Head from "next/head";
import Header from "../components/Header";
import layout from "../styles/Layout.module.css";

/**
 * Refund & Cancellation Policy page
 */
export default function RefundPolicy(): JSX.Element {
  return (
    <>
      <Head>
        <title>Refund &amp; Cancellation Policy — BrainiHi</title>
        <meta name="description" content="Refund and cancellation policy for BrainiHi subscriptions." />
      </Head>

      <Header />

      <main className={layout.container} style={{ padding: "40px 0" }} aria-labelledby="refund-heading">
        <article style={{ maxWidth: 880, margin: "0 auto" }}>
          <h1 id="refund-heading">BrainiHi — Refund &amp; Cancellation Policy</h1>
          <p><strong>Effective Date:</strong> October 2025</p>

          <p>We strive to provide a high-quality learning experience. This policy explains when refunds may be issued.</p>

          <h2>Cancellations</h2>
          <p>You may cancel your subscription at any time. Cancellations stop future billing but do not automatically qualify for a refund.</p>

          <h2>Refunds</h2>
          <p>Refunds may be granted if any of the following applies:</p>
          <ul>
            <li>Duplicate or accidental payment</li>
            <li>Technical issues preventing access to the Service after support attempts</li>
            <li>No usage of the Service and the request is made within 7 days of purchase</li>
          </ul>

          <p>Refunds are processed by Paddle. Requests must be submitted either through the Paddle receipt email or by contacting <a href="mailto:support@brainihi.com">support@brainihi.com</a>.</p>

          <p>We reserve the right to deny refund requests if the Service has been used extensively.</p>
        </article>
      </main>
    </>
  );
}
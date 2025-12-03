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
        <meta
          name="description"
          content="BrainiHi refund and cancellation policy: subscription cancellation, refund eligibility, how to request a refund, limitations, and policy changes."
        />
      </Head>

      <Header />

      <main className={layout.container} style={{ padding: "40px 0" }} aria-labelledby="refund-heading">
        <article style={{ maxWidth: 880, margin: "0 auto" }}>
          <h1 id="refund-heading">BrainiHi — Refund &amp; Cancellation Policy</h1>

          <p>
            This document replaces and updates any previous versions of the refund and cancellation policy.
            This policy will take effect once paid services are launched on the BrainiHi platform.
          </p>

          <h2>1. General Information</h2>
          <p>
            BrainiHi aims to provide high-quality learning experiences. This policy explains the conditions
            under which refunds or subscription cancellations may be provided.
          </p>

          <h2>2. Subscription Cancellation</h2>
          <p>
            You can cancel your subscription at any time. Cancellation will stop future payments, but it does
            not automatically grant a refund for the current or previously billed period.
          </p>

          <h2>3. Refund Eligibility</h2>
          <p>Refunds for digital services may be granted under the following circumstances:</p>
          <ul>
            <li>Accidental or duplicate payment</li>
            <li>
              Technical issues that prevent access to purchased content after contacting support
            </li>
            <li>
              The service has not been used, and a refund request is made within 14 days of purchase
            </li>
          </ul>
          <p>Refunds are processed through our payment partner, Paddle.</p>

          <h2>4. How to Request a Refund</h2>
          <p>To request a refund, please either:</p>
          <ul>
            <li>reply to the Paddle receipt email, or</li>
            <li>contact our support at: <a href="mailto:support@brainihi.com">support@brainihi.com</a></li>
          </ul>
          <p>Please include your order number and the email used during purchase.</p>

          <h2>5. Limitations</h2>
          <p>
            A refund may be declined if a significant portion of the digital content has already been
            accessed or used.
          </p>

          <h2>6. Changes to This Policy</h2>
          <p>
            BrainiHi reserves the right to update this policy. The most recent version will always be
            available on our website.
          </p>
        </article>
      </main>
    </>
  );
}
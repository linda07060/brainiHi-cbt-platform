import Head from "next/head";
import Header from "../components/Header";
import layout from "../styles/Layout.module.css";
import styles from "../styles/RefundPolicy.module.css";

/**
 * Refund & Cancellation Policy page — now uses a dedicated CSS module
 * to ensure narrow, centered layout with comfortable mobile/tablet margins.
 */
export default function RefundPolicy(): JSX.Element {
  return (
    <>
      <Head>
        <title>Refund &amp; Cancellation Policy — BrainiHi</title>
        <meta
          name="description"
          content="BrainiHi refund and cancellation information. Payments are processed by Paddle; refunds and cancellations are handled via Paddle's policies."
        />
      </Head>

      <Header />

      <main className={`${layout.container} ${styles.policyMain}`} aria-labelledby="refund-heading">
        <article className={styles.articleWrapper}>
          <h1 id="refund-heading">Refund &amp; Cancellation Policy</h1>

          <p>We follow Paddle’s refund policy. All payments for BrainiHi are processed by Paddle, our merchant of record.</p>

          <h2>Refunds</h2>
          <p>
            Customers may request a refund for any purchase made through Paddle.
            All refund requests are handled directly by Paddle according to their Refund Policy.
          </p>

          <h2>Cancellations</h2>
          <p>
            Users can cancel their subscription at any time. Cancellation stops future recurring payments
            but does not automatically issue a refund for past payments. Any refund request after cancellation
            is handled by Paddle.
          </p>
        </article>
      </main>
    </>
  );
}
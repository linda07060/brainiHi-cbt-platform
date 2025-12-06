import Head from "next/head";
import Header from "../components/Header";
import layout from "../styles/Layout.module.css";

/**
 * Refund & Cancellation Policy page (updated per request)
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

      <main className={layout.container} style={{ padding: "40px 0" }} aria-labelledby="refund-heading">
        <article style={{ maxWidth: 880, margin: "0 auto" }}>
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
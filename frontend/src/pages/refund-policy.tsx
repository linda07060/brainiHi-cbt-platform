import Head from "next/head";
import Header from "../components/Header";
import layout from "../styles/Layout.module.css";
import styles from "../styles/RefundPolicy.module.css";

/**
 * Refund & Cancellation Policy — updated with the customer's concise rules
 * about 7-day refunds for lightly used digital services, cancellation instructions,
 * and support contact. Maintains standardized payment wording elsewhere on the site.
 */
export default function RefundPolicy(): JSX.Element {
  return (
    <>
      <Head>
        <title>Refund &amp; Cancellation Policy — BrainiHi</title>
        <meta
          name="description"
          content="BrainiHi refund and cancellation policy: 7-day refund window for digital services, cancellations, and how to request a refund."
        />
      </Head>

      <Header />

      <main className={`${layout.container} ${styles.policyMain}`} aria-labelledby="refund-heading">
        <article className={styles.articleWrapper}>
          <h1 id="refund-heading">Refund &amp; Cancellation Policy</h1>

          <p><strong>Effective Date:</strong> December 19, 2025</p>

          <section aria-labelledby="refund-summary-heading">
            <h2 id="refund-summary-heading">Refunds &amp; Cancellations — Summary</h2>

            <p>
              Due to the digital nature of the BrainiHi service, refunds are available within 7 days of purchase
              if the service has not been substantially used.
            </p>

            <p>
              If you experience technical issues or are unable to access the service,
              please contact <a href="mailto:support@brainihi.com">support@brainihi.com</a> within 7 days of payment.
            </p>

            <p>
              Subscriptions can be canceled at any time through the user account settings.
              All refund requests are reviewed individually.
            </p>
          </section>

          <section aria-labelledby="how-to-request-heading" style={{ marginTop: 18 }}>
            <h2 id="how-to-request-heading">How to Request a Refund</h2>

            <p>To request a refund please contact our support team as soon as possible and include the following information to help us process your request:</p>
            <ul>
              <li>Your full name</li>
              <li>Email address used for the purchase</li>
              <li>Order number or transaction reference (if available)</li>
              <li>Date of purchase and the amount charged</li>
              <li>Brief explanation of the reason for the refund request</li>
            </ul>

            <p>Send requests to: <a href="mailto:support@brainihi.com">support@brainihi.com</a>. We will acknowledge receipt and respond with next steps or any additional information required.</p>
          </section>

          <section aria-labelledby="limitations-heading" style={{ marginTop: 18 }}>
            <h2 id="limitations-heading">Limitations and Exceptions</h2>

            <p>
              Refunds may be declined in whole or in part where a significant portion of digital content or services has already been accessed or used.
              Each refund request is evaluated on a case-by-case basis.
            </p>

            <p>
              If the purchase included non-refundable items or bespoke services already delivered, we will notify the User if a refund is not available.
            </p>
          </section>

          <section aria-labelledby="processing-heading" style={{ marginTop: 18 }}>
            <h2 id="processing-heading">Processing and Timing</h2>

            <p>
              We aim to process valid refund requests promptly. After approving a refund we will initiate reimbursement as soon as reasonably possible and provide confirmation to the User.
              The time required for funds to appear in the User’s account depends on the User’s bank or card issuer.
            </p>

            <p style={{ marginTop: 12, fontSize: 13, color: "#555" }}>
              Payments are processed securely via PayPal.
            </p>
          </section>

          <section aria-labelledby="chargebacks-heading" style={{ marginTop: 18 }}>
            <h2 id="chargebacks-heading">Chargebacks and Disputes</h2>

            <p>
              If a User files a chargeback or dispute with their bank or card issuer, BrainiHi reserves the right to provide transaction evidence to the issuing bank.
              If a chargeback is reversed in our favor, we may re-enable access or otherwise correct the User's account status as appropriate.
            </p>
          </section>

          <section aria-labelledby="changes-heading" style={{ marginTop: 18 }}>
            <h2 id="changes-heading">Changes to This Policy</h2>

            <p>
              BrainiHi reserves the right to update this policy. The most recent version will always be available on our website.
              When we make material changes to this policy we will provide notice on the Website or by other means as appropriate.
            </p>
          </section>

          <section aria-labelledby="contact-heading" style={{ marginTop: 18 }}>
            <h2 id="contact-heading">Contact</h2>

            <p>
              For questions about refunds, cancellations, or this policy, contact us at: <a href="mailto:support@brainihi.com">support@brainihi.com</a>
            </p>
          </section>
        </article>
      </main>
    </>
  );
}
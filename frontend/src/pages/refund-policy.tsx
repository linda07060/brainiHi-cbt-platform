import Head from "next/head";
import Header from "../components/Header";
import layout from "../styles/Layout.module.css";
import styles from "../styles/RefundPolicy.module.css";

/**
 * Refund & Cancellation Policy — updated, renumbered, and completed.
 * All references to specific payment providers have been removed.
 */
export default function RefundPolicy(): JSX.Element {
  return (
    <>
      <Head>
        <title>Refund &amp; Cancellation Policy — BrainiHi</title>
        <meta
          name="description"
          content="BrainiHi refund and cancellation policy: how refunds are processed, how to request a refund, limitations, chargebacks, and policy updates."
        />
      </Head>

      <Header />

      <main className={`${layout.container} ${styles.policyMain}`} aria-labelledby="refund-heading">
        <article className={styles.articleWrapper}>
          <h1 id="refund-heading">Refund &amp; Cancellation Policy</h1>

          <p><strong>Effective Date:</strong> December 19, 2025</p>

          <section aria-labelledby="refunds-cancellations-heading">
            <h2 id="refunds-cancellations-heading">Refunds and Cancellations</h2>

            <p>
              1. Refunds are processed in accordance with this Refund &amp; Cancellation Policy published on the Website.
            </p>

            <p>
              2. Refunds are issued to the original payment method used for the purchase whenever possible.
            </p>

            <p>
              3. Refund processing time depends on the User’s bank and payment system and may vary. In many cases, refunds take several business days to appear on the User's account; actual timing is determined by the User's bank or card issuer.
            </p>

            <p>
              4. Cancellation of a subscription stops future recurring charges but does not automatically entitle the User to a refund of already processed payments unless otherwise stated in this policy or required by applicable law.
            </p>
          </section>

          <section aria-labelledby="how-to-request-heading" style={{ marginTop: 18 }}>
            <h2 id="how-to-request-heading">How to Request a Refund</h2>

            <p>To request a refund, please contact our support team with the following information to help us process your request quickly:</p>
            <ul>
              <li>Your full name</li>
              <li>Email address used for the purchase</li>
              <li>Order number or transaction reference (if available)</li>
              <li>Date of purchase and the amount charged</li>
              <li>Reason for the refund request</li>
            </ul>

            <p>Send your request to: <a href="mailto:support@brainihi.com">support@brainihi.com</a></p>
            <p>We will acknowledge receipt of your request and respond with the next steps or any additional information required.</p>
          </section>

          <section aria-labelledby="limitations-heading" style={{ marginTop: 18 }}>
            <h2 id="limitations-heading">Limitations and Exceptions</h2>

            <p>
              Refunds may be declined in whole or in part where a significant portion of digital content or services has already been accessed or used. Each refund request is evaluated on a case-by-case basis.
            </p>

            <p>
              If the purchase included non-refundable items or services (for example, bespoke content or services already delivered), we will notify the User when refund is not available.
            </p>
          </section>

          <section aria-labelledby="chargebacks-heading" style={{ marginTop: 18 }}>
            <h2 id="chargebacks-heading">Chargebacks and Disputes</h2>

            <p>
              If a User files a chargeback or dispute with their bank or card issuer, BrainiHi reserves the right to provide transaction evidence to the issuing bank. If a chargeback is reversed in our favor, we may re-enable access or otherwise correct the User's account status as appropriate.
            </p>
          </section>

          <section aria-labelledby="processing-heading" style={{ marginTop: 18 }}>
            <h2 id="processing-heading">Processing and Communication</h2>

            <p>
              We aim to process valid refund requests promptly. After approving a refund, we will initiate reimbursement as soon as reasonably possible and provide confirmation to the User. The time required for funds to appear in the User’s account depends on the User’s payment provider or bank.
            </p>
          </section>

          <section aria-labelledby="changes-heading" style={{ marginTop: 18 }}>
            <h2 id="changes-heading">Changes to This Policy</h2>

            <p>
              BrainiHi reserves the right to update this policy. The most recent version will always be available on our website. We will notify Users of material changes by posting the updated policy on the Website and, where appropriate, by additional means.
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
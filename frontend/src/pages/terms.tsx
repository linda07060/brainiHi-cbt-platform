import Head from "next/head";
import Header from "../components/Header";
import layout from "../styles/Layout.module.css";
import styles from "../styles/Terms.module.css";

/**
 * Payment Terms page — updated to use standardized payment sentence
 * and to remove provider-specific contact lines.
 */
export default function TermsPage(): JSX.Element {
  return (
    <>
      <Head>
        <title>Payment Terms — BrainiHi</title>
        <meta
          name="description"
          content="Payment Terms for BrainiHi: payment provider, supported methods, subscriptions and recurring payments."
        />
      </Head>

      <Header />

      <main
        className={`${layout.container} ${styles.termsMain}`}
        style={{ padding: "40px 0" }}
        aria-labelledby="payment-terms-heading"
      >
        <article className={styles.articleWrapper}>
          <h1 id="payment-terms-heading">PAYMENT TERMS</h1>

          <p><strong>Effective date:</strong> December 19, 2025</p>

          <p><strong>Website:</strong> <a href="https://brainihi.com">https://brainihi.com</a></p>

          <p><strong>Website support:</strong> <a href="mailto:support@brainihi.com">support@brainihi.com</a></p>

          {/* Standardized payment sentence (REQUIRED wording) */}
          <p><strong>Payment information:</strong> Payments are processed securely via PayPal.</p>

          <h2>1. General Provisions</h2>
          <ol>
            <li>
              <p>These Payment Terms govern the payment procedures for services provided through brainihi.com (the “Website”, the “Service”).</p>
            </li>
            <li>
              <p>By making a payment on the Website, the User confirms that they have read and fully accepted these Payment Terms, as well as the Terms of Service and Privacy Policy.</p>
            </li>
            <li>
              <p>If the User does not agree with these Payment Terms, they must refrain from using paid features of the Service.</p>
            </li>
          </ol>

          <h2>2. Payment Processing</h2>
          <ol>
            <li>
              <p>Payments are processed securely via PayPal.</p>
            </li>
            <li>
              <p>brainihi.com does not collect, process, or store Users’ bank card details on its servers unless explicitly required for specific payment flows.</p>
            </li>
            <li>
              <p>Payment processing complies with applicable security standards and payment system rules.</p>
            </li>
          </ol>

          <h2>3. Payment Methods</h2>
          <ol>
            <li>
              <p>Payments may be made using bank cards (Visa, Mastercard, and other methods supported during checkout) or other payment methods displayed at checkout.</p>
            </li>
            <li>
              <p>Available payment methods are displayed to the User before completing the payment.</p>
            </li>
          </ol>

          <h2>4. Pricing and Currency</h2>
          <ol>
            <li>
              <p>Service prices are displayed on the Website prior to payment.</p>
            </li>
            <li>
              <p>Payments are charged in the currency indicated on the checkout page.</p>
            </li>
            <li>
              <p>Applicable taxes (including VAT / GST) may be included depending on the User’s location and legal requirements.</p>
            </li>
          </ol>

          <h2>5. Charge Timing</h2>
          <ol>
            <li>
              <p>The User’s payment method is charged immediately after payment confirmation.</p>
            </li>
            <li>
              <p>A successful charge constitutes confirmation of the service agreement between the User and the Service.</p>
            </li>
            <li>
              <p>A small temporary authorization charge may be applied to verify the payment method and may be released automatically by the payment processor.</p>
            </li>
          </ol>

          <h2>6. Subscriptions and Recurring Payments</h2>
          <ol>
            <li>
              <p>Certain services are offered on a subscription basis with recurring charges.</p>
            </li>
            <li>
              <p>By subscribing, the User authorizes the Service to automatically charge the selected payment method according to the chosen plan.</p>
            </li>
            <li>
              <p>Subscriptions may be canceled at any time via the user account or by contacting website support.</p>
            </li>
            <li>
              <p>Cancellation stops future charges but does not automatically entitle the User to a refund of already processed payments unless stated otherwise in the Refund Policy or required by applicable law.</p>
            </li>
          </ol>
        </article>
      </main>
    </>
  );
}
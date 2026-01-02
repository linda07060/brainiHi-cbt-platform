import React from "react";
import layout from "../styles/Layout.module.css";

export default function Privacy(): JSX.Element {
  return (
    <main className={layout.contentInner} style={{ padding: "40px 20px" }}>
      <article>
        <h1>Privacy Policy — BrainiHi</h1>
        <p><strong>Last updated:</strong> December 19, 2025</p>

        <p>
          BrainiHi.com (“we”, “our”, “us”) is operated by Anatoliy Ovcharenko, Individual
          Entrepreneur registered in Kazakhstan. We are committed to protecting your personal data
          and handling it responsibly in compliance with applicable privacy laws.
        </p>

        <h2>1. Data we collect</h2>
        <p>We only collect the data necessary to provide the service.</p>
        <h3>Automatically collected</h3>
        <ul>
          <li>Google account ID (when you sign in with Google)</li>
          <li>Name and email from Google (with your permission)</li>
          <li>IP address & device / browser information</li>
          <li>Usage data (page views, test attempts, interaction timestamps)</li>
        </ul>
        <h3>If you purchase a subscription</h3>
        <p>Billing information is processed by Paddle. We do not store card data on our servers.</p>
        <p>
          We do not knowingly collect personal data of children under 13 or sensitive personal data.
          If you believe a child under 13 used BrainiHi, please contact us immediately.
        </p>

        <h2>2. How we use data</h2>
        <p>We use personal data to:</p>
        <ul>
          <li>Create and manage user accounts</li>
          <li>Provide testing and AI-based explanations</li>
          <li>Improve the platform and product features</li>
          <li>Process payments (via Paddle)</li>
          <li>Communicate important service updates</li>
        </ul>
        <p>We do not sell or rent personal information.</p>

        <h2>3. Legal basis (GDPR — EU/EEA users)</h2>
        <ul>
          <li>Performance of contract — providing the service</li>
          <li>Legitimate interest — security and analytics</li>
          <li>Consent — cookies and marketing communications</li>
        </ul>

        <h2>4. Data sharing</h2>
        <p>Your data may be shared with:</p>
        <ul>
          <li>Paddle — payment processor</li>
          <li>Hosting providers (Vercel, Render)</li>
          <li>Analytics services (e.g., Google Analytics) — only with consent</li>
        </ul>
        <p>
          All third-party providers we use comply with industry security standards. We do not disclose
          personal data to unrelated third parties except when required by law.
        </p>

        <h2>5. International data transfers</h2>
        <p>
          Your data may be stored or processed outside your country (including the United States and
          the EU). We use appropriate safeguards such as Standard Contractual Clauses (SCCs) or
          equivalent protections when required.
        </p>

        <h2>6. Data retention</h2>
        <p>
          We keep personal data only while your account is active or when required by law (for example,
          payment records). You may request deletion at any time (see Your Rights).
        </p>

        <h2>7. Security</h2>
        <p>
          We use strong access controls, encryption, and reputable hosting providers. No system is
          100% secure, but we take reasonable measures to protect data.
        </p>

        <h2>8. Your rights (GDPR)</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your data</li>
          <li>Correct or delete it</li>
          <li>Withdraw consent</li>
          <li>Export your data</li>
          <li>Object to processing</li>
        </ul>
        <p>Requests: <a href="mailto:support@brainihi.com">support@brainihi.com</a></p>

        <h2>9. Cookies & tracking</h2>
        <p>
          We use essential cookies (login, session) and optional analytics cookies only with consent.
          Details and management options are available in our <a href="/cookie-policy">Cookie Policy</a>.
        </p>

        <h2>10. Children’s privacy</h2>
        <p>
          BrainiHi is not intended for children under 13. If you are under 13, please do not use our
          services. If you believe a child under 13 has used our service, contact us at
          <a href="mailto:support@brainihi.com"> support@brainihi.com</a>.
        </p>

        <h2>11. Contact information</h2>
        <p>
          <strong>Owner & Data Controller</strong><br />
          Anatoliy Ovcharenko<br />
          Astana, Kazakhstan<br />
          Email: <a href="mailto:support@brainihi.com">support@brainihi.com</a>
        </p>

        <h2>12. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy. When we do, we will update the "Last updated" date and
          post the new version on this page.
        </p>
      </article>
    </main>
  );
}
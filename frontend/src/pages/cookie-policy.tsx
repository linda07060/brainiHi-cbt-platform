import React from "react";
import layout from "../styles/Layout.module.css";

export default function CookiePolicy(): JSX.Element {
  return (
    <main className={layout.contentInner} style={{ padding: "40px 20px" }}>
      <article>
        <h1>Cookie Policy — BrainiHi</h1>
        <p><strong>Last updated:</strong> October 2025</p>

        <p>We use cookies and similar technologies to provide, secure, and improve our service. Below is a summary of our cookie use.</p>

        <h2>What we use cookies for</h2>
        <ul>
          <li><strong>Authentication / essential:</strong> required for login, session management and core functionality.</li>
          <li><strong>Analytics (optional):</strong> measure performance and usage to improve the product (only with consent).</li>
          <li><strong>Marketing (optional):</strong> personalized messages, only with consent.</li>
        </ul>

        <h2>Managing cookies</h2>
        <p>
          You can manage cookie preferences using the cookie consent banner or via your browser settings.
          Analytics and marketing cookies are enabled only if you give consent.
        </p>

        <h2>Contact</h2>
        <p>To withdraw consent or request more details, email <a href="mailto:support@brainihi.com">support@brainihi.com</a>.</p>

        <h2>Short banner text (suggested)</h2>
        <p>
          We use cookies to improve your experience and analytics. By continuing, you accept our
          <a href="/privacy"> Privacy Policy</a> and <a href="/cookie-policy"> Cookie Policy</a>.
        </p>
      </article>
    </main>
  );
}
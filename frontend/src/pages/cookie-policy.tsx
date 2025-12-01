import Head from "next/head";
import Header from "../components/Header";
import layout from "../styles/Layout.module.css";
import { Container } from "@mui/material";

/**
 * Cookie Policy page — updated to include clear descriptions and contact.
 */
export default function CookiePolicy(): JSX.Element {
  return (
    <>
      <Head>
        <title>Cookie Policy — BrainiHi</title>
        <meta name="description" content="Details about cookies used by BrainiHi and how to manage them." />
      </Head>

      <Header />

      <main className={layout.container} style={{ padding: "40px 0" }} aria-labelledby="cookie-policy-heading">
        <article style={{ maxWidth: 880, margin: "0 auto" }}>
          <h1 id="cookie-policy-heading">BrainiHi — Cookie Policy</h1>
          <p><strong>Effective Date:</strong> October 2025</p>

          <p>BrainiHi uses cookies to operate and improve the Service.</p>

          <h2>Types of Cookies We Use</h2>
          <p><strong>Essential cookies</strong> — required for secure login and platform functionality.</p>
          <p><strong>Analytics cookies</strong> — used to analyze how users interact with the Service. Analytics cookies are only set with user consent.</p>

          <h2>Managing Cookies</h2>
          <p>Users can control or disable cookies through their browser settings at any time. If essential cookies are disabled, some features may not function correctly.</p>

          <h2>Contact</h2>
          <p>
            For questions: <a href="mailto:support@brainihi.com">support@brainihi.com</a>
          </p>

          <h2>Short banner text (suggested)</h2>
          <p>
            We use cookies to improve your experience and analytics. By continuing, you accept our
            <a href="/privacy"> Privacy Policy</a> and <a href="/cookie-policy"> Cookie Policy</a>.
          </p>
        </article>
      </main>
    </>
  );
}
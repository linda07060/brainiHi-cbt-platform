import React from "react";
import layout from "../styles/Layout.module.css";

export default function Security(): JSX.Element {
  return (
    <main className={layout.contentInner} style={{ padding: "40px 20px" }}>
      <article>
        <h1>Security & Data Handling</h1>
        <p><strong>Last updated:</strong> October 2025</p>

        <p>We take the security of your data seriously. Below is a summary of the protections we maintain.</p>

        <h2>Transport & storage</h2>
        <ul>
          <li>TLS (HTTPS) for all network traffic</li>
          <li>Encrypt sensitive data at rest using strong algorithms</li>
          <li>Secrets are stored in managed secret stores and rotated regularly</li>
        </ul>

        <h2>Access & monitoring</h2>
        <ul>
          <li>Role-based access control and least privilege for staff</li>
          <li>Audit logging and monitoring for suspicious activity</li>
          <li>Regular vulnerability scans and third-party penetration testing as scheduled</li>
        </ul>

        <h2>Privacy & minimal data collection</h2>
        <p>We only collect the data necessary to operate and improve BrainiHi. Analytics are collected only with consent.</p>

        <h2>Contact</h2>
        <p>For security inquiries or to report an incident, email: <a href="mailto:support@brainihi.com">support@brainihi.com</a></p>
      </article>
    </main>
  );
}
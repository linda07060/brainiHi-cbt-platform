import React from "react";
import Link from "next/link";
import styles from "../styles/FooterLegal.module.css";

/**
 * FooterLegal - small, minimalist footer with legal links.
 * Place this component in your global layout or pages/_app.tsx so it's visible site-wide.
 */
export default function FooterLegal(): JSX.Element {
  return (
    <div className={styles.footerLegal} role="contentinfo" aria-label="Site legal links and copyright">
      <div className={styles.inner}>
        <nav className={styles.links} aria-label="Legal and policies">
          <Link href="/privacy" className={styles.link}>
            Privacy Policy
          </Link>

          <Link href="/terms" className={styles.link}>
            Terms of Service
          </Link>

          <Link href="/cookie-policy" className={styles.link}>
            Cookie Policy
          </Link>

          <Link href="/security" className={styles.link}>
            Security
          </Link>
        </nav>

        <div className={styles.right}>
          <span className={styles.copy}>© {new Date().getFullYear()} BrainiHi</span>
          <span className={styles.sep} aria-hidden="true">•</span>
          <span className={styles.small}>All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}
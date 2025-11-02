import React from "react";
import Link from "next/link";
import styles from "../../styles/ContactCTA.module.css";

export default function ContactCTA(): JSX.Element {
  return (
    <section className={styles.ctaSection} aria-labelledby="cta-heading">
      <div className={styles.inner}>
        <h3 id="cta-heading" className={styles.ctaText}>
          Master math faster with focused practice and instant explanations.
        </h3>

        <Link href="/register" className={styles.ctaButton} aria-label="Get started with BrainiHi">
          Get started
        </Link>
      </div>
    </section>
  );
}
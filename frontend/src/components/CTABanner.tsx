import React from "react";
import ResponsiveMotion from "./ResponsiveMotion";
import styles from "../styles/CTABanner.module.css";

type Props = {
  title?: string;
  subtitle?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
};

export default function CTABanner({
  title = "Prepare for exams faster with AI",
  subtitle = "Join thousands of students improving their scores with AI-powered practice.",
  primaryHref = "/register",
  primaryLabel = "Get started — free",
  secondaryHref = "/how-it-works",
  secondaryLabel = "How it works",
  className = "",
}: Props): JSX.Element {
  return (
    <ResponsiveMotion
      as="section"
      className={`${styles.banner} ${className}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.12, ease: [0.39, 0.58, 0.57, 1] }}
      aria-labelledby="cta-title"
      role="region"
    >
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h2 id="cta-title" className={styles.title}>
            {title}
          </h2>

          <p className={styles.subtitle}>{subtitle}</p>

          <div className={styles.actions}>
            <a
              href={primaryHref}
              className={`${styles.btn} ${styles.primary}`}
              role="button"
              aria-label={primaryLabel}
            >
              {primaryLabel}
            </a>

            <a
              href={secondaryHref}
              className={`${styles.btn} ${styles.secondary}`}
              aria-label={secondaryLabel}
            >
              {secondaryLabel}
            </a>
          </div>
        </div>

        {/* decorative visual (non-interactive) */}
        <div className={styles.visual} aria-hidden="true" />
      </div>
    </ResponsiveMotion>
  );
}
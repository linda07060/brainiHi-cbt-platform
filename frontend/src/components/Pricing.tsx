import React from "react";
import Link from "next/link";
import styles from "../styles/Pricing.module.css";

type Plan = {
  icon?: string;
  name: string;
  price: string;
  priceLabel?: string;
  localPrice?: string;
  details: string[];
  cta: string;
  link?: string;
  highlight?: boolean;
  badge?: string;
};

const plans: Plan[] = [
  {
    icon: "🟢",
    name: "Free",
    price: "Free",
    details: [
      "Explore the platform",
      "Try a few introductory quizzes",
      "See sample explanations",
      "No AI solutions included",
      "Perfect for getting started",
    ],
    cta: "Start free",
    link: "/register",
  },
  {
    icon: "🔵",
    name: "Pro",
    price: "$12.99 / month",
    priceLabel: "or $99 / year",
    localPrice: "₸6,699",
    details: [
      "Full access to all topics and quizzes",
      "50 AI explanations per month",
      "Step-by-step solution breakdowns",
      "Smart recommendations for weak areas",
      "Personal progress tracker",
    ],
    cta: "Get Pro",
    link: "/register",
    highlight: true,
    badge: "Most popular",
  },
  {
    icon: "🟣",
    name: "Tutor",
    price: "$24.99 / month",
    priceLabel: "or $199 / year",
    localPrice: "₸12,889",
    details: [
      "Everything in Pro",
      "Unlimited AI explanations",
      "Personal AI tutor (ask any question)",
      "Deep progress analytics",
      "Priority support",
    ],
    cta: "Get Tutor",
    link: "/register",
  },
];

export default function Pricing(): JSX.Element {
  return (
    <section className={styles.pricingSection} id="pricing">
      <h2 className={styles.heading}>Choose your plan</h2>

      <div className={styles.cards} role="list">
        {plans.map((plan) => {
          const planQuery = encodeURIComponent(plan.name);
          const href = `/register?plan=${planQuery}`;
          return (
            <article
              key={plan.name}
              role="listitem"
              aria-labelledby={`plan-${plan.name.replace(/\s+/g, "-").toLowerCase()}`}
              className={`${styles.card} ${plan.highlight ? styles.featured : ""}`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.planLeft}>
                  {plan.icon && (
                    <span
                      aria-hidden="true"
                      className={plan.highlight ? styles.planIconFeatured : styles.planIcon}
                    >
                      <span className={styles.iconInner} aria-hidden="true">
                        {plan.icon}
                      </span>
                    </span>
                  )}
                  <div id={`plan-${plan.name.replace(/\s+/g, "-").toLowerCase()}`} className={styles.planName}>
                    {plan.name}
                  </div>
                </div>

                {plan.badge && (
                  <div className={styles.badge} aria-hidden="true">
                    {plan.badge}
                  </div>
                )}
              </div>

              <div className={styles.priceWrap}>
                <div className={styles.priceMain}>{plan.price}</div>
                {plan.priceLabel && <div className={styles.priceSub}>{plan.priceLabel}</div>}
                {plan.localPrice && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
                    <strong>Local price:</strong> {plan.localPrice}
                  </div>
                )}

                <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
                  <strong>Auto‑renewing subscription</strong> · Cancel anytime
                </div>
              </div>

              <ul className={styles.features} aria-label={`${plan.name} features`}>
                {plan.details.map((d) => (
                  <li key={d} className={styles.featureItem}>
                    <span className={styles.featureDot} aria-hidden="true" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>

              {/* Use Link directly (no inner <a>) to avoid Next.js <Link> + <a> runtime errors */}
              <Link href={href} className={`${styles.cta} ${plan.highlight ? styles.primary : ""}`} role="button" aria-label={`${plan.cta} - ${plan.name}`}>
                {plan.cta}
              </Link>

              {/* Terms + privacy consent near payment */}
              <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
                By continuing, you agree to our{" "}
                <Link href="/terms" className={styles.link}>
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className={styles.link}>
                  Privacy Policy
                </Link>
                .
              </div>

              {/* Payment provider shown per card as requested */}
              <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                Payment provider: <strong>TipTop Pay (CloudPayments)</strong>
              </div>

              {/* Support hint */}
              <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                Need help? Contact: <a href="mailto:support@brainihi.com">support@brainihi.com</a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
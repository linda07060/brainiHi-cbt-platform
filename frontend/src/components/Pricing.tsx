import React from "react";
import styles from "../styles/Pricing.module.css";

type Plan = {
  icon?: string;
  name: string;
  price: string;
  priceLabel?: string;
  details: string[];
  cta: string;
  link: string;
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
        {plans.map((plan) => (
          <article
            key={plan.name}
            role="listitem"
            aria-labelledby={`plan-${plan.name.replace(/\s+/g, "-").toLowerCase()}`}
            className={`${styles.card} ${plan.highlight ? styles.featured : ""}`}
          >
            <div className={styles.cardHeader}>
              <div className={styles.planLeft}>
                {plan.icon && (
                  <span aria-hidden="true" style={{ fontSize: 20, marginRight: 6 }}>
                    {plan.icon}
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
            </div>

            <ul className={styles.features} aria-label={`${plan.name} features`}>
              {plan.details.map((d) => (
                <li key={d} className={styles.featureItem}>
                  <span className={styles.featureDot} aria-hidden="true" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>

            <a
              href={plan.link}
              className={`${styles.cta} ${plan.highlight ? " " + styles["primary"] : " " + styles["primary"]}`}
              role="button"
              aria-label={`${plan.cta} - ${plan.name}`}
            >
              {plan.cta}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
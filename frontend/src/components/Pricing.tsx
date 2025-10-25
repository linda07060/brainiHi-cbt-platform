import styles from "../styles/Pricing.module.css";

const plans = [
  {
    icon: "🟢",
    name: "Free Plan",
    price: "Free",
    details: [
      "Explore the platform",
      "Try a few introductory quizzes",
      "See sample explanations",
      "No AI solutions included",
      "Perfect for getting started",
    ],
    cta: "Start Free",
    link: "/register",
    highlight: false,
  },
  {
    icon: "🔵",
    name: "Pro Plan",
    price: "$12.99/month or $99/year",
    priceLabel: " (36% off)",
    details: [
      "Full access to all math topics and quizzes",
      "50 AI explanations per month",
      "Step-by-step solution breakdowns",
      "Smart recommendations for weak areas",
      "Personal progress tracker",
      "Priority content updates",
    ],
    cta: "Go Pro",
    link: "/register",
    highlight: true,
    badge: "Most Popular",
  },
  {
    icon: "🟣",
    name: "Tutor Plan",
    price: "$24.99/month or $199/year",
    details: [
      "Everything in Pro",
      "Unlimited AI explanations",
      "Personal AI Tutor (ask any question, get detailed help)",
      "Deep progress analytics",
      "Priority support",
      "Early access to new learning modules",
    ],
    cta: "Get Tutor Plan",
    link: "/register",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section className={styles.pricingSection} id="pricing">
      <h2 className={styles.heading}>Choose Your Plan</h2>
      <div className={styles.cards}>
        {plans.map((plan) => (
          <div
            className={`${styles.card} ${plan.highlight ? styles.highlight : ""}`}
            key={plan.name}
          >
            <div className={styles.cardHeader}>
              <span className={styles.planIcon} aria-hidden="true">
                {plan.icon}
              </span>
              <span className={styles.planName}>{plan.name}</span>
              {plan.badge && <span className={styles.badge}>{plan.badge}</span>}
            </div>
            <div className={styles.priceWrap}>
              <span className={styles.price}>{plan.price}</span>
              {plan.priceLabel && (
                <span className={styles.priceLabel}>{plan.priceLabel}</span>
              )}
            </div>
            <ul className={styles.features}>
              {plan.details.map((f) => (
                <li key={f} className={styles.featureItem}>
                  <span className={styles.featureDot}></span>
                  {f}
                </li>
              ))}
            </ul>
            <a href={plan.link} className={styles.cta}>
              {plan.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
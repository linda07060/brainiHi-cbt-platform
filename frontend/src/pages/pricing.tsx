import Head from "next/head";
import Link from "next/link";
import Header from "../components/Header";
import layout from "../styles/Layout.module.css";
import styles from "../styles/Pricing.module.css";

/**
 * Dedicated Pricing page at /pricing
 * - Minimalist, professional and responsive
 * - Shows local currency equivalents under USD monthly prices
 * - Displays Payment provider information inside each plan card
 *
 * Note: Next.js Link is used directly (no inner <a>) to avoid "Invalid <Link> with <a> child"
 */

type Plan = {
  icon?: string;
  name: string;
  price: string;
  priceLabel?: string;
  localPrice?: string; // local currency display (optional)
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
    localPrice: "₸6,699", // local equivalent for monthly
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
    localPrice: "₸12,889", // local equivalent for monthly
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

export default function PricingPage(): JSX.Element {
  return (
    <>
      <Head>
        <title>Pricing — BrainiHi</title>
        <meta name="description" content="BrainiHi pricing plans: Free, Pro, Tutor. Choose the plan that fits your needs." />
      </Head>

      <Header />

      <main className={layout.container} style={{ padding: "48px 16px" }} aria-labelledby="pricing-heading">
        {/* Small hero/header */}
        <section className={styles.hero} aria-labelledby="pricing-hero-heading">
          <div className={styles.heroContent}>
            <h1 id="pricing-hero-heading" className={styles.heroTitle}>Simple plans for focused learning</h1>
            <p className={styles.heroSubtitle}>
              Start free and upgrade when you need more AI explanations, deeper analytics, and priority support.
              Choose the plan that fits your study goals.
            </p>

            <div className={styles.heroActions}>
              <Link href="/register?plan=Free" className={styles.heroCta} aria-label="Start free">Start free</Link>
              <Link href="/pricing#plans" className={styles.heroSecondary}>Compare plans</Link>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className={styles.pricingSection} id="pricing" aria-label="Pricing plans">
          <h2 id="pricing-heading" className={styles.heading} style={{ marginTop: 0 }}>
            Our plans
          </h2>

          <p style={{ maxWidth: 720, margin: "0 auto 18px", color: "#4b4b4b" }}>
            Pick a plan that matches your needs: free for exploration, Pro for regular learners, and Tutor for educators and power users.
          </p>

          <div className={styles.cards} role="list" aria-label="Plans list" id="plans">
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

                  <Link href={href} className={styles.cta} role="button" aria-label={`${plan.cta} - ${plan.name}`}>
                    {plan.cta}
                  </Link>

                  <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
                    By continuing, you agree to our{" "}
                    <Link href="/terms" className={styles.link}>Terms of Service</Link>{" "}
                    and{" "}
                    <Link href="/privacy" className={styles.link}>Privacy Policy</Link>.
                  </div>

                  {/* Payment provider shown per card, as requested */}
                  <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                    Payment provider: <strong>TipTop Pay (CloudPayments)</strong>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                    Need help? Contact: <a href="mailto:support@brainihi.com">support@brainihi.com</a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
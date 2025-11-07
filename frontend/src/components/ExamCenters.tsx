import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/ExamCenters.module.css";

export default function ExamCenters(): JSX.Element {
  const router = useRouter();

  // Open the sample test modal by dispatching the same custom event
  // Header's SampleTestModal listens for "open-sample-test"
  function openSampleModal() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("open-sample-test", { detail: { pick: 5 } }));
  }

  // Scroll to pricing on the homepage; navigate then jump if necessary.
  async function goToPricing() {
    if (typeof window === "undefined") return;

    // If already on the home page, smooth scroll to the #pricing element
    if (router.pathname === "/") {
      const el = document.getElementById("pricing") || document.querySelector("[data-pricing]");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // fallback: jump to anchor
      window.location.hash = "#pricing";
      return;
    }

    // Not on homepage: navigate to home with anchor. Next will jump to it;
    // some browsers jump immediately, which is acceptable. If you want smooth
    // behavior after navigation, you can add a small script on the homepage
    // that smooth-scrolls on route change when location.hash === "#pricing".
    await router.push("/#pricing");
  }

  return (
    <motion.section
      className={styles.wrap}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.36, 0.64, 0.2, 1] }}
      aria-labelledby="exam-centers-title"
    >
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.accent} aria-hidden="true" />
          <p className={styles.kicker}>Math practice, reimagined</p>

          <h2 id="exam-centers-title" className={styles.title}>
            AI-generated tests and clear explanations for{" "}
            <span className={styles.highlight}>better results</span>
          </h2>

          <p className={styles.lead}>
            Use BrainiHi's AI-powered test engine to generate targeted practice tailored to topics and difficulty
            levels. Get instant explanations, adaptive recommendations, and repeatable simulated exams that mirror real
            test conditions.
          </p>

          <p className={styles.lead}>
            Track progress on your dashboard, compare results across practice runs, and upgrade to subscription plans
            for full-length timed tests, downloadable reports, and priority AI assistance. Secure payments
            and easy plan management keep you focused on learning.
          </p>

          <div className={styles.actions}>
            {/* Open modal (no navigation) */}
            <button
              type="button"
              className={styles.cta}
              onClick={openSampleModal}
              aria-haspopup="dialog"
              aria-controls="sample-test-modal"
            >
              Try a sample test
            </button>

            {/* Scroll to pricing section on the homepage */}
            <button
              type="button"
              className={styles.link}
              onClick={goToPricing}
              aria-label="See subscription plans"
            >
              See plans
            </button>
          </div>
        </div>

        <div className={styles.media}>
          <div
            className={styles.imageFrame}
            role="img"
            aria-label="Students taking a computer-based practice test"
          >
            <Image
              src="/images/centers-hero.webp"
              alt="Students taking a computer-based math practice test"
              fill
              sizes="(max-width: 720px) 100vw, (max-width: 1200px) 50vw, 480px"
              style={{ objectFit: "cover", objectPosition: "center" }}
              priority={false}
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
}
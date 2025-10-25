import styles from "../../styles/ContactCTA.module.css";
import Link from "next/link";

export default function ContactCTA() {
  return (
    <section className={styles.ctaSection}>
      <h3 className={styles.ctaText}>
        Ready to master math the smart way? Join our growing community of learners today.
      </h3>
      <Link href="/register" className={styles.ctaButton}>
        Get Started
      </Link>
    </section>
  );
}
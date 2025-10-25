import ResponsiveMotion from "./ResponsiveMotion";
import styles from "../styles/CTABanner.module.css";

export default function CTABanner() {
  return (
    <ResponsiveMotion
      as="section"
      className={styles.banner}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.39, 0.58, 0.57, 1] }}
    >
      <div className={styles.bg} />
      <div className={styles.content}>
        <h2 className={styles.heading}>Ready to Study Smarter?</h2>
        <p className={styles.text}>
          Join thousands of students improving their scores with AI.
        </p>
        <a href="/login" className={styles.cta}>Get Started Free</a>
      </div>
    </ResponsiveMotion>
  );
}
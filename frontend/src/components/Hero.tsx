import { motion } from "framer-motion";
import styles from "../styles/Hero.module.css";

export default function Hero() {
  return (
    <motion.section
      className={styles.hero}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.8, ease: [0.39, 0.58, 0.57, 1] }}
    >
      <div className={styles.content}>
        <h1 className={styles.heading}>Study Smarter with AI — Not Harder.</h1>
        <p className={styles.subheading}>
          Our intelligent assistant generates tests, explains answers, and helps you truly understand every concept.
        </p>
        <div className={styles.ctas}>
          <a href="/login" className={styles.primary}>Start Learning</a>
          <a href="#how-it-works" className={styles.secondary}>See How It Works</a>
        </div>
      </div>
      <div className={styles.illustration}>
        <img
          src="/images/hero.png"
          alt="AI assistant helping a student"
          className={styles.illustrationImg}
        />
      </div>
    </motion.section>
  );
}
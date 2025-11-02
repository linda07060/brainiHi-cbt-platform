import { motion } from "framer-motion";
import styles from "../styles/ForwardThinkingPrograms.module.css";
import Link from "next/link";

const PROGRAM_STATS = {
  subjects: "500+",
  label: "Practice subjects",
};

export default function ForwardThinkingPrograms(): JSX.Element {
  return (
    <motion.section
      className={styles.programs}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.7, delay: 0.08, ease: [0.36, 0.64, 0.2, 1] }}
      aria-labelledby="programs-heading"
      role="region"
    >
      <div className={styles.inner}>
        <div className={styles.left}>
          <h2 id="programs-heading" className={styles.heading}>
            <span className={styles.italic}>Forward‑thinking</span>
            <br />
            Programs
          </h2>

          <div className={styles.underline} aria-hidden="true" />

          <p className={styles.desc}>
            Prepare for exam success and a brighter future. BrainiHi combines AI‑driven diagnostics, step‑by‑step explanations, and curated practice so you
            can focus on the topics that matter and improve fast.
          </p>

          <div className={styles.actions}>
            <Link href="/programs" className={styles.primaryCta} aria-label="Explore programs">
              Explore programs
            </Link>

            <Link href="/assessment" className={styles.link} aria-label="Take study readiness assessment">
              Take the readiness assessment
            </Link>
          </div>
        </div>

        <div className={styles.visual}>
          <div className={styles.grid}>
            <img
              src="/images/program1.png"
              alt="Students collaborating"
              className={styles.smallImg}
              loading="lazy"
              width={220}
              height={140}
            />

            <div className={styles.statCard} aria-hidden="false">
              <img src="/images/program2.png" alt="" className={styles.statBg} aria-hidden="true" />
              <div className={styles.stat}>
                <span className={styles.statNumber}>{PROGRAM_STATS.subjects}</span>
                <span className={styles.statLabel}>{PROGRAM_STATS.label}</span>
              </div>
            </div>

            <img
              src="/images/program3.png"
              alt="Practical learning"
              className={styles.largeImg}
              loading="lazy"
              width={360}
              height={460}
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
}
import { motion } from "framer-motion";
import styles from "../styles/ForwardThinkingPrograms.module.css";
import Link from "next/link";

export default function ForwardThinkingPrograms() {
  return (
    <motion.section
      className={styles.programs}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.39, 0.58, 0.57, 1] }}
    >
      <div className={styles.left}>
        <h2 className={styles.heading}>
          <span className={styles.italic}>FORWARD-THINKING</span><br />
          PROGRAMS
        </h2>
        <div className={styles.underline} />
        <p className={styles.desc}>
          Prepare for exam success and a brighter future. Brainihi offers AI-powered tools and up-to-date resources to help you master your subjects, improve your scores, and build confidence for any academic challenge.
        </p>
        <Link href="/login" className={styles.cta}>
          EXPLORE PROGRAMS <span className={styles.arrow}>→</span>
        </Link>
        <div className={styles.assess}>
          <span className={styles.assessQ}>Not sure which subject to focus on?</span>
          <span className={styles.assessA}>
            Take our quick <a href="/login" className={styles.assessLink}>study readiness assessment</a> to get a personalized learning plan.
          </span>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.grid}>
          <img src="/images/program1.png" alt="Students collaborating on science project" className={styles.topImg} />
          <div className={styles.majorsCard}>
            <img src="/images/program2.png" alt="Exam success impact" className={styles.bgImg} />
            <div className={styles.majorsText}>
              <span className={styles.num}>500+</span>
              <span className={styles.text}>PRACTICE SUBJECTS</span>
            </div>
          </div>
          <img src="/images/program3.png" alt="Hands-on practical learning" className={styles.rightImg} />
        </div>
      </div>
    </motion.section>
  );
}
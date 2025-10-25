import { motion } from "framer-motion";
import styles from "../styles/ExamCenters.module.css";
import Link from "next/link";

export default function ExamCenters() {
  return (
    <motion.section
      className={styles.centers}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.39, 0.58, 0.57, 1] }}
    >
      {/* Numbers Block */}
      <div className={styles.numbersBlock}>
        <div className={styles.numbersTitle}>
          <span>U.S. EXAM NETWORK BY THE NUMBERS</span>
        </div>
        <div className={styles.numbersGrid}>
          <div className={styles.numberItem}>
            <span className={styles.bigNumber}>250+</span>
            <span className={styles.numLabel}>ACCREDITED EXAM CENTERS</span>
          </div>
          <div className={styles.numberItem}>
            <span className={styles.bigNumber}>600+</span>
            <span className={styles.numLabel}>SUBJECTS OFFERED</span>
          </div>
          <div className={styles.numberItem}>
            <span className={styles.bigNumber}>98%</span>
            <span className={styles.numLabel}>STUDENT SATISFACTION</span>
          </div>
          <div className={styles.numberItem}>
            <span className={styles.bigNumber}>75+</span>
            <span className={styles.numLabel}>ACADEMIC PARTNER INSTITUTIONS</span>
          </div>
        </div>
      </div>
      {/* Section Main Content */}
      <div className={styles.topBar}>
        <div className={styles.headerBlock}>
          <h2 className={styles.heading}>
            <span className={styles.italic}>EXAM CENTERS</span> ACROSS THE USA
          </h2>
          <div className={styles.underline} />
          <p className={styles.desc}>
            Brainihi works with leading schools and certified venues across the United States. Locate an accredited center near you—from New York to California—and experience reliable, modern testing facilities for all major standardized exams and subjects.
          </p>
        </div>
        <Link href="/login" className={styles.cta}>
          FIND A CENTER <span className={styles.arrow}>→</span>
        </Link>
      </div>
      <div className={styles.mapSection}>
        <div className={styles.mapArea}>
          <img src="/images/centers-bg.png" alt="U.S. landscape background" className={styles.bgImg} />
          <img src="/images/centers-map.png" alt="USA map with exam centers" className={styles.mapImg} />
          {/* Example markers for major cities */}
          <img src="/images/center-marker.png" className={`${styles.marker} ${styles.marker1}`} alt="Exam Center Location" />
          <img src="/images/center-marker.png" className={`${styles.marker} ${styles.marker2}`} alt="Exam Center Location" />
          <img src="/images/center-marker.png" className={`${styles.marker} ${styles.marker3}`} alt="Exam Center Location" />
        </div>
        <div className={styles.centerInfo}>
          <span className={styles.centerName}>NEW YORK MAIN CENTER</span>
          <p className={styles.centerDesc}>
            Our New York facility features advanced computer labs, secure proctoring, and a convenient downtown location. Similar accredited centers are available in every region of the U.S. for both practice and official exams.
          </p>
          <Link href="/login" className={styles.centerCta}>EXPLORE NEW YORK</Link>
        </div>
      </div>
    </motion.section>
  );
}
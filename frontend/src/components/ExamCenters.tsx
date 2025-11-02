import { motion } from "framer-motion";
import styles from "../styles/ExamCenters.module.css";
import Link from "next/link";
import layout from "../styles/Layout.module.css";

const STATS = [
  { value: "250+", label: "Accredited testing centers across the U.S." },
  { value: "600+", label: "Subject modules & exam variants supported" },
  { value: "98%", label: "Student satisfaction (post-test surveys)" },
  { value: "75+", label: "Academic & testing partners nationwide" },
];

const SAMPLE_CENTER = {
  id: "ny-main",
  name: "BrainiHi — Broadway Test Center",
  city: "New York, NY",
  addressLines: ["450 Broadway, Suite 210", "New York, NY 10013"],
  hours: "Mon–Fri 8:30am–6:00pm",
  phone: "(212) 555-0198",
  link: "/centers/new-york",
};

export default function ExamCenters(): JSX.Element {
  return (
    <motion.section
      className={styles.centers}
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.08, ease: [0.36, 0.64, 0.2, 1] }}
      aria-labelledby="exam-centers-heading"
    >
      <div className={styles.container}>
        {/* KPI / stats */}
        <div className={styles.numbersBlock} aria-hidden="false">
          <h3 className={styles.numbersTitle}>U.S. exam network — at a glance</h3>
          <dl className={styles.numbersGrid} aria-label="Network statistics">
            {STATS.map((s) => (
              <div className={styles.numberItem} key={s.label}>
                <dt className={styles.bigNumber}>{s.value}</dt>
                <dd className={styles.numLabel}>{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Header + CTA */}
        <div className={styles.topBar}>
          <div className={styles.headerBlock}>
            <h2 id="exam-centers-heading" className={styles.heading}>
              <span className={styles.italic}>Exam centers</span> across the U.S.
            </h2>
            <div className={styles.underline} aria-hidden="true" />
            <p className={styles.desc}>
              BrainiHi partners with accredited testing venues and educational institutions to provide secure,
              professionally-run testing locations for diagnostics and official practice. Find nearby centers offering
              proctored computer-based testing, ADA accommodations, and on-site support.
            </p>
          </div>

          <Link href="/centers" className={styles.cta} aria-label="Find a BrainiHi test center">
            Find a center <span className={styles.arrow}>→</span>
          </Link>
        </div>

        {/* Map + selected center info */}
        <div className={styles.mapSection}>
          <div className={styles.mapArea} role="img" aria-label="Map showing BrainiHi center locations in the U.S.">
            <img
              src="/images/centers-map.png"
              alt="Map with BrainiHi exam center locations"
              className={styles.mapImg}
            />

            {/* markers (decorative) */}
            <img
              src="/images/center-marker.png"
              className={`${styles.marker} ${styles.marker1}`}
              alt="Exam center marker - New York area"
              aria-hidden="true"
            />
            <img
              src="/images/center-marker.png"
              className={`${styles.marker} ${styles.marker2}`}
              alt="Exam center marker - Los Angeles area"
              aria-hidden="true"
            />
            <img
              src="/images/center-marker.png"
              className={`${styles.marker} ${styles.marker3}`}
              alt="Exam center marker - Chicago area"
              aria-hidden="true"
            />
          </div>

          <aside className={styles.centerCard} aria-labelledby="center-card-heading">
            <div className={styles.centerHeader}>
              <span id="center-card-heading" className={styles.centerNamePill}>
                {SAMPLE_CENTER.name}
              </span>
            </div>

            <p className={styles.centerDesc}>
              Located in Manhattan’s Tribeca neighborhood, the Broadway Test Center provides secure computer labs,
              ADA-friendly seating, and professional proctoring for diagnostics and full-length simulated exams.
              Walk-ins accepted by appointment.
            </p>

            <address className={styles.centerAddress}>
              {SAMPLE_CENTER.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div className={styles.centerHours}>{SAMPLE_CENTER.hours}</div>
            </address>

            <div className={styles.centerActions}>
              <a href={`tel:${SAMPLE_CENTER.phone.replace(/[^0-9+]/g, "")}`} className={styles.centerPhone}>
                {SAMPLE_CENTER.phone}
              </a>
              <Link href={SAMPLE_CENTER.link} className={styles.centerCta}>
                Explore New York
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </motion.section>
  );
}
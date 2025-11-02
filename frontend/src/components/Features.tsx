import ResponsiveMotion from "./ResponsiveMotion";
import styles from "../styles/Features.module.css";

const features = [
  {
    title: "Smart Test Generator",
    desc: "Automatically generates math tests based on your chosen topic and difficulty, ensuring every session challenges you intelligently.",
    icon: "/images/feature1.png",
  },
  {
    title: "Detailed Explanations",
    desc: "Every question comes with detailed, step-by-step reasoning to help you truly understand the logic behind each answer.",
    icon: "/images/feature2.png",
  },
  {
    title: "Performance Tracking",
    desc: "Stay on top of your progress with visual reports that highlight your strengths, weaknesses, and overall improvement.",
    icon: "/images/feature3.png",
  },
  {
    title: "Personalized Learning",
    desc: "The system adapts to your learning style and performance, delivering questions and feedback tailored just for you.",
    icon: "/images/feature4.png",
  },
];

export default function Features(): JSX.Element {
  return (
    <ResponsiveMotion
      as="section"
      className={styles.features}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.39, 0.58, 0.57, 1] }}
      id="features"
      aria-labelledby="features-heading"
    >
      <h2 id="features-heading" className={styles.title}>
        Everything You Need to Master Exams
      </h2>

      <div className={styles.grid} role="list" aria-label="Feature list">
        {features.map((f, idx) => (
          <article
            key={f.title}
            role="listitem"
            className={styles.card}
            aria-labelledby={`feature-title-${idx}`}
          >
            <div className={styles.iconWrap} aria-hidden="false">
              <img
                src={f.icon}
                alt={`${f.title} icon`}
                className={styles.icon}
                loading="lazy"
                width={56}
                height={56}
              />
            </div>

            <h3 id={`feature-title-${idx}`} className={styles.cardTitle}>
              {f.title}
            </h3>

            <p className={styles.cardDesc}>{f.desc}</p>
          </article>
        ))}
      </div>
    </ResponsiveMotion>
  );
}
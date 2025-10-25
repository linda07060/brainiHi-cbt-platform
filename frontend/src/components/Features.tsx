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

export default function Features() {
  return (
    <ResponsiveMotion
      as="section"
      className={styles.features}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.39, 0.58, 0.57, 1] }}
      id="features"
    >
      <h2 className={styles.title}>Everything You Need to Master Exams</h2>
      <div className={styles.grid}>
        {features.map((f) => (
          <div className={styles.card} key={f.title}>
            <img src={f.icon} alt={f.title} className={styles.icon} />
            <h3 className={styles.cardTitle}>{f.title}</h3>
            <p className={styles.cardDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </ResponsiveMotion>
  );
}
import ResponsiveMotion from "./ResponsiveMotion"; // Import the wrapper
import styles from "../styles/Testimonials.module.css";

const testimonials = [
  {
    name: "Brenda Lee",
    institution: "University of California, Los Angeles (UCLA)",
    avatar: "/images/avatar1.png",
    quote: "It feels like having a personal tutor! The AI-generated tests and instant explanations made math easier and more enjoyable for me.",
  },
  {
    name: "Clara Lee",
    institution: "Massachusetts Institute of Technology (MIT)",
    avatar: "/images/avatar2.png",
    quote: "Exactly what I needed for exam prep. The smart tests and tracking tools helped me stay consistent and improve every week.",
  },
  {
    name: "Allen Kell",
    institution: "Stanford University",
    avatar: "/images/avatar3.png",
    quote: "Learning math has never been this easy. The explanations are clear, and the system adapts to my weaknesses perfectly.",
  },
];

export default function Testimonials() {
  return (
    <ResponsiveMotion
      as="section"
      className={styles.testimonials}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.39, 0.58, 0.57, 1] }}
      id="testimonials"
    >
      <h2 className={styles.heading}>Loved by Students Everywhere</h2>
      <div className={styles.cards}>
        {testimonials.map((t) => (
          <div className={styles.card} key={t.name}>
            <img src={t.avatar} alt={t.name} className={styles.avatar} />
            <blockquote className={styles.quote}>“{t.quote}”</blockquote>
            <div className={styles.meta}>
              <span className={styles.name}>{t.name}</span>
              <span className={styles.inst}>{t.institution}</span>
            </div>
          </div>
        ))}
      </div>
    </ResponsiveMotion>
  );
}
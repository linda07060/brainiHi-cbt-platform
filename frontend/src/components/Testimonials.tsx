import React from "react";
import styles from "../styles/Testimonials.module.css";

type Testimonial = {
  quote: string;
  name: string;
  affiliation?: string;
  avatar?: string;
  highlight?: boolean;
};

const testimonials: Testimonial[] = [
  {
    quote:
      "It feels like having a personal tutor... instant explanations made math easier.",
    name: "Brenda White",
    affiliation: "UCLA",
    avatar: "/images/avatar1.png",
  },
  {
    quote:
      "Exactly what I needed for exam prep. Smart tests and tracking helped me improve every week.",
    name: "Clara Lee",
    affiliation: "MIT",
    avatar: "/images/avatar2.png",
  },
  {
    quote:
      "Learning math has never been this easy. The system adapts to my weaknesses perfectly.",
    name: "Allen Kell",
    affiliation: "Stanford",
    avatar: "/images/avatar3.png",
    highlight: true,
  },
];

export default function Testimonials(): JSX.Element {
  return (
    <section className={styles.testimonialsWrap} aria-labelledby="testimonials-heading">
      <h2 id="testimonials-heading" className={styles.testimonialsHeading}>
        Loved by students everywhere
      </h2>

      <div className={styles.testimonialsGrid} role="list">
        {testimonials.map((t, i) => {
          const id = `testimonial-${i}`;
          return (
            <article
              key={id}
              role="listitem"
              aria-labelledby={`${id}-name`}
              tabIndex={0}
              className={`${styles.testimonialCard} ${t.highlight ? styles.highlight : ""}`}
            >
              <div className={styles.testimonialHeader}>
                <div className={styles.testimonialAvatar}>
                  <img src={t.avatar} alt={`${t.name} avatar`} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div id={`${id}-name`} className={styles.testimonialAuthor}>
                    {t.name}
                  </div>
                  {t.affiliation && (
                    <div className={styles.testimonialAffiliation}>{t.affiliation}</div>
                  )}
                </div>
              </div>

              <blockquote className={styles.testimonialQuote} cite={t.affiliation}>
                “{t.quote}”
              </blockquote>
            </article>
          );
        })}
      </div>
    </section>
  );
}
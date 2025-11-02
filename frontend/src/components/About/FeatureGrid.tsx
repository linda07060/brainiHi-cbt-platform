import styles from '../../styles/About/FeatureGrid.module.css';
import layout from '../../styles/Layout.module.css';

const features = [
  {
    title: "Personalized Learning",
    desc: "Brainihi.com adapts math practice to each student's strengths and weaknesses, ensuring every learner gets targeted support.",
    link: "/about"
  },
  {
    title: "AI Assessment Engine",
    desc: "Our neural network technology delivers instant feedback and explanations for every problem, making understanding easy.",
    link: "/about"
  },
  {
    title: "Educator Tools",
    desc: "Teachers and tutors can track student progress, assign custom tests, and identify areas for classroom focus.",
    link: "/about"
  },
  {
    title: "Research Driven",
    desc: "Our approach is grounded in the latest education and AI research to ensure optimal results for all learners.",
    link: "/about"
  },
  {
    title: "Accessible Anywhere",
    desc: "Use Brainihi.com on any device, any time. Learning is always just a click away.",
    link: "/about"
  },
  {
    title: "Community Support",
    desc: "Join a supportive community of learners and educators, sharing tips, encouragement, and success stories.",
    link: "/about"
  },
];

export default function FeatureGrid() {
  return (
    <section className={styles.wrapper}>
      <div className={layout.container}>
        <div className={styles.centerText}>
          <h2 className={styles.title}>At the Center of a Smarter Future</h2>
          <div className={styles.underline} />
          <p className={styles.subtitle}>
            Brainihi.com is committed to accessible, research-driven, and empowering tools for math success. Explore the pillars of our platform below.
          </p>
        </div>
        <div className={styles.grid}>
          {features.map(f => (
            <div className={styles.card} key={f.title}>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
              <a href={f.link} className={styles.readMore}>
                READ MORE
                <span className={styles.yellowUnderline}></span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
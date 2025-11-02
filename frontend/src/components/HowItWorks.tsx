import ResponsiveMotion from "./ResponsiveMotion";
import DemoVideo from "./DemoVideo";
import styles from "../styles/HowItWorks.module.css";

const steps = [
  {
    title: "Take a Smart Test",
    desc:
      "Start a short adaptive test tailored to your topic and level — each session is fresh and targeted.",
    icon: "/images/how1.png",
  },
  {
    title: "Get Instant Explanations",
    desc:
      "Receive concise, step‑by‑step explanations right away so you learn from mistakes and build skill.",
    icon: "/images/how2.png",
  },
  {
    title: "Track & Improve",
    desc:
      "Use clear progress insights to focus practice, accelerate improvement, and build confidence.",
    icon: "/images/how3.png",
  },
];

export default function HowItWorks(): JSX.Element {
  return (
    <ResponsiveMotion
      as="section"
      className={styles.howItWorks}
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.36, 0.64, 0.2, 1] }}
      id="how-it-works"
      aria-labelledby="howitworks-heading"
    >
      <div className={styles.container}>
        <h2 id="howitworks-heading" className={styles.title}>
          How it works
        </h2>

        <ul className={styles.steps} role="list" aria-label="How the product works in three steps">
          {steps.map((s, i) => (
            <li key={s.title} className={styles.step} role="listitem" tabIndex={0}>
              <div className={styles.stepHeader}>
                <div className={styles.iconWrap}>
                  <img src={s.icon} alt="" aria-hidden="true" className={styles.icon} />
                </div>
                <div className={styles.stepIndex} aria-hidden="true">{`0${i + 1}`}</div>
              </div>

              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepDesc}>{s.desc}</p>
            </li>
          ))}
        </ul>

        <div className={styles.demoWrap}>
          <div className={styles.demoCard} aria-hidden="false">
            <DemoVideo
              videoUrl="/videos/demo-video.mp4"
              fallbackUrl="/images/demo-video.mp4"
              poster="/images/demo-video.png"
              alt="Short demo of the test flow"
              autoplay={true}   // attempt muted autoplay
              controls={false}  // hide controls so autoplay experience is clean; DemoVideo shows overlay if autoplay blocked
            />
          </div>
        </div>
      </div>
    </ResponsiveMotion>
  );
}
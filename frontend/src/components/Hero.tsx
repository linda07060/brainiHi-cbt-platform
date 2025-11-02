import { motion } from "framer-motion";
import { useRouter } from "next/router";
import styles from "../styles/Hero.module.css";
import layout from "../styles/Layout.module.css";
import DemoVideo from "./DemoVideo";

type HeroProps = {
  exam?: string; // "SAT" | "ACT" or undefined for generic
};

export default function Hero({ exam: examProp }: HeroProps) {
  const router = useRouter();
  const examQuery = typeof router.query.exam === "string" ? router.query.exam.toUpperCase() : "";
  const exam = examProp ? examProp.toUpperCase() : examQuery || "";

  const headline = exam
    ? `Prepare for ${exam} faster with AI — BrainiHi`
    : "Prepare for exams faster with AI — BrainiHi";

  const subheading = exam
    ? `AI-generated ${exam} practice tests, instant explanations, and targeted drills to help you improve your ${exam} score.`
    : "AI-generated tests, instant explanations, and personalized practice to help you improve your scores.";

  function openSampleModalForExam(selectedExam?: string) {
    const detail: any = { pick: 5 };
    if (selectedExam) detail.exam = selectedExam.toUpperCase();
    window.dispatchEvent(new CustomEvent("open-sample-test", { detail }));
  }

  return (
    <motion.section
      className={styles.hero}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.7, ease: [0.39, 0.58, 0.57, 1] }}
      aria-labelledby="hero-heading"
      role="region"
    >
      <div className={layout.contentInner}>
        <div className={styles.heroInner}>
          <div className={styles.content}>
            <h1 id="hero-heading" className={styles.heading}>
              {headline}
            </h1>

            <p className={styles.subheading}>{subheading}</p>

            <div className={styles.ctas}>
              <button
                className={styles.primary}
                onClick={() => openSampleModalForExam(exam || undefined)}
                aria-label="Take a free test"
              >
                Take a free test
              </button>

              <a href="#how-it-works" className={styles.secondary} aria-label="How it works">
                How it works
              </a>
            </div>
          </div>

          <div className={styles.illustration} aria-hidden={!!exam ? false : true}>
            {exam ? (
              <div className={styles.mediaWrap}>
                <DemoVideo
                  videoUrl="/videos/demo-video.mp4"
                  fallbackUrl="/images/demo-video.mp4"
                  poster="/images/demo-video.png"
                  alt={`Demo: ${exam} flow — select subject, launch test, and see explanations`}
                  controls={false}
                  autoplay={true}
                />
              </div>
            ) : (
              <div className={styles.mediaWrap}>
                <img
                  src="/images/hero.png"
                  alt="AI assistant helping a student with practice questions"
                  className={styles.illustrationImg}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
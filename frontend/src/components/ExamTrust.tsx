import React, { useEffect, useState } from "react";
import layout from "../styles/Layout.module.css";
import styles from "../styles/ExamLanding.module.css";
import DemoVideo from "./DemoVideo";
import SampleTest from "./SampleTest";
import Testimonials from "./Testimonials";

type Props = {
  exam?: "SAT" | "ACT" | string;
};

export default function ExamTrust({ exam = "" }: Props) {
  const examLabel = exam ? exam.toUpperCase() : "Exam";
  const [brandLogoFailed, setBrandLogoFailed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth <= 800);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const trustStat = {
    headline: "Trusted by thousands of students",
    sub: "Helping learners practice smarter with targeted explanations and realistic simulations.",
  };

  const subjectsByExam: Record<string, { subject: string; sample: string }[]> = {
    SAT: [
      { subject: "Math", sample: "Heart of Algebra, Problem Solving & Data Analysis, Passport to Advanced Math" },
      { subject: "Evidence‑Based Reading", sample: "Passage comprehension, inference, command-of-evidence" },
      { subject: "Writing & Language", sample: "Grammar, sentence structure, punctuation, rhetorical skills" },
    ],
    ACT: [
      { subject: "English", sample: "Grammar, usage, punctuation, organization and rhetoric" },
      { subject: "Math", sample: "Algebra, geometry, and basic trigonometry" },
      { subject: "Reading", sample: "Long passage comprehension and inference" },
      { subject: "Science Reasoning", sample: "Data interpretation, experimental design and analysis" },
    ],
  };

  const subjects = subjectsByExam[examLabel] || [
    { subject: "Math", sample: "Algebra, data, problem solving" },
    { subject: "Reading & Writing", sample: "Reading comprehension, grammar" },
  ];

  function openSampleModal() {
    window.dispatchEvent(new CustomEvent("open-sample-test", { detail: { exam: examLabel, pick: 5 } }));
  }

  function scrollToSample() {
    const el = document.getElementById("sample-test");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handlePreviewClick() {
    // Desktop/tablet: open modal for the full interactive sample
    // Mobile / small screens: play inline (set previewPlaying)
    if (isMobile) {
      setPreviewPlaying(true);
    } else {
      openSampleModal();
    }
  }

  function handlePreviewKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePreviewClick();
    }
  }

  return (
    <>
      {/* Trust / overview block immediately under hero */}
      <section className={styles.trustSection} aria-labelledby={`exam-${examLabel}-heading`}>
        <div className={layout.container}>
          <div className={styles.topRow}>
            <div className={styles.leftBlock}>
              <div className={styles.trustBadge}>
                <strong>{trustStat.headline}</strong>
                <p className={styles.trustSub}>{trustStat.sub}</p>
              </div>

              <div className={styles.quickActions}>
                <button className={styles.primaryCta} onClick={openSampleModal}>
                  Start a free diagnostic
                </button>
                <a className={styles.secondaryCta} href={`/#how-it-works`}>
                  How it works
                </a>
              </div>
            </div>

            <div className={styles.rightBlock}>
              <div className={styles.examLogosCompact}>
                <img
                  src={`/images/${examLabel.toLowerCase()}-logo.png`}
                  alt={`${examLabel} logo`}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>

              <div style={{ marginLeft: 12, opacity: 0.95 }}>
                {!brandLogoFailed ? (
                  <img
                    src="/images/logo.png"
                    alt="BrainiHi"
                    className={styles.brandLogo}
                    onError={() => setBrandLogoFailed(true)}
                  />
                ) : (
                  <span style={{ color: "#666", fontSize: "0.95rem", marginLeft: 6 }}>BrainiHi</span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.contentGridProminent} style={{ marginTop: 18 }}>
            <div className={styles.col}>
              <h3 className={styles.sectionTitle}>What we cover</h3>
              <ul className={styles.subjectList}>
                {subjects.map((s) => (
                  <li key={s.subject}>
                    <strong>{s.subject}</strong>
                    <div className={styles.subjectDesc}>{s.sample}</div>
                  </li>
                ))}
              </ul>

              <h4 className={styles.sectionTitle} style={{ marginTop: 14 }}>
                Difficulty levels
              </h4>
              <p className={styles.small}>
                We offer three difficulty tiers so students can progress from fundamentals to test-ready practice.
              </p>

              <ul className={styles.difficultyList}>
                <li>
                  <strong>Beginner:</strong> Core skills and single-step problems — ideal to build accuracy.
                </li>
                <li>
                  <strong>Intermediate:</strong> Multi-step problems and timing strategy — improve speed and consistency.
                </li>
                <li>
                  <strong>Advanced:</strong> High-difficulty items and full-section simulations — train endurance and advanced problem solving.
                </li>
              </ul>
            </div>

            {/* Center column: demo video + CTA */}
            <div className={styles.centerCol}>
              <h3 className={styles.sectionTitle}>Try the experience</h3>

              <p className={styles.small} style={{ marginBottom: 12 }}>
                Short demo and a five-question sample test let you see how explanations and feedback work.
              </p>

              <div style={{ marginBottom: 12 }}>
                {/* Center preview player: attempt muted autoplay (true) so it behaves like hero */}
                <DemoVideo
                  videoUrl="/videos/demo-video.mp4"
                  fallbackUrl="/images/demo-video.mp4"
                  poster="/images/demo-video.png"
                  alt={`Demo: ${examLabel} flow — select subject, launch test, see explanations`}
                  controls={isMobile}
                  autoplay={true}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <button className={styles.primaryCta} onClick={openSampleModal}>
                  Try the sample now
                </button>
                <button className={styles.secondaryCta} onClick={scrollToSample}>
                  See sample below
                </button>
              </div>

              <p className={styles.small}>
                The full interactive test opens in a modal so you can try it immediately — no sign-in required.
              </p>
            </div>

            {/* Right column: short credibility / CTA + poster preview image (clickable) */}
            <div className={styles.col}>
              <h3 className={styles.sectionTitle}>What students say</h3>
              <p className={styles.small} style={{ marginTop: 6 }}>
                Real students report faster progress and clearer understanding after using our targeted explanations and
                practice tests.
              </p>

              <div style={{ marginTop: 12 }}>
                <button className={styles.secondaryCta} onClick={() => scrollToSample()}>
                  Try the sample & read reviews
                </button>
              </div>

              <div className={styles.previewCard} style={{ marginTop: 18 }}>
                {previewPlaying ? (
                  // Inline playback for mobile / small screens
                  <div style={{ width: "100%", maxWidth: 340 }}>
                    <DemoVideo
                      videoUrl="/videos/demo-video.mp4"
                      fallbackUrl="/images/demo-video.mp4"
                      poster="/images/demo-video.png"
                      alt={`Demo inline: ${examLabel} preview`}
                      controls={true}
                      autoplay={true}
                    />
                  </div>
                ) : (
                  <img
                    src="/images/demo-video.png"
                    alt={`Demo preview: ${examLabel}`}
                    className={styles.previewImage}
                    loading="lazy"
                    role="button"
                    tabIndex={0}
                    onClick={handlePreviewClick}
                    onKeyDown={handlePreviewKeyDown}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                    style={{ cursor: "pointer" }}
                  />
                )}

                {!previewPlaying && (
                  <div className={styles.previewCaption}>
                    Demo: {examLabel} flow — select subject, launch test, see explanations — short preview of the test flow.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* canonical sample test section (rendered once) */}
      <section id="sample-test" style={{ paddingTop: 18, paddingBottom: 28 }}>
        <div className={layout.container}>
          <h3 className={styles.sectionTitle}>Sample test — try 5 quick questions</h3>
          <div style={{ marginTop: 10 }}>
            <SampleTest exam={examLabel} pick={5} />
          </div>
        </div>
      </section>

      {/* canonical testimonials section (rendered once, below sample test) */}
      <section style={{ paddingTop: 8, paddingBottom: 36 }}>
        <div className={layout.container}>
          <h3 className={styles.sectionTitle}>Student testimonials</h3>
          <div style={{ marginTop: 12 }}>
            <Testimonials />
          </div>
        </div>
      </section>
    </>
  );
}
import Head from "next/head";
import Header from "../components/Header";
// import Testimonials from "../components/Testimonials";
import FeatureGrid from "../components/About/FeatureGrid";
import ResponsiveMotion from "../components/ResponsiveMotion";
import styles from "../styles/AboutPage.module.css";
import layout from "../styles/Layout.module.css";

export default function About() {
  return (
    <>
      <Head>
        <title>Prepare for exams faster with AI — About BrainiHi</title>
        <meta
          name="description"
          content="Learn how BrainiHi helps students prepare for exams faster with AI-generated tests, instant explanations, and personalized practice."
        />
      </Head>

      <Header />

      <ResponsiveMotion as="main" className={styles.main} role="main" aria-labelledby="about-hero-heading">
        <div className={layout.container}>
          {/* Hero Section */}
          <section className={styles.hero} aria-label="About hero">
            <div className={styles.heroOverlay}>
              <h1 id="about-hero-heading" className={styles.heroHeader}>
                Prepare for exams faster with AI — BrainiHi
              </h1>
              <p className={styles.heroSubtext}>
                AI-generated practice tests, instant step-by-step explanations, and a personalized learning path to help you improve your scores and confidence.
              </p>
            </div>
            <div className={styles.heroBar} aria-hidden="true">
              <span className={styles.heroBarText}>About BrainiHi</span>
            </div>
          </section>

          {/* Breadcrumb */}
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <span>Home</span> <span aria-hidden="true">/</span> <span aria-current="page">About BrainiHi</span>
          </nav>

          {/* Feature Grid Section */}
          <FeatureGrid />

          {/* Our Mission Section */}
          <section className={styles.section} aria-labelledby="mission-heading">
            <h2 id="mission-heading" className={styles.sectionTitle}>Our Mission</h2>
            <p className={styles.sectionText}>
              At <strong>Brainihi.com</strong>, our mission is to make mathematics preparation accessible, intelligent, and personalized.
              We believe learning math shouldn’t feel overwhelming — our AI generates custom tests, provides instant explanations for mistakes, and creates a study path that adapts to each learner so they can improve steadily and efficiently.
            </p>
          </section>

          {/* How It Works Section */}
          <section className={styles.howItWorks} aria-labelledby="howitworks-heading" id="how-it-works">
            <h2 id="howitworks-heading" className={styles.sectionTitle}>How It Works</h2>
            <div className={styles.howGrid}>
              <div className={styles.howItem}>
                <img src="/images/how1.png" alt="Take a smart test" className={styles.howIcon} />
                <h3 className={styles.howHeader}>Take a Smart Test</h3>
                <p className={styles.howDesc}>Start a test tailored to your topic and level — every session generates fresh, relevant questions.</p>
              </div>
              <div className={styles.howItem}>
                <img src="/images/how2.png" alt="Get instant explanations" className={styles.howIcon} />
                <h3 className={styles.howHeader}>Get Instant Explanations</h3>
                <p className={styles.howDesc}>Review clear, step-by-step reasoning after each question so mistakes become learning opportunities.</p>
              </div>
              <div className={styles.howItem}>
                <img src="/images/how3.png" alt="Track progress" className={styles.howIcon} />
                <h3 className={styles.howHeader}>Track & Improve</h3>
                <p className={styles.howDesc}>Monitor your progress with visual reports and targeted recommendations to focus study time where it matters most.</p>
              </div>
            </div>
          </section>

          {/* Our Story Section */}
          <section className={styles.section} aria-labelledby="story-heading">
            <h2 id="story-heading" className={styles.sectionTitle}>Our Story</h2>
            <p className={styles.sectionText}>
              The idea for <strong>Brainihi.com</strong> began with a simple goal — help students learn math more effectively. Our team of educators and AI researchers built a platform that combines proven teaching techniques with intelligent automation so learners get practice that fits their needs.
            </p>
          </section>

          {/* PAYPAL ONBOARDING: exact text (verbatim) */}
          <section className={styles.section} aria-labelledby="paypal-onboarding-heading" id="paypal-onboarding">
            <h2 id="paypal-onboarding-heading" className={styles.sectionTitle}>Business description (for PayPal onboarding)</h2>
            <div className={styles.sectionText} style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, borderRadius: 6, border: "1px solid #eee" }}>
BrainiHi is an online educational platform that provides AI-powered practice tests,
step-by-step explanations, and personalized learning tools.

Users purchase subscription-based access to digital features delivered electronically.
No physical goods are shipped. The service is intended for educational purposes only.
            </div>
          </section>

          {/* Testimonials Section */}
          <section className={styles.testimonialSection} aria-labelledby="testimonials-heading">
            {/* <h2 id="testimonials-heading" className={styles.sectionTitle}>Loved by Students Everywhere</h2> */}
            {/* <Testimonials /> */}
          </section>
        </div>
      </ResponsiveMotion>
    </>
  );
}
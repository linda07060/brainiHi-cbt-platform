import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Pricing from "../components/Pricing";
import CTABanner from "../components/CTABanner";
import ExamTrust from "../components/ExamTrust";
import layout from "../styles/Layout.module.css";

export default function SATPage(): JSX.Element {
  return (
    <>
      <Head>
        <title>SAT Prep with AI — BrainiHi</title>
        <meta
          name="description"
          content="Prepare for the SAT with AI-generated practice tests, timed section simulations, instant step-by-step explanations, and a personalized study plan."
        />
      </Head>

      <Header />

      <main aria-labelledby="sat-hero-heading">
        {/* Hero with SAT prop — will show demo video in hero on SAT page */}
        <Hero exam="SAT" />

        <div className={layout.container}>
          {/* Trust block (subjects + difficulty) directly under hero */}
          <ExamTrust exam="SAT" />

          {/* Core features block (Everything you need) */}
          <Features />

          {/* NOTE: removed duplicated SampleSection here to avoid rendering the sample test & testimonials twice.
              The sample/testimonials are displayed from the single canonical component (ExamTrust or SampleSection).
              If you prefer them after Features instead, move the SampleSection import/use back here and remove from ExamTrust. */}

          <section style={{ marginTop: 36 }}>
            <h2>Recommended for SAT test-takers</h2>
            <p>
              Choose Pro or Tutor plans for SAT-focused modules, full practice tests, and unlimited explanations. Our study plans adapt to your strengths and show which question types to prioritize.
            </p>
          </section>

          <Pricing />
        </div>

        <CTABanner />
      </main>

      <Footer />
    </>
  );
}
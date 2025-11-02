import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Pricing from "../components/Pricing";
import CTABanner from "../components/CTABanner";
import ExamTrust from "../components/ExamTrust";
import layout from "../styles/Layout.module.css";

export default function ACTPage(): JSX.Element {
  return (
    <>
      <Head>
        <title>ACT Prep with AI — BrainiHi</title>
        <meta
          name="description"
          content="Master the ACT with AI-powered practice: timed section simulations, instant explanations, strategy tips, and a personalized study plan built for the ACT format."
        />
      </Head>

      <Header />

      <main aria-labelledby="act-hero-heading">
        {/* Hero with ACT prop — will show demo video in hero on ACT page */}
        <Hero exam="ACT" />

        <div className={layout.container}>
          {/* Trust block (subjects + difficulty) directly under hero */}
          <ExamTrust exam="ACT" />

          {/* Core features block (Everything you need) */}
          <Features />

          {/* NOTE: removed duplicated SampleSection here to avoid rendering the sample test & testimonials twice.
              The sample/testimonials are displayed from the single canonical component (ExamTrust or SampleSection).
              If you prefer them after Features instead, move the SampleSection import/use back here and remove from ExamTrust. */}

          <section style={{ marginTop: 36 }}>
            <h2>Recommended for ACT test-takers</h2>
            <p>
              Pro and Tutor plans include ACT-specific modules, full practice tests, and deeper analytics so you can optimize study time and track progress.
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
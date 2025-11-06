import Head from "next/head";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Pricing from "../components/Pricing";
import CTABanner from "../components/CTABanner";
import ExamTrust from "../components/ExamTrust";
import layout from "../styles/Layout.module.css";

// AI transparency / legal components
import LegalDisclaimer from "../components/LegalDisclaimer";
import AITransparency from "../components/AITransparency";

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

          <section style={{ marginTop: 36 }}>
            <h2>Recommended for SAT test-takers</h2>
            <p>
              Choose Pro or Tutor plans for SAT-focused modules, full practice tests, and unlimited explanations. Our study plans adapt to your strengths and show which question types to prioritize.
            </p>
          </section>

          <Pricing />

          {/* AI transparency and legal disclaimer — placed near pricing/signup to maximize visibility */}
          <AITransparency />
          <LegalDisclaimer />
        </div>

        <CTABanner />
      </main>
    </>
  );
}
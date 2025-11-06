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

          <section style={{ marginTop: 36 }}>
            <h2>Recommended for ACT test-takers</h2>
            <p>
              Pro and Tutor plans include ACT-specific modules, full practice tests, and deeper analytics so you can optimize study time and track progress.
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
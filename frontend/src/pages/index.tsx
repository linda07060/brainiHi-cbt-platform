import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import ForwardThinkingPrograms from "../components/ForwardThinkingPrograms";
import HowItWorks from "../components/HowItWorks";
import ExamCenters from "../components/ExamCenters";
import Testimonials from "../components/Testimonials";
import Pricing from "../components/Pricing";
import CTABanner from "../components/CTABanner";
import Footer from "../components/Footer";
import WelcomeModal from "../components/WelcomeModal";
import ResponsiveMotion from "../components/ResponsiveMotion"; // <-- Import the wrapper

export default function Home() {
  return (
    <>
      <WelcomeModal />
      <Header />
      <ResponsiveMotion as="main">
        <Hero />
        <Features />
        <ForwardThinkingPrograms />
        <HowItWorks />
        <ExamCenters />
        <Testimonials />
        <Pricing />
        <CTABanner />
      </ResponsiveMotion>
      <Footer />
    </>
  );
}
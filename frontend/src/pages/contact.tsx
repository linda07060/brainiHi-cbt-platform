import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactInfo from "../components/Contact/ContactInfo";
import ContactForm from "../components/Contact/ContactForm";
import ContactFAQ from "../components/Contact/ContactFAQ";
import ContactCTA from "../components/Contact/ContactCTA";
import { motion } from "framer-motion";
import styles from "../styles/ContactPage.module.css";
import layout from "../styles/Layout.module.css";

export default function Contact() {
  return (
    <>
      <Header />
      <motion.main
        className={styles.main}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.39, 0.58, 0.57, 1] }}
      >
        <div className={layout.container}>
          {/* Hero / Banner */}
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Prepare for exams faster with AI — BrainiHi</h1>
              <p className={styles.heroSubtitle}>
                Have questions about our AI-powered math prep platform? We’re here to help.
              </p>
            </div>
          </section>

          {/* Contact Info */}
          <ContactInfo />

          {/* Contact Form */}
          <ContactForm />

          {/* FAQ */}
          <ContactFAQ />

          {/* CTA */}
          <ContactCTA />
        </div>
      </motion.main>
      <Footer />
    </>
  );
}
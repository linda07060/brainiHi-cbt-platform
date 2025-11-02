import React from "react";
import styles from "../../styles/ContactFAQ.module.css";

const faqs = [
  {
    q: "How do I create a test?",
    a: "Log in, choose a subject and topic, then click “Generate Test.” The AI will generate a short diagnostic or full practice test instantly.",
  },
  {
    q: "Is the platform free to use?",
    a: "Core features are free. Premium plans unlock advanced analytics, additional practice items, and priority support.",
  },
  {
    q: "How do I get support?",
    a: "Use the contact form on our Contact page or email support@brainihi.com for help with accounts, billing, or technical issues.",
  },
  {
    q: "Can teachers use BrainiHi?",
    a: "Yes — we offer educator tools for classroom management, group assignments, and shared reporting.",
  },
];

export default function ContactFAQ(): JSX.Element {
  return (
    <section className={styles.faqSection} aria-labelledby="faq-heading">
      <div className={styles.container}>
        <h2 id="faq-heading" className={styles.faqTitle}>
          Quick help & FAQ
        </h2>

        <p className={styles.lead}>
          Short answers to common questions. Click any question to reveal a concise response.
        </p>

        <div className={styles.faqGrid}>
          {faqs.map((item, idx) => (
            <details className={styles.faqItem} key={idx} role="group" tabIndex={-1}>
              <summary className={styles.faqQ} aria-expanded="false">
                {item.q}
                <span className={styles.caret} aria-hidden="true">▸</span>
              </summary>
              <div className={styles.faqA} aria-hidden="true">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
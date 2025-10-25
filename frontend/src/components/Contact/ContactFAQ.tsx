import styles from "../../styles/ContactFAQ.module.css";

const faqs = [
  {
    q: "How do I create a test?",
    a: "Log in, select a topic, and click “Generate Test.” The AI will create one instantly.",
  },
  {
    q: "Is the platform free to use?",
    a: "Yes, core features are free. Premium options provide advanced analytics and extra questions.",
  },
  {
    q: "How do I get support?",
    a: "You can use this contact page to reach us, or email support@brainihi.com.",
  },
  {
    q: "Can teachers use Brainihi.com?",
    a: "Absolutely! We offer educator tools for classroom and group management.",
  },
];

export default function ContactFAQ() {
  return (
    <section className={styles.faqSection}>
      <h2 className={styles.faqTitle}>Quick Help & FAQ</h2>
      <div className={styles.faqGrid}>
        {faqs.map((item, idx) => (
          <div className={styles.faqItem} key={idx}>
            <h4 className={styles.faqQ}>{item.q}</h4>
            <p className={styles.faqA}>{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
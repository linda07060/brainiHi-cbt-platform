import { useState } from "react";
import styles from "../../styles/ContactForm.module.css";

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "General Inquiry",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Here you would handle sending the form data via API/email service
  };

  return (
    <section className={styles.formSection}>
      <h2 className={styles.formTitle}>Send Us a Message</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            required
            className={styles.input}
          />
        </div>
        <div className={styles.row}>
          <select
            name="subject"
            value={form.subject}
            onChange={handleChange}
            className={styles.input}
            required
          >
            <option>General Inquiry</option>
            <option>Support</option>
            <option>Feedback</option>
            <option>Partnership</option>
          </select>
        </div>
        <div className={styles.row}>
          <textarea
            name="message"
            placeholder="Your message"
            value={form.message}
            onChange={handleChange}
            required
            rows={5}
            className={styles.textarea}
          />
        </div>
        <div className={styles.row}>
          <button type="submit" className={styles.button}>
            Send Message
          </button>
        </div>
        {submitted && (
          <div className={styles.confirmation}>
            Thank you! We’ll get back to you soon.
          </div>
        )}
      </form>
    </section>
  );
}
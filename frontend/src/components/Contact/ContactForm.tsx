import React, { useState } from "react";
import styles from "../../styles/ContactForm.module.css";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string; // honeypot
};

export default function ContactForm(): JSX.Element {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: "General Inquiry",
    message: "",
    website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Please enter a valid email address.";
    if (!form.message.trim() || form.message.trim().length < 8) e.message = "Please provide a brief message (8+ characters).";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    // honeypot check - bots often fill hidden fields
    if (form.website && form.website.trim()) {
      // silent drop
      return;
    }

    if (!validate()) {
      setStatus({ type: "error", text: "Please fix the highlighted fields." });
      return;
    }

    setSubmitting(true);
    try {
      // TODO: replace with your real API call
      // await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });

      // Simulate network
      await new Promise((res) => setTimeout(res, 700));

      setStatus({ type: "success", text: "Thanks — we received your message and will reply within 24–48 hours." });
      setForm({ name: "", email: "", subject: "General Inquiry", message: "", website: "" });
      setErrors({});
    } catch (err) {
      setStatus({ type: "error", text: "Unable to send message. Please try again later." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.formSection} aria-labelledby="contact-heading">
      <div className={styles.card}>
        <h2 id="contact-heading" className={styles.formTitle}>Send us a message</h2>
        <p className={styles.lead}>Quick responses for account, billing and technical help.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* honeypot */}
          <label className={styles.honeypotLabel} htmlFor="website">Leave this field empty</label>
          <input id="website" name="website" type="text" value={form.website} onChange={handleChange} className={styles.honeypot} autoComplete="off" tabIndex={-1} aria-hidden="true" />

          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>Full name</label>
            <input id="name" name="name" type="text" className={`${styles.input} ${errors.name ? styles.invalid : ""}`} placeholder="Your full name" value={form.name} onChange={handleChange} required aria-required="true" aria-invalid={!!errors.name} disabled={submitting} />
            {errors.name && <div className={styles.fieldError}>{errors.name}</div>}
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email address</label>
            <input id="email" name="email" type="email" className={`${styles.input} ${errors.email ? styles.invalid : ""}`} placeholder="you@school.edu" value={form.email} onChange={handleChange} required aria-required="true" aria-invalid={!!errors.email} disabled={submitting} />
            {errors.email && <div className={styles.fieldError}>{errors.email}</div>}
          </div>

          <div className={styles.field}>
            <label htmlFor="subject" className={styles.label}>Subject</label>
            <select id="subject" name="subject" className={styles.select} value={form.subject} onChange={handleChange} disabled={submitting}>
              <option>General Inquiry</option>
              <option>Support</option>
              <option>Billing</option>
              <option>Partnership</option>
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="message" className={styles.label}>Message</label>
            <textarea id="message" name="message" className={`${styles.textarea} ${errors.message ? styles.invalid : ""}`} placeholder="How can we help?" value={form.message} onChange={handleChange} rows={6} required aria-required="true" aria-invalid={!!errors.message} disabled={submitting} />
            {errors.message && <div className={styles.fieldError}>{errors.message}</div>}
          </div>

          <div className={styles.controls}>
            <button type="submit" className={styles.button} disabled={submitting} aria-disabled={submitting}>
              {submitting ? "Sending…" : "Send message"}
            </button>
          </div>

          <div role="status" aria-live="polite" className={styles.feedback}>
            {status && status.type === "success" && <div className={styles.confirmation}>{status.text}</div>}
            {status && status.type === "error" && <div className={styles.error}>{status.text}</div>}
          </div>
        </form>
      </div>
    </section>
  );
}
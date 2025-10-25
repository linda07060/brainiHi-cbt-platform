import Link from "next/link";
import styles from "../styles/Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.brand}>
        <img
          src="/images/logo.png"
          alt="Brainihi Logo"
          className={styles.logo}
        />
        <span className={styles.brandText}>Brainihi CBT Platform</span>
        <p className={styles.desc}>
          Smarter, faster exam mastery—powered by AI.
        </p>
      </div>
      <div className={styles.links}>
        <Link href="/" className={styles.link}>Home</Link>
        <Link href="/login" className={styles.link}>CBT Portal</Link>
        <Link href="/about" className={styles.link}>About Us</Link>
        <Link href="/contact" className={styles.link}>Contact Us</Link>
      </div>
      <div className={styles.social}>
        <a href="https://linkedin.com/" target="_blank" rel="noopener" className={styles.socialIcon} aria-label="LinkedIn">
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="24" fill="#FDB913"/><path d="M15.75 19.5H20.25V21.06H20.34C21.03 19.95 22.32 19.26 23.82 19.26C27.03 19.26 27.75 21.18 27.75 24.03V29.25H23.25V24.84C23.25 23.55 23.22 21.9 21.45 21.9C19.65 21.9 19.5 23.25 19.5 24.93V29.25H15.75V19.5ZM13.5 16.5C12.26 16.5 11.25 15.49 11.25 14.25C11.25 13.01 12.26 12 13.5 12C14.74 12 15.75 13.01 15.75 14.25C15.75 15.49 14.74 16.5 13.5 16.5ZM13.5 19.5H17.25V29.25H13.5V19.5ZM32.25 19.5H28.5V29.25H32.25V19.5Z" fill="#861f41"/></svg>
        </a>
        <a href="https://twitter.com/" target="_blank" rel="noopener" className={styles.socialIcon} aria-label="Twitter">
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="24" fill="#FDB913"/><path d="M37 17.5C36.17 17.85 35.27 18.08 34.33 18.17C35.29 17.63 36.03 16.77 36.37 15.73C35.47 16.22 34.46 16.57 33.37 16.77C32.53 15.87 31.31 15.25 30 15.25C27.24 15.25 25.1 17.52 25.7 20.23C21.99 20.05 18.7 18.38 16.36 15.89C15.5 17.16 15.86 18.84 17.22 19.73C16.45 19.7 15.73 19.48 15.11 19.12V19.18C15.11 21.42 16.69 23.4 18.87 23.82C18.19 23.99 17.46 24.02 16.75 23.89C17.37 25.83 19.11 27.18 21.18 27.22C19.52 28.42 17.44 29.08 15.25 29C17.34 30.29 19.78 31 22.36 31C30 31 34.45 24.21 34.45 18.03C34.45 17.78 34.44 17.54 34.43 17.3C35.34 16.67 36.1 15.86 36.7 14.97L37 17.5Z" fill="#861f41"/></svg>
        </a>
        <a href="https://youtube.com/" target="_blank" rel="noopener" className={styles.socialIcon} aria-label="YouTube">
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="24" fill="#FDB913"/><path d="M33.94 18.27A3.3 3.3 0 0 0 31.61 16.1C29.27 15.5 24 15.5 24 15.5s-5.27 0-7.61.6a3.3 3.3 0 0 0-2.33 2.17C13.5 19.73 13.5 24 13.5 24s0 4.27.56 5.73a3.3 3.3 0 0 0 2.33 2.17c2.34.6 7.61.6 7.61.6s5.27 0 7.61-.6a3.3 3.3 0 0 0 2.33-2.17c.56-1.46.56-5.73.56-5.73s0-4.27-.56-5.73ZM21.75 27.02v-6.04l5.5 3.02-5.5 3.02Z" fill="#861f41"/></svg>
        </a>
      </div>
      <div className={styles.copy}>
        &copy; {new Date().getFullYear()} Brainihi CBT Platform. All rights reserved.
      </div>
    </footer>
  );
}
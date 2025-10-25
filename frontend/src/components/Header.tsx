import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "../styles/Header.module.css";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on resize for UX
  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("resize", closeMenu);
    return () => window.removeEventListener("resize", closeMenu);
  }, []);

  return (
    <header className={styles.header + (scrolled ? " " + styles.scrolled : "")}>
      <div className={styles.logoArea}>
        <Link href="/" className={styles.logoLink}>
          <img
            src="/images/logo.png"
            alt="Brainihi Logo"
            className={styles.logo}
          />
        </Link>
        <span className={styles.brand}>BrainiHi CBT Platform</span>
      </div>
      <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} id="navbar">
        <Link href="/" className={styles.link} onClick={() => setMenuOpen(false)}>Home</Link>
        <Link href="/login" className={styles.link} onClick={() => setMenuOpen(false)}>CBT Portal</Link>
        <Link href="/about" className={styles.link} onClick={() => setMenuOpen(false)}>About Us</Link>
        <Link href="/contact" className={styles.link} onClick={() => setMenuOpen(false)}>Contact Us</Link>
        <a href="/login" className={styles.ctaBtn} onClick={() => setMenuOpen(false)}>Get Started</a>
      </nav>
      <button
        className={styles.hamburger}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="navbar"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>
      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}
    </header>
  );
}
import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "../styles/Header.module.css";
import layout from "../styles/Layout.module.css";
// ensure modal is available globally
import SampleTestModal from "./SampleTestModal";

export default function Header(): JSX.Element {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize for UX
  useEffect(() => {
    const onResize = () => setMenuOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function openSampleModal(exam?: string) {
    // if exam provided we open that exam directly, otherwise prompt selector
    window.dispatchEvent(new CustomEvent("open-sample-test", { detail: { exam: exam ? exam.toUpperCase() : undefined, pick: 5 } }));
    setMenuOpen(false);
  }

  return (
    <>
      <header
        className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}
        role="banner"
      >
        <div className={layout.contentInner}>
          <div className={styles.headerRow}>
            {/* LEFT: Logo + Brand */}
            <div className={styles.left}>
              <Link href="/" className={styles.logoLink} aria-label="Brainihi home">
                <img src="/images/logo.png" alt="Brainihi logo" className={styles.logo} />
              </Link>
              <div className={styles.brandWrap}>
                <Link href="/" className={styles.brandLink}>
                  <span className={styles.brandMain}>Prepare for exams faster</span>
                  <span className={styles.brandSub}>with AI — BrainiHi</span>
                </Link>
              </div>
            </div>

            {/* CENTER: Primary navigation (desktop) */}
            <nav className={styles.center} role="navigation" aria-label="Primary">
              <ul className={styles.navList}>
                <li><Link href="/" className={styles.navItem}>Home</Link></li>
                <li><Link href="/sat" className={styles.navItem}>SAT Prep</Link></li>
                <li><Link href="/act" className={styles.navItem}>ACT Prep</Link></li>
                <li><Link href="/login" className={styles.navItem}>CBT Portal</Link></li>
                <li><Link href="/about" className={styles.navItem}>About Us</Link></li>
                <li><Link href="/contact" className={styles.navItem}>Contact Us</Link></li>
              </ul>
            </nav>

            {/* RIGHT: CTA + Hamburger */}
            <div className={styles.right}>
              {/* Primary CTA now triggers the sample-test modal */}
              <button
                className={styles.ctaBtn}
                onClick={() => openSampleModal()} // no exam specified -> prompt exam selector in modal
                aria-label="Take a free test"
              >
                Take a free test
              </button>

              <button
                className={`${styles.hamburger} ${menuOpen ? styles.isOpen : ""}`}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                onClick={() => setMenuOpen((s) => !s)}
                type="button"
              >
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav panel */}
        <div
          id="mobile-menu"
          className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ""}`}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.mobileNavInner}>
            {/* Close button (top-right) */}
            <button
              className={styles.mobileClose}
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              {/* simple X icon (SVG) */}
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M4 4L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <ul className={styles.mobileNavList}>
              <li><Link href="/" className={styles.mobileNavItem} onClick={() => setMenuOpen(false)}>Home</Link></li>
              <li><Link href="/sat" className={styles.mobileNavItem} onClick={() => setMenuOpen(false)}>SAT Prep</Link></li>
              <li><Link href="/act" className={styles.mobileNavItem} onClick={() => setMenuOpen(false)}>ACT Prep</Link></li>
              <li><Link href="/login" className={styles.mobileNavItem} onClick={() => setMenuOpen(false)}>CBT Portal</Link></li>
              <li><Link href="/about" className={styles.mobileNavItem} onClick={() => setMenuOpen(false)}>About Us</Link></li>
              <li><Link href="/contact" className={styles.mobileNavItem} onClick={() => setMenuOpen(false)}>Contact Us</Link></li>
            </ul>

            <div className={styles.mobileActions}>
              {/* Provide take-free-test button also in mobile panel */}
              <button
                className={styles.mobileRegister}
                onClick={() => { openSampleModal(); }}
                aria-label="Take a free test"
              >
                Take a free test
              </button>

              <Link href="/register" className={styles.mobileRegister} onClick={() => setMenuOpen(false)}>Create account</Link>
              <Link href="/login" className={styles.mobileLogin} onClick={() => setMenuOpen(false)}>Sign in</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mount the modal globally so header/hero CTAs work anywhere */}
      <SampleTestModal />
    </>
  );
}
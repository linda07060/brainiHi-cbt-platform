import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import styles from "../styles/Header.module.css";
import layout from "../styles/Layout.module.css";
import SampleTestModal from "./SampleTestModal";

/**
 * Header (updated)
 * - deterministic server+client date formatting (no Intl variations)
 * - keeps all hooks at top-level and avoids conditional hooks
 * - accessibility improvements preserved
 */

export default function Header(): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const NAV = [
    { href: "/", label: "Home" },
    { href: "/sat", label: "SAT Prep" },
    { href: "/act", label: "ACT Prep" },
    { href: "/login", label: "CBT Portal" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ];

  // Deterministic date string constructed from name lists so server & client render exactly the same text.
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January","February","March","April","May","June","July","August","September","October","November","December"
  ];
  const d = new Date();
  const weekday = weekdays[d.getDay()];
  const day = d.getDate(); // numeric day (no leading zero)
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  // Use space-separated format (avoids locale-specific punctuation differences)
  const today = `${weekday} ${day} ${month} ${year}`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    if (menuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
      // focus first mobile link for accessibility (no ref on Link)
      setTimeout(() => {
        const el = document.querySelector<HTMLAnchorElement>(".mobileNavLink");
        el?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 960 && menuOpen) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [menuOpen]);

  function openSampleModal() {
    window.dispatchEvent(new CustomEvent("open-sample-test", { detail: { pick: 5 } }));
    setMenuOpen(false);
  }

  return (
    <>
      <header className={styles.header} role="banner">
        {/* Top utility row */}
        <div className={styles.topBar}>
          <div className={layout.contentInner + " " + styles.topInner}>
            <div className={styles.topLeft}>{today}</div>
            <div className={styles.topRight}>
              <Link href="/login" className={styles.topLink}>Sign in</Link>
              <span className={styles.topDivider}>|</span>
              <Link href="/register" className={styles.topLink}>Join</Link>
              <span className={styles.topDivider}>|</span>
              <Link href="/contact" className={styles.topLink}>Advertise</Link>
            </div>
          </div>
        </div>

        {/* Main header: logo (left), optional banner/CTA (right) */}
        <div className={styles.mainHeader}>
          <div className={layout.contentInner + " " + styles.mainInner}>
            <div className={styles.logoArea}>
              <Link href="/" className={styles.logoLink} aria-label="BrainiHi home">
                <Image src="/images/logo.png" alt="BrainiHi" width={56} height={56} />
              </Link>
              <div className={styles.logoText}>
                <Link href="/" className={styles.siteTitleLink}>
                  <span className={styles.siteTitle}>BrainiHi</span>
                  <span className={styles.siteTag}> with AI — Prepare for exams faster</span>
                </Link>
              </div>
            </div>

            <div className={styles.headerRight}>
              <div className={styles.promo}>
                <span className={styles.promoLabel}>Featured</span>
                <button className={styles.promoCta} onClick={openSampleModal}>Try a free test</button>
              </div>
            </div>
          </div>
        </div>

        {/* Primary nav bar — full width colored background similar to NewsMag */}
        <div className={styles.navBar} role="navigation" aria-label="Primary">
          <div className={layout.contentInner + " " + styles.navInner}>
            <ul className={styles.navList}>
              {NAV.map((item) => (
                <li key={item.href} className={styles.navItem}>
                  <Link
                    href={item.href}
                    className={styles.navLink}
                    aria-current={router.pathname === item.href ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* search + mobile hamburger */}
            <div className={styles.navControls}>
              <button className={styles.searchBtn} aria-label="Search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <button
                className={styles.mobileToggle}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((s) => !s)}
              >
                <span className={styles.hamburgerBar} />
                <span className={styles.hamburgerBar} />
                <span className={styles.hamburgerBar} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile off-canvas panel (same links + actions) */}
        <div className={`${styles.mobilePanel} ${menuOpen ? styles.open : ""}`} role="dialog" aria-modal="true" aria-hidden={!menuOpen}>
          <div className={styles.mobileInner}>
            <div className={styles.mobileHeader}>
              <Link href="/" className={styles.mobileLogo} onClick={() => setMenuOpen(false)}>
                <Image src="/images/logo.png" alt="BrainiHi" width={40} height={40} />
              </Link>
              <button className={styles.mobileClose} onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
            </div>

            <ul className={styles.mobileNav}>
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className={styles.mobileActions}>
              <button className={styles.mobileCta} onClick={openSampleModal}>Take a free test</button>
              <Link href="/register" className={styles.mobileSecondary} onClick={() => setMenuOpen(false)}>Create account</Link>
              <Link href="/login" className={styles.mobileSecondary} onClick={() => setMenuOpen(false)}>Sign in</Link>
            </div>
          </div>
        </div>

        {/* backdrop */}
        <div className={`${styles.backdrop} ${menuOpen ? styles.backdropVisible : ""}`} onClick={() => setMenuOpen(false)} aria-hidden={!menuOpen} />
      </header>

      {/* keep modal mounted */}
      <SampleTestModal />
    </>
  );
}
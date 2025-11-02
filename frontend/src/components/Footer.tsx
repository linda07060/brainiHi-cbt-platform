import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Footer.module.css";

/**
 * Improved Footer with robust anchor scrolling:
 * - Uses MutationObserver + interval retries until target element appears.
 * - Honors sticky header offset (detects common header selectors).
 * - "Contact" links to /contact (page).
 *
 * Ensure your home page contains an element with id="testimonials".
 */

export default function Footer(): JSX.Element {
  const router = useRouter();

  const footerLinks = [
    { label: "Home", href: "/" },
    { label: "SAT Prep", href: "/sat" },
    { label: "ACT Prep", href: "/act" },
    { label: "CBT Portal", href: "/login" },
    { label: "Register", href: "/register" },
    { label: "Pricing", href: "/pricing" },
  ];

  const resources = [
    { label: "How it works", href: "/#how-it-works", anchor: "how-it-works" },
    { label: "Features", href: "/#features", anchor: "features" },
    { label: "Testimonials", href: "/#testimonials", anchor: "testimonials" },
    { label: "FAQ", href: "/#faq", anchor: "faq" },
    { label: "Contact Us", href: "/contact", anchor: undefined },
  ];

  // compute header height if present to offset the scroll
  function getHeaderOffset(): number {
    try {
      const header =
        document.querySelector(".site-header") ||
        document.querySelector("header") ||
        document.querySelector(".topbar") ||
        document.querySelector(".navbar");
      if (header instanceof HTMLElement) {
        const rect = header.getBoundingClientRect();
        return Math.max(0, rect.height);
      }
    } catch (err) {
      // ignore
    }
    return 0;
  }

  function scrollToElementWithOffset(el: Element) {
    const headerOffset = getHeaderOffset();
    const rect = el.getBoundingClientRect();
    const absoluteTop = rect.top + window.pageYOffset;
    const targetY = Math.max(0, absoluteTop - headerOffset - 8); // 8px breathing room
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }

  function tryScrollToId(id: string): boolean {
    if (!id) return false;
    const el = document.getElementById(id) || document.querySelector(`[data-section="${id}"]`);
    if (el) {
      scrollToElementWithOffset(el);
      // update hash without creating extra history entry
      if (window && window.history) {
        window.history.replaceState({}, "", `#${id}`);
      }
      return true;
    }
    return false;
  }

  // Wait until element appears using MutationObserver + interval fallback
  function waitForAndScroll(id: string, timeout = 6000): Promise<boolean> {
    return new Promise((resolve) => {
      if (!id) return resolve(false);

      if (tryScrollToId(id)) return resolve(true);

      let finished = false;
      const obs = new MutationObserver(() => {
        if (tryScrollToId(id)) {
          finished = true;
          obs.disconnect();
          cleanup();
          resolve(true);
        }
      });

      const start = Date.now();
      const checkInterval = 150;
      const intervalId = window.setInterval(() => {
        if (finished) return;
        if (tryScrollToId(id)) {
          finished = true;
          obs.disconnect();
          cleanup();
          resolve(true);
        } else if (Date.now() - start > timeout) {
          cleanup();
          resolve(false);
        }
      }, checkInterval);

      function cleanup() {
        window.clearInterval(intervalId);
        try {
          obs.disconnect();
        } catch (e) {}
      }

      // observe DOM for additions (subtree = true)
      obs.observe(document.body, { childList: true, subtree: true });

      // also listen for a custom event that some components can emit when ready
      const onReady = (e: Event) => {
        try {
          // if event detail matches our id, attempt immediate scroll
          const detail = (e as CustomEvent).detail;
          if (!detail || detail === id) {
            if (tryScrollToId(id)) {
              cleanup();
              window.removeEventListener("section-ready", onReady as EventListener);
              resolve(true);
            }
          }
        } catch {}
      };
      window.addEventListener("section-ready", onReady as EventListener);
    });
  }

  async function handleAnchorClick(e: React.MouseEvent, anchorId?: string, href?: string) {
    // If no anchor id, do nothing — let Link handle page navigation
    if (!anchorId) return;

    e.preventDefault();

    // If already on homepage, try immediate scroll then wait if needed
    if (router.pathname === "/") {
      if (tryScrollToId(anchorId)) return;
      await waitForAndScroll(anchorId);
      return;
    }

    // Not on home: navigate to home with hash, then wait and scroll when the element appears
    const onComplete = async () => {
      // small allow time for the DOM to mount; waitForAndScroll will keep trying
      await waitForAndScroll(anchorId);
      router.events.off("routeChangeComplete", onComplete);
    };

    router.events.on("routeChangeComplete", onComplete);
    // Use push to add entry to history; include hash so URL shows anchor
    router
      .push(href || `/#${anchorId}`)
      .catch(() => {
        router.events.off("routeChangeComplete", onComplete);
      });
  }

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.accent} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.columns}>
          <div className={styles.col}>
            <h3 className={styles.colHeading}>Tools</h3>
            <ul className={styles.linkList}>
              {footerLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={styles.link}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h3 className={styles.colHeading}>Resources</h3>
            <ul className={styles.linkList}>
              {resources.map((r) => (
                <li key={r.href}>
                  {r.anchor ? (
                    <a href={r.href} className={styles.link} onClick={(e) => handleAnchorClick(e, r.anchor, r.href)}>
                      {r.label}
                    </a>
                  ) : (
                    <Link href={r.href} className={styles.link}>
                      {r.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.brandCol} aria-labelledby="footer-brand-heading">
            <div className={styles.brandInner}>
              <img src="/images/logo.png" alt="BrainiHi logo" className={styles.brandLogo} />
              <div className={styles.brandText}>
                <h4 id="footer-brand-heading" className={styles.brandTitle}>BrainiHi</h4>
                <p className={styles.address}>
                  BrainiHi • AI Exam Preparation<br />
                  123 Learning Ave, Suite 100<br />
                  Your City, State 12345<br />
                  <a href="tel:+1234567890" className={styles.contactLink}>+777 69222‑999</a><br />
                  <a href="mailto:support@brainihi.com" className={styles.contactLink}>support@brainihi.com</a>
                </p>

                <p className={styles.quickLinks}>
                  <Link href="/privacy" className={styles.link}>Privacy</Link>
                  <span className={styles.dot}>•</span>
                  <Link href="/terms" className={styles.link}>Terms</Link>
                  <span className={styles.dot}>•</span>
                  <Link href="/safety" className={styles.link}>Safety</Link>
                </p>

                <div className={styles.social}>
                  <a href="https://twitter.com/" aria-label="Twitter" className={styles.socialIcon} target="_blank" rel="noreferrer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 5.92c-.63.28-1.3.47-2.01.56a3.5 3.5 0 0 0-6 2.01c0 .27.03.54.09.8A9.94 9.94 0 0 1 3 5.14a3.5 3.5 0 0 0 1.08 4.68c-.52 0-1.02-.16-1.45-.4v.04c0 1.7 1.21 3.12 2.83 3.45a3.5 3.5 0 0 1-1.44.06c.41 1.28 1.6 2.21 3.01 2.24A7.02 7.02 0 0 1 2 18.58 9.95 9.95 0 0 0 8.29 20c6.03 0 9.34-5 9.34-9.34v-.43c.64-.46 1.19-1.03 1.62-1.67-.58.25-1.2.42-1.85.5z" fill="currentColor"/></svg>
                  </a>
                  <a href="https://facebook.com/" aria-label="Facebook" className={styles.socialIcon} target="_blank" rel="noreferrer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.5 9.87v-6.99H7.9v-2.88h2.6V9.35c0-2.57 1.53-3.99 3.88-3.99 1.12 0 2.3.2 2.3.2v2.53h-1.3c-1.28 0-1.67.79-1.67 1.6v1.92h2.84l-.45 2.88h-2.39V21.9A10 10 0 0 0 22 12z" fill="currentColor"/></svg>
                  </a>
                  <a href="https://youtube.com/" aria-label="YouTube" className={styles.socialIcon} target="_blank" rel="noreferrer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M23 7.2s-.2-1.6-.8-2.3c-.8-.9-1.7-.9-2.1-1C16.6 3 12 3 12 3s-4.6 0-7.9.9c-.4.1-1.4.1-2.1 1C1.2 5.6 1 7.2 1 7.2S0.8 9 0.8 10.9V13c0 1.9.2 3.7.2 3.7s.2 1.6.8 2.3c.8.9 1.9.9 2.4 1 1.8.2 7.5.9 7.5.9s4.6 0 7.9-.9c.4-.1 1.4-.1 2.1-1 .6-.7.8-2.3.8-2.3s.2-1.9.2-3.7V10.9c0-1.9-.2-3.7-.2-3.7zM9.8 15.6V8.4l6 3.6-6 3.6z" fill="currentColor"/></svg>
                  </a>
                  <a href="https://instagram.com/" aria-label="Instagram" className={styles.socialIcon} target="_blank" rel="noreferrer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5.9a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2zm6.5-1.6a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9.1a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8z" fill="currentColor"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>&copy; {new Date().getFullYear()} BrainiHi. All rights reserved.</p>
          <p className={styles.legal}>
            <Link href="/privacy" className={styles.link}>Privacy</Link>
            <span className={styles.dot}>•</span>
            <Link href="/terms" className={styles.link}>Terms</Link>
            <span className={styles.dot}>•</span>
            <Link href="/sitemap" className={styles.link}>Sitemap</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
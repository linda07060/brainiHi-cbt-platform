import React, { useEffect, useState } from "react";
import styles from "../styles/CookieConsent.module.css";

type Consent = {
  analytics?: boolean;
  marketing?: boolean;
  timestamp?: string;
};

const STORAGE_KEY = "brainihi_cookie_consent_v1";

export default function CookieConsent(): JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setConsent(JSON.parse(raw));
      } else {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function save(c: Consent) {
    const withTs = { ...c, timestamp: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withTs));
      setConsent(withTs);
      setVisible(false);
      // Broadcast consent so analytics initialization code can listen
      window.dispatchEvent(new CustomEvent("cookie-consent", { detail: withTs }));
    } catch (err) {
      console.error("Could not save cookie consent", err);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className={styles.inner}>
        <div className={styles.copyBlock}>
          <strong>We use cookies to improve your experience</strong>
          <p className={styles.copy}>
            Essential cookies are required. Allow analytics to help us improve product flows. You can change settings anytime.
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.buttonOutline} onClick={() => save({ analytics: false, marketing: false })}>
            Accept essentials only
          </button>

          <button
            className={styles.buttonPrimary}
            onClick={() => save({ analytics: true, marketing: true })}
          >
            Accept all
          </button>

          <button className={styles.manage} onClick={() => {
            // Optional: open a settings modal — for now show basic alert
            alert("Open cookie settings (implement modal)");
          }}>
            Customize
          </button>
        </div>
      </div>
    </div>
  );
}
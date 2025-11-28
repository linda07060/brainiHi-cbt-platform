import React, { useEffect, useState } from "react";
import styles from "../styles/CookieConsent.module.css";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";

type Consent = {
  analytics?: boolean;
  marketing?: boolean;
  timestamp?: string;
};

const STORAGE_KEY = "brainihi_cookie_consent_v1";

export default function CookieConsent(): JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState<Consent | null>(null);

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
      try {
        window.dispatchEvent(new CustomEvent("cookie-consent", { detail: withTs }));
      } catch (err) {
        // ignore
      }
    } catch (err) {
      console.error("Could not save cookie consent", err);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <>
      <div className={styles.banner} role="dialog" aria-live="polite" aria-label="Cookie consent">
        <div className={styles.inner}>
          <div className={styles.copyBlock}>
            <strong>We use cookies to improve your experience</strong>
            <p className={styles.copy}>
              Essential cookies are required. Allow analytics to help us improve product flows. You can change settings anytime.
            </p>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.buttonOutline}
              onClick={() => {
                // Reject non-essential cookies (analytics = false, marketing = false)
                save({ analytics: false, marketing: false });
              }}
            >
              Reject non‑essential
            </button>

            <button
              className={styles.buttonPrimary}
              onClick={() => {
                // Accept all (analytics + marketing)
                save({ analytics: true, marketing: true });
              }}
            >
              Accept all
            </button>

            <button
              className={styles.manage}
              onClick={() => {
                // open customize modal
                setDraft({ analytics: consent?.analytics ?? false, marketing: consent?.marketing ?? false });
                setCustomOpen(true);
              }}
            >
              Customize
            </button>
          </div>
        </div>
      </div>

      <Dialog open={customOpen} onClose={() => setCustomOpen(false)} aria-labelledby="cookie-customize-title">
        <DialogTitle id="cookie-customize-title">Cookie preferences</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Switch
                checked={!!(draft?.analytics)}
                onChange={(e) => setDraft((d) => ({ ...(d ?? {}), analytics: e.target.checked }))}
                name="analytics"
                color="primary"
              />
            }
            label="Analytics cookies (e.g. Google Analytics)"
          />
          <p style={{ marginTop: 8, color: "#666" }}>
            Analytics cookies help us understand usage and improve learning features. They are off until you accept them.
          </p>

          <FormControlLabel
            control={
              <Switch
                checked={!!(draft?.marketing)}
                onChange={(e) => setDraft((d) => ({ ...(d ?? {}), marketing: e.target.checked }))}
                name="marketing"
                color="primary"
              />
            }
            label="Marketing cookies"
          />
          <p style={{ marginTop: 8, color: "#666" }}>
            Marketing cookies are optional and used for product updates and offers.
          </p>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCustomOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              // Save draft (ensures timestamp added)
              save({ analytics: !!draft?.analytics, marketing: !!draft?.marketing });
              setCustomOpen(false);
            }}
            variant="contained"
          >
            Save preferences
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
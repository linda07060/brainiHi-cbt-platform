import React, { useEffect, useState } from "react";
import styles from "../styles/Preloader.module.css";

interface PreloaderProps {
  /**
   * Controlled mode:
   *  - open = true  => show immediately
   *  - open = false => fade then hide
   *
   * Uncontrolled (legacy) mode: omit `open` and component will show on mount
   * and fade after fadeDelay, removed after fadeDelay + fadeDuration.
   */
  open?: boolean;
  fadeDelay?: number; // ms until fade starts (default 2500)
  fadeDuration?: number; // ms fade duration (default 800)
  maxLifetime?: number; // ms maximum time to keep spinner visible (safety fallback). default 10000
}

export default function Preloader({
  open,
  fadeDelay = 2500,
  fadeDuration = 800,
  maxLifetime = 10000,
}: PreloaderProps) {
  const [show, setShow] = useState<boolean>(open ?? true);
  const [fade, setFade] = useState<boolean>(false);

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;
    let removeTimer: ReturnType<typeof setTimeout> | null = null;
    let maxLifetimeTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (fadeTimer) {
        clearTimeout(fadeTimer);
        fadeTimer = null;
      }
      if (removeTimer) {
        clearTimeout(removeTimer);
        removeTimer = null;
      }
      if (maxLifetimeTimer) {
        clearTimeout(maxLifetimeTimer);
        maxLifetimeTimer = null;
      }
    };

    const scheduleFadeThenRemove = (delay: number, duration: number) => {
      fadeTimer = setTimeout(() => {
        setFade(true);
        removeTimer = setTimeout(() => {
          setShow(false);
        }, duration);
      }, delay);
    };

    // Safety fallback: ensure the spinner unmounts after maxLifetime even if caller forgets.
    const scheduleMaxLifetime = (lifetime: number) => {
      // don't schedule if lifetime <= 0
      if (lifetime > 0) {
        maxLifetimeTimer = setTimeout(() => {
          // Start fade if not yet fading, then remove after fadeDuration
          setFade(true);
          setTimeout(() => setShow(false), fadeDuration);
          // also log to console so developers can see this fallback happened
          // eslint-disable-next-line no-console
          console.warn("Preloader: maxLifetime exceeded, forcing hide.");
        }, lifetime);
      }
    };

    // Controlled mode
    if (typeof open === "boolean") {
      clearTimers();
      if (open) {
        setShow(true);
        setFade(false);
        // schedule safety auto-hide in case open never becomes false
        scheduleMaxLifetime(maxLifetime);
      } else {
        // We were asked to close: run fade -> remove
        setFade(false);
        // short tick to ensure DOM updated then fade
        scheduleFadeThenRemove(0, fadeDuration);
        scheduleMaxLifetime(maxLifetime);
      }
    } else {
      // Uncontrolled: show on mount then fade after fadeDelay and remove after fadeDelay+fadeDuration
      if (show) {
        scheduleFadeThenRemove(fadeDelay, fadeDuration);
        scheduleMaxLifetime(maxLifetime);
      }
    }

    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fadeDelay, fadeDuration, maxLifetime]);

  if (!show) return null;

  return (
    <div
      className={`${styles.overlay} ${fade ? styles.fadeOut : ""}`}
      aria-hidden={false}
      aria-live="polite"
    >
      <div className={styles.inner}>
        <div className={styles.spinner} role="status" aria-label="Loading" />
        <span className={styles.visuallyHidden}>Loading…</span>
      </div>
    </div>
  );
}
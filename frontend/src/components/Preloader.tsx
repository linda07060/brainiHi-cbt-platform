import { useEffect, useState } from "react";
import styles from "../styles/Preloader.module.css";

export default function Preloader() {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Start fade out after 2.5s
    const fadeTimer = setTimeout(() => setFade(true), 2500);
    // Remove preloader after fade-out (0.8s)
    const removeTimer = setTimeout(() => setShow(false), 3300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div className={`${styles.overlay} ${fade ? styles.fadeOut : ""}`}>
      <img src="/images/logo.png" alt="Brainihi Logo" className={styles.logo} />
    </div>
  );
}
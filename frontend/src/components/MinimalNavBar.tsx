import Link from "next/link";
import styles from "../styles/NavBar.module.css";
import { useState } from "react";

export default function MinimalNavBar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>CBT Platform</div>
      <button
        className={styles.menuToggle}
        aria-label="Toggle navigation"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={open ? styles.burgerOpen : styles.burger} />
      </button>
      <div className={`${styles.links} ${open ? styles.linksOpen : ""}`}>
        <Link href="/" onClick={() => setOpen(false)}>Home</Link>
        <Link href="/login" className={styles.cta} onClick={() => setOpen(false)}>CBT Portal</Link>
        <Link href="/about" onClick={() => setOpen(false)}>About Us</Link>
        <Link href="/contact" onClick={() => setOpen(false)}>Contact Us</Link>
      </div>
    </nav>
  );
}
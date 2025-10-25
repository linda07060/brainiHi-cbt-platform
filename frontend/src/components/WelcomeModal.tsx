import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/WelcomeModal.module.css";

export default function WelcomeModal() {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Close"
        >×</button>
        <div className={styles.content}>
          <div className={styles.left}>
            <h2 className={styles.heading}>
              <span className={styles.italic}>HERE FOR YOUR SUCCESS</span>
            </h2>
            <div className={styles.underline} />
            <p className={styles.desc}>
              Brainihi gives you the tools you need to achieve academic success in the USA. Click below to visit our platform and start your learning journey today.
            </p>
            <div className={styles.ctaGroup}>
              <button
                className={styles.cta}
                onClick={() => { setOpen(false); router.push("/"); }}
              >
                VISIT WEBSITE <span className={styles.arrow}>→</span>
              </button>
              <button
                className={styles.cta}
                onClick={() => { setOpen(false); router.push("/login"); }}
              >
                VISIT CBT PORTAL <span className={styles.arrow}>→</span>
              </button>
            </div>
          </div>
          <div className={styles.right}>
            <img
              src="/images/popup-student.png"
              alt="Student using computer"
              className={styles.popupImg}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
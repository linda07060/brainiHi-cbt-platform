import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/WelcomeModal.module.css";

export default function WelcomeModal() {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  // Helper to close modal and navigate only when target differs from current path.
  const closeAndNavigate = async (path: string) => {
    // Close first to remove modal and restore scroll behavior immediately.
    setOpen(false);

    // If the requested path is the same as the current pathname, avoid router.push which
    // may re-run route-related lifecycle and unintentionally remount the page/component.
    if (router.pathname === path || router.asPath.split("?")[0] === path) {
      // Optional: bring user to top of page so they can see homepage content (smooth UX).
      try {
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch {
        // ignore
      }
      return;
    }

    try {
      // Navigate for different routes as before
      await router.push(path);
    } catch {
      // ignore navigation errors, modal is already closed
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          ×
        </button>
        <div className={styles.content}>
          <div className={styles.left}>
            <h2 className={styles.heading}>Prepare for exams faster with AI</h2>
            <div className={styles.underline} />
            <p className={styles.desc}>
              BrainiHi gives you AI-powered tools to practice smarter, understand mistakes, and raise your scores. Click below to start practicing.
            </p>
            <div className={styles.ctaGroup}>
              <button
                className={styles.cta}
                onClick={() => {
                  // Close and navigate to homepage only if it's a different route;
                  // otherwise simply close and scroll to top (prevents blink).
                  closeAndNavigate("/");
                }}
              >
                VISIT WEBSITE <span className={styles.arrow}>→</span>
              </button>
              <button
                className={styles.cta}
                onClick={() => {
                  // For CBT portal, navigation is to a different route so previous behavior is retained.
                  closeAndNavigate("/login");
                }}
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
import React, { useEffect, useState } from "react";
import styles from "../styles/ExamLanding.module.css";
import SampleTest from "./SampleTest";

/**
 * SampleTestModal
 * - Listens for window "open-sample-test" custom event.
 * - If event.detail.exam is provided: show that exam's sample.
 * - If no exam provided: show a compact selector first, then load the sample.
 *
 * Emits:
 * - sample_modal_open (when modal opens / selector shows)
 *
 * Dispatch example:
 * window.dispatchEvent(new CustomEvent("open-sample-test", { detail: { exam: "SAT", pick: 5 } }));
 */

type OpenDetail = {
  exam?: string;
  pick?: number;
};

function safePushAnalytics(eventName: string, payload: any) {
  try {
    if (typeof (window as any).dataLayer !== "undefined") {
      (window as any).dataLayer.push({ event: eventName, ...payload });
    } else if (typeof (window as any).gtag !== "undefined") {
      (window as any).gtag("event", eventName, payload);
    } else {
      // console.log("analytics:", eventName, payload);
    }
  } catch (e) {
    // ignore
  }
}

export default function SampleTestModal(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [exam, setExam] = useState<string | null>(null);
  const [pick, setPick] = useState<number>(5);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    function handle(e: Event) {
      const ev = e as CustomEvent<OpenDetail>;
      const detail = ev?.detail || {};
      const incomingExam = detail.exam ? String(detail.exam).toUpperCase() : null;
      const incomingPick = typeof detail.pick === "number" ? detail.pick : 5;

      setPick(incomingPick);

      if (incomingExam) {
        setExam(incomingExam);
        setShowSelector(false);
      } else {
        setExam(null);
        setShowSelector(true);
      }

      setOpen(true);
      document.body.style.overflow = "hidden";

      safePushAnalytics("sample_modal_open", {
        exam: incomingExam || "selector",
        pick: incomingPick,
        timestamp: new Date().toISOString(),
      });
    }

    window.addEventListener("open-sample-test", handle as EventListener);
    return () => window.removeEventListener("open-sample-test", handle as EventListener);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
      }
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    setShowSelector(false);
    setExam(null);
    document.body.style.overflow = "";
  }

  function chooseExam(eName: string) {
    const upper = eName.toUpperCase();
    setExam(upper);
    setShowSelector(false);

    safePushAnalytics("sample_modal_choose_exam", { exam: upper, pick, timestamp: new Date().toISOString() });
  }

  if (!open) return <></>;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Sample test">
      <div className={styles.modalContent} /* animated via CSS */>
        <button className={styles.modalClose} onClick={close} aria-label="Close sample test">
          ×
        </button>

        {showSelector && (
          <div>
            <h3 style={{ marginTop: 2 }}>Try a free sample test</h3>
            <p style={{ color: "#666", marginTop: 6 }}>
              Pick the exam you'd like to try — each sample is {pick} randomized questions with explanations.
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              <button
                className={styles.primaryCta}
                onClick={() => chooseExam("SAT")}
                aria-label="Try SAT sample"
              >
                SAT — Try {pick} questions
              </button>

              <button
                className={styles.primaryCta}
                onClick={() => chooseExam("ACT")}
                aria-label="Try ACT sample"
              >
                ACT — Try {pick} questions
              </button>

              <button
                type="button"
                className={styles.secondaryCta}
                onClick={() => {
                  safePushAnalytics("sample_modal_selector_secondary", { action: "register_cta", timestamp: new Date().toISOString() });
                  window.location.href = "/register";
                }}
              >
                Create account
              </button>
            </div>
          </div>
        )}

        {!showSelector && exam && (
          <>
            <h3 style={{ marginTop: 2 }}>Sample test — {exam.toUpperCase()}</h3>
            <div style={{ marginTop: 8, color: "#666" }}>
              Try {pick} randomized questions. Explanations are shown after you submit.
            </div>

            <div className={styles.modalBody} style={{ marginTop: 12 }}>
              <SampleTest exam={exam} pick={pick} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
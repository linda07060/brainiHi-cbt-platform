import React, { useEffect, useState } from "react";
import styles from "../styles/ExamLanding.module.css";
import QUESTION_BANK from "../data/question-bank.json";

/**
 * SampleTest (client-populated)
 * - Avoids generating randomized questions during SSR to prevent hydration mismatch.
 * - Generates the randomized set on client mount or when 'seed' changes.
 * - Emits analytics: sample_shown (when set is presented) and sample_completed (on submit).
 */

type Question = {
  id: string;
  exam: "SAT" | "ACT" | "GEN";
  q: string;
  options: string[];
  correctIndex: number;
  shortExplanation: string;
  fullExplanation: string;
  topic?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
};

const shuffle = <T,>(arr: T[]) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function safePushAnalytics(eventName: string, payload: any) {
  try {
    if (typeof (window as any).dataLayer !== "undefined") {
      (window as any).dataLayer.push({ event: eventName, ...payload });
    } else if (typeof (window as any).gtag !== "undefined") {
      (window as any).gtag("event", eventName, payload);
    } else if (typeof (window as any).mixpanel !== "undefined") {
      (window as any).mixpanel.track(eventName, payload);
    } else {
      // console.log("analytics:", eventName, payload);
    }
  } catch (e) {
    // ignore analytics errors
  }
}

export default function SampleTest({
  exam = "SAT",
  pick = 5,
}: {
  exam?: "SAT" | "ACT" | string;
  pick?: number;
}) {
  const examKey = (exam || "SAT").toUpperCase();

  // filter pool synchronously (safe on server)
  const pool: Question[] = (QUESTION_BANK as Question[]).filter(
    (q) => q.exam === examKey || q.exam === "GEN"
  );

  // Client-only state for randomized questions
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [seed, setSeed] = useState(0);

  // Generate randomized set on the client only
  useEffect(() => {
    // run only in browser
    const makeRandomSet = () => {
      const shuffled = shuffle(pool);
      return shuffled.slice(0, Math.min(pick, shuffled.length));
    };

    // small tick to ensure we run after hydration
    const qset = makeRandomSet();
    setQuestions(qset);
    setAnswers({});
    setSubmitted(false);

    // Analytics: sample_shown when user is presented a set (client-side)
    safePushAnalytics("sample_shown", {
      exam: examKey,
      source: "static_pool",
      pick: Math.min(pick, pool.length),
      poolSize: pool.length,
      seed,
      timestamp: new Date().toISOString(),
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, examKey]);

  function select(qid: string, idx: number) {
    setAnswers((s) => ({ ...s, [qid]: idx }));
  }

  function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setSubmitted(true);

    if (!questions) return;

    const score = questions.reduce((acc, q) => acc + ((answers[q.id] === q.correctIndex) ? 1 : 0), 0);

    safePushAnalytics("sample_completed", {
      exam: examKey,
      source: "static_pool",
      pick: questions.length,
      score,
      poolSize: pool.length,
      timestamp: new Date().toISOString(),
    });
  }

  function tryAnother() {
    setSeed((s) => s + 1);
  }

  // While client is preparing questions, show a lightweight placeholder (matches server)
  if (!questions) {
    return (
      <div className={styles.sampleTest}>
        <div style={{ padding: 12, color: "#666" }}>Loading sample test…</div>
      </div>
    );
  }

  const score = submitted
    ? questions.reduce((acc, q) => acc + ((answers[q.id] === q.correctIndex) ? 1 : 0), 0)
    : null;

  const poolShortage = pool.length < pick;

  return (
    <div className={styles.sampleTest} aria-live="polite">
      {poolShortage && (
        <div style={{ marginBottom: 8, color: "#a23" }}>
          Note: not enough questions in the pool for {examKey}. Showing all available.
        </div>
      )}

      <form onSubmit={onSubmit}>
        {questions.map((q, i) => {
          const userAnswer = answers[q.id] ?? null;
          const isCorrect = submitted && userAnswer === q.correctIndex;
          return (
            <fieldset key={q.id} className={styles.questionBlock}>
              <legend className={styles.questionTitle}>
                <strong>{i + 1}.</strong> {q.q}
              </legend>

              <div className={styles.options}>
                {q.options.map((opt, idx) => (
                  <label key={idx} className={styles.optionLabel}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={userAnswer === idx}
                      onChange={() => select(q.id, idx)}
                      aria-checked={userAnswer === idx}
                      aria-label={`Option ${idx + 1}: ${opt}`}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>

              {submitted && (
                <div className={styles.explanation} aria-live="polite">
                  <div>
                    <strong>Result: </strong>
                    {isCorrect ? (
                      <span className={styles.correct}>Correct ✔</span>
                    ) : (
                      <span className={styles.incorrect}>Incorrect ✖</span>
                    )}
                  </div>

                  <p className={styles.shortExplanation}>
                    <strong>Quick explanation:</strong> {q.shortExplanation}
                  </p>

                  {!isCorrect && (
                    <div style={{ marginTop: 8 }}>
                      <details>
                        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Full explanation</summary>
                        <div style={{ marginTop: 8, color: "#333" }}>{q.fullExplanation}</div>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </fieldset>
          );
        })}

        <div className={styles.sampleFooter}>
          <button className={styles.runBtn} type="submit" aria-label="Submit sample answers">
            Submit answers
          </button>

          <button
            type="button"
            onClick={tryAnother}
            style={{
              marginLeft: 8,
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.06)",
              padding: "8px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
            aria-label="Try another set of sample questions"
          >
            Try another set
          </button>

          {submitted && (
            <div className={styles.score} style={{ marginLeft: "auto" }}>
              Score: {score} / {questions.length}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
export type QuestionItem = {
  question_id: string;
  question_text: string;
  choices: string[];
  correct_answer: string;
  explanation: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  topic: string;
  estimated_time_seconds: number;
  [k: string]: any;
};

/**
 * Validate that an object conforms to the strict question schema.
 * Returns null on success, or an error message on failure.
 */
export function validateQuestionSchema(obj: any): string | null {
  if (!obj || typeof obj !== "object") return "Not an object";
  if (typeof obj.question_id !== "string" || obj.question_id.trim() === "") return "missing question_id";
  if (typeof obj.question_text !== "string" || obj.question_text.trim() === "") return "missing question_text";
  if (!Array.isArray(obj.choices) || obj.choices.length < 2) return "choices must be an array of at least 2 strings";
  if (!obj.choices.every((c: any) => typeof c === "string")) return "each choice must be a string";
  if (typeof obj.correct_answer !== "string" || obj.correct_answer.trim() === "") return "missing correct_answer";
  if (!obj.choices.includes(obj.correct_answer)) return "correct_answer must exactly match one entry in choices";
  if (typeof obj.explanation !== "string") return "explanation must be a string";
  if (!["beginner", "intermediate", "advanced"].includes(obj.difficulty)) return "difficulty must be one of beginner|intermediate|advanced";
  if (typeof obj.topic !== "string" || obj.topic.trim() === "") return "missing topic";
  if (typeof obj.estimated_time_seconds !== "number" || obj.estimated_time_seconds <= 0) return "estimated_time_seconds must be a positive number";
  return null;
}

/**
 * Normalizes text for lightweight duplicate checking
 */
export function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Simple duplicate detection:
 * - Exact normalized text match
 * - or any existing choice identical
 *
 * This is intentionally simple for the frontend; server-side plagiarism detection should be stronger.
 */
export function isDuplicateQuestion(newQ: QuestionItem, existing: QuestionItem[]): boolean {
  const n = normalizeText(newQ.question_text);
  for (const ex of existing) {
    if (normalizeText(ex.question_text) === n) return true;
    // check duplicate identical choice sets
    const exChoices = (ex.choices || []).map(normalizeText).join("|");
    const newChoices = (newQ.choices || []).map(normalizeText).join("|");
    if (exChoices === newChoices) return true;
  }
  return false;
}

/**
 * Log model call (stored in localStorage). If you have a backend endpoint /api/ai/logs, POST it there too.
 */
export async function logModelCall(entry: {
  prompt: string;
  model?: string;
  modelParameters?: Record<string, any>;
  response?: any;
  timestamp?: string;
}) {
  const e = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    prompt: entry.prompt,
    model: entry.model ?? null,
    modelParameters: entry.modelParameters ?? null,
    response: entry.response ?? null
  };
  try {
    const key = "ai_prompt_logs";
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(e);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // ignore storage errors
  }

  // optional: POST to backend if available
  try {
    await fetch("/api/ai/logs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(e),
    });
  } catch {
    // ignore network errors (backend optional)
  }
}

/**
 * Export question array to JSON or CSV and trigger download
 */
export function exportQuestions(questions: QuestionItem[], format: "json" | "csv" = "json", filename = "questions_export") {
  if (!Array.isArray(questions)) return;
  if (format === "json") {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // CSV (simple)
  const headers = ["question_id", "question_text", "choices", "correct_answer", "explanation", "difficulty", "topic", "estimated_time_seconds"];
  const rows = questions.map((q) => {
    const safe = (val: any) => {
      if (val == null) return "";
      const s = typeof val === "string" ? val : JSON.stringify(val);
      return `"${s.replace(/"/g, '""')}"`;
    };
    return [
      safe(q.question_id),
      safe(q.question_text),
      safe((q.choices || []).join(" | ")),
      safe(q.correct_answer),
      safe(q.explanation),
      safe(q.difficulty),
      safe(q.topic),
      safe(q.estimated_time_seconds),
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
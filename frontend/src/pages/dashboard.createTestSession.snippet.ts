// Small, compile-safe snippet demonstrating how createTestSession can receive values
// from the TopicDifficultyModal (or other UI). This file is intentionally non-invasive:
// - exports typed placeholders that won't break the TypeScript compiler
// - includes an example function you can copy into your Dashboard component
// Remove this file if you prefer to keep examples out of /src/pages.

/**
 * Placeholders (safe defaults) — replace/consume these from your modal in real code.
 * Exported so other dev code can import these placeholders if needed for examples/tests.
 */
export const selectedQuestionCount: number | undefined = undefined;
export const useExplanations: boolean = false;

/**
 * Snack type shared by components: includes 'warning' so callers can set warning messages.
 */
export type SnackSeverity = 'success' | 'info' | 'warning' | 'error';
export type Snack = { severity: SnackSeverity; message: string } | null;

/**
 * Example helper (copy into your Dashboard component and adapt there).
 * This is only an example and is not executed automatically by importing this file.
 *
 * Example usage (inside Dashboard component):
 *   await createTestSession(
 *     topicFromModal,
 *     difficultyFromModal,
 *     selectedQuestionCountFromModal,
 *     useExplanationsFromModal,
 *     token,
 *     router,
 *     setSnack,
 *     setStarting,
 *     setUsage
 *   );
 */
export async function createTestSessionExample(params: {
  topic: string;
  difficulty: string;
  questionCount?: number;
  useExplanations?: boolean;
  token?: string | null;
  router?: any;
  setSnack?: (v: Snack) => void;
  setStarting?: (b: boolean) => void;
  setUsage?: (u: any) => void;
}) {
  const {
    topic,
    difficulty,
    questionCount,
    useExplanations,
    token,
    router,
    setSnack,
    setStarting,
    setUsage,
  } = params;

  // Guard: require token
  if (!token) {
    // In your app you might navigate to login or show a message
    if (router?.push) router.push?.('/login');
    return;
  }

  // client-side preflight example (adapt to your app's logic)
  const maxQ = 30; // example; replace with effectiveUsage?.limits?.questionCount
  if (typeof questionCount === 'number' && questionCount > maxQ) {
    setSnack?.({ severity: 'info', message: `Your plan allows up to ${maxQ} questions per test.` });
    return;
  }

  setStarting?.(true);
  setSnack?.(null);

  try {
    const body: any = { topic, difficulty };
    if (typeof questionCount === 'number') body.questionCount = questionCount;
    if (typeof useExplanations === 'boolean') body.useExplanations = useExplanations;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tests/create-from-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data?.warning) {
      setSnack?.({ severity: 'warning', message: data.warning });
    }

    const sessionId = data?.sessionId || data?.id;
    if (sessionId) {
      // refresh usage if you want (call your ai/usage endpoint)
      setUsage?.(undefined); // replace with actual usage refresh
      router?.push?.(`/test/session/${sessionId}`);
    } else {
      setSnack?.({ severity: 'info', message: 'Test created — open Tests to view your session.' });
      router?.push?.('/tests');
    }
  } catch (err: any) {
    setSnack?.({ severity: 'error', message: err?.message || 'Unable to start test' });
    // eslint-disable-next-line no-console
    console.error('createTestSessionExample error', err);
  } finally {
    setStarting?.(false);
  }
}
// add just after successful submit handling (where you call setSnack or router.replace)
// notify dashboard to reload
try {
  window.dispatchEvent(new CustomEvent('tests-changed', { detail: { id: resultId ?? null } }));
} catch {}
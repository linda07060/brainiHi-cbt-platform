import { useEffect, useState } from "react";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <button
      aria-label="Toggle dark mode"
      style={{
        marginLeft: 16,
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 20,
        color: "var(--primary)"
      }}
      onClick={() => setDark((d) => !d)}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
}
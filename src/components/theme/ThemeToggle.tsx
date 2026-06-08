"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

/** Sun/moon theme toggle. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={
        className ??
        "flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft transition-colors hover:bg-[var(--color-hover)]"
      }
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

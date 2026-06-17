"use client";

import { Sun, Moon, Sparkles } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";

// Icon + label for each theme; the button cycles light → dark → vivid.
const META: Record<Theme, { icon: typeof Sun; label: string; next: string }> = {
  light: { icon: Sun, label: "Light", next: "dark" },
  dark: { icon: Moon, label: "Dark", next: "vivid" },
  vivid: { icon: Sparkles, label: "Vivid", next: "light" },
};

/** Theme toggle — cycles light → dark → vivid. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const { icon: Icon, label, next } = META[theme];
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Theme: ${label}. Switch to ${next} mode`}
      title={`${label} — click for ${next}`}
      className={
        className ??
        "flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft transition-colors hover:bg-[var(--color-hover)]"
      }
    >
      <Icon size={15} />
    </button>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Light/dark are value modes; vivid is the opt-in high-color skin (its own
// mode, applied via data-theme on <html> — mutually exclusive with dark).
export type Theme = "light" | "dark" | "vivid";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export const THEME_STORAGE_KEY = "theme";

// Cycle order for the single toggle button.
const ORDER: Theme[] = ["light", "dark", "vivid"];

/** Apply a theme to <html>: `.dark` class for dark, `data-theme="vivid"` for
 * vivid. Kept in sync with the pre-paint no-flash script in layout.tsx. */
function applyTheme(t: Theme) {
  const el = document.documentElement;
  el.classList.toggle("dark", t === "dark");
  if (t === "vivid") el.setAttribute("data-theme", "vivid");
  else el.removeAttribute("data-theme");
}

function readTheme(): Theme {
  const el = document.documentElement;
  if (el.getAttribute("data-theme") === "vivid") return "vivid";
  if (el.classList.contains("dark")) return "dark";
  return "light";
}

/**
 * Lightweight theme provider (no next-themes). The class/attribute on <html> is
 * set pre-paint by the inline script in layout.tsx; this mirrors that into React
 * state and handles cycling (light → dark → vivid) + persistence.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // Mirror the theme the no-flash script already applied.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mirror of the pre-paint theme
    setTheme(readTheme());
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length];
      applyTheme(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // storage unavailable — theme still applies for this session
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

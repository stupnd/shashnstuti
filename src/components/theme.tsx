"use client";

import { useEffect, useState, type ReactNode } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme-script";
import { Icon } from "./icons";

export type Theme = "light" | "dark";

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#16121c" : "#fff8ef");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyTheme(readTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      } catch {
        /* ignore */
      }
      applyTheme(mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return children;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeState(readTheme());
    setReady(true);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyTheme(next);
  }

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return { theme, setTheme, toggle, ready };
}

/** Cute sun/moon sticker button. */
export function ThemeToggle({ className = "", label }: { className?: string; label?: boolean }) {
  const { theme, toggle, ready } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "light mode" : "dark mode"}
      className={
        label
          ? `btn btn-soft h-11 gap-2 rounded-full px-4 ${className}`
          : `btn btn-ghost h-11 w-11 rounded-full p-0 ${className}`
      }
    >
      <span key={theme} className="theme-spin inline-flex">
        <Icon name={ready && dark ? "sun" : "moon"} size={20} strokeWidth={2} />
      </span>
      {label && <span className="text-sm font-semibold">{ready && dark ? "lights on" : "lights out"}</span>}
    </button>
  );
}

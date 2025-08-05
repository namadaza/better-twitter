"use client";

import { useTheme } from "@/lib/theme-context";
import { Theme } from "@/lib/types";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          // Cycle through themes: light -> dark -> system -> light
          const themes: Theme[] = ["light", "dark", "system"];
          const currentIndex = themes.indexOf(theme);
          const nextIndex = (currentIndex + 1) % themes.length;
          handleThemeChange(themes[nextIndex]);
        }}
        className="flex items-center space-x-2 px-3 py-2 rounded-full bg-card hover:bg-accent transition-colors duration-200 border border-border"
        title={`Current theme: ${theme}. Click to cycle.`}
      >
        <div className="w-4 h-4">
          {theme === "light" && (
            <svg
              className="w-full h-full text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          )}
          {theme === "dark" && (
            <svg
              className="w-full h-full text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          {theme === "system" && (
            <svg
              className="w-full h-full text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          )}
        </div>
        <span className="text-sm font-medium text-foreground capitalize">
          {theme}
        </span>
      </button>
    </div>
  );
}

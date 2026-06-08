"use client";

import { SunMedium, MoonStar, Monitor } from "lucide-react";

import { useTheme } from "@/lib/theme-context";
import { Theme } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={() => {
        // Cycle through themes: light -> dark -> system -> light
        const themes: Theme[] = ["light", "dark", "system"];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        handleThemeChange(themes[nextIndex]);
      }}
      title={`Current theme: ${theme}. Click to cycle.`}
    >
      <div className="w-4 h-4">
        {theme === "light" && <SunMedium className="size-4" />}
        {theme === "dark" && <MoonStar className="size-4" />}
        {theme === "system" && <Monitor className="size-4" />}
      </div>
      <span className="text-sm font-medium capitalize">{theme}</span>
    </Button>
  );
}

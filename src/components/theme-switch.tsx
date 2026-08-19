import { FC, useCallback } from "react";
import clsx from "clsx";

import { SunFilledIcon, MoonFilledIcon } from "@/components/icons";
import { useSiteStore } from "@/lib/siteStore";

export interface ThemeSwitchProps {
  className?: string;
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({ className }) => {
  const appearance = useSiteStore((s) => s.appearance);
  const setColorScheme = useSiteStore((s) => s.setColorScheme);

  const theme = appearance?.colorScheme || "dark";
  const isLight = theme === "light";

  const toggleTheme = useCallback(() => {
    setColorScheme?.(isLight ? "dark" : "light");
  }, [isLight, setColorScheme]);

  return (
    <button
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      className={clsx(
        "px-px transition-opacity hover:opacity-80 cursor-pointer",
        "inline-flex items-center justify-center",
        "w-auto h-auto bg-transparent border-none rounded-lg",
        className,
      )}
      type="button"
      onClick={toggleTheme}
    >
      {isLight ? <MoonFilledIcon size={22} /> : <SunFilledIcon size={22} />}
    </button>
  );
};

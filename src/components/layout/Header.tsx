"use client";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui";

export default function Header({ onMenu }: { onMenu: () => void }) {
  const toggleTheme = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };
  const iconBtn =
    "relative rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink";
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        onClick={onMenu}
        aria-label="Open menu"
        className={iconBtn + " lg:hidden"}
      >
        <Icon name="menu" />
      </button>
      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <input
          aria-label="Search"
          placeholder="Search campaigns, reports…"
          className="w-full rounded-lg border border-line bg-page py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <span className="mr-1 hidden sm:inline-flex">
          <Badge tone="warning">Mock data</Badge>
        </span>
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className={iconBtn}
        >
          <Icon name="moon" className="h-5 w-5 dark:hidden" />
          <Icon name="sun" className="hidden h-5 w-5 dark:block" />
        </button>
        <button aria-label="Notifications" className={iconBtn}>
          <Icon name="bell" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
        </button>
        <div
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
          aria-label="Account"
        >
          MA
        </div>
      </div>
    </header>
  );
}

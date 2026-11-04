import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Mic, Moon, Settings, Sun } from "lucide-react";
import Logo from "@/components/Logo";
import ToastProvider from "@/components/ToastProvider";
import RecordingDraftProvider from "@/components/RecordingDraftProvider";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "voxnote — Meeting Transcription" },
      {
        name: "description",
        content:
          "Turn your meetings into structured notes with AI — 100% in your browser",
      },
      { name: "theme-color", content: "#ffffff" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/svg+xml", href: "/logo.svg" },
    ],
    scripts: [{ src: "/theme-init.js" }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

type Theme = "light" | "dark";

function useTheme() {
  // Light is the default; dark only when the user explicitly chose it before.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("voxnote-theme") === "dark" ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark-theme", theme === "dark");
    try {
      localStorage.setItem("voxnote-theme", theme);
    } catch {
      // storage unavailable (private mode) — theme just won't persist
    }
  }, [theme]);
  return {
    theme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}

function ServiceWorkerRegister() {
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure is non-fatal: the app still works online.
      });
    }
  }, []);
  return null;
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

const NAV = [
  { to: "/", label: "Record", icon: Mic },
  { to: "/notes", label: "Notes", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

/** Fixed navbar is h-16; content offset = navbar height + breathing room. */
const NAV_H = "pt-24 lg:pt-28";

function RootComponent() {
  const { theme, toggle } = useTheme();
  const scrolled = useScrolled();
  return (
    <ToastProvider>
      <RecordingDraftProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <header
          className="fixed top-0 inset-x-0 z-40 h-16 bg-[var(--header-bg)] border-b border-[var(--header-border)] transition-shadow duration-200"
          style={scrolled ? { boxShadow: "var(--header-shadow)" } : undefined}
        >
          <div className="max-w-6xl mx-auto h-full px-4 lg:px-8 flex items-center justify-between gap-3">
            <Link
              to="/"
              className="flex items-center min-h-11 rounded-lg"
              aria-label="voxnote — home"
            >
              <Logo size={34} />
            </Link>
            <nav className="flex items-center gap-1 sm:gap-1.5" aria-label="Main">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeProps={{
                    className:
                      "bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] border-[var(--tab-active-border)]",
                  }}
                  inactiveProps={{
                    className:
                      "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted",
                  }}
                  className="flex items-center gap-2 px-3 sm:px-3.5 min-h-11 rounded-full text-sm font-semibold border transition-all"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
              <button
                onClick={toggle}
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title={theme === "dark" ? "Switch to light" : "Switch to dark"}
                aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </nav>
          </div>
        </header>
        <main className={`${NAV_H} px-4 lg:px-8 pb-8 lg:pb-12`}>
          <div className="max-w-5xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      </RecordingDraftProvider>
      <ServiceWorkerRegister />
    </ToastProvider>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

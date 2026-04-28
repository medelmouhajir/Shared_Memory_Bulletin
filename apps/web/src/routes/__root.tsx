import { Link, Outlet } from "@tanstack/react-router";
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Columns3, GitBranch, Rss, Terminal } from "lucide-react";

import { CardDetail } from "../components/KanbanBoard/CardDetail";
import { CommandPalette } from "../components/shared/CommandPalette";
import { WsProvider } from "../components/shared/WsProvider";
import { useUiStore } from "../store/ui";

const navItems: {
  to: "/kanban" | "/agents" | "/console" | "/timeline" | "/graph" | "/feed";
  label: string;
  Icon: typeof Columns3;
}[] = [
  { to: "/kanban", label: "Kanban", Icon: Columns3 },
  { to: "/agents", label: "Agents", Icon: Activity },
  { to: "/console", label: "Console", Icon: Terminal },
  { to: "/timeline", label: "Timeline", Icon: CalendarDays },
  { to: "/graph", label: "Graph", Icon: GitBranch },
  { to: "/feed", label: "Feed", Icon: Rss },
];

export function RootLayout() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);

  return (
    <WsProvider>
      <div className={`app-shell${sidebarCollapsed ? " app-shell--sidebar-collapsed" : ""}`}>
        <aside className={`sidebar${sidebarCollapsed ? " sidebar--collapsed" : ""}`}>
          <div className="sidebar-top">
            <h1 className="sidebar-brand">
              <span className="sidebar-brand-full">OpenClaw</span>
              <span className="sidebar-brand-compact" aria-hidden>
                O
              </span>
            </h1>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleSidebarCollapsed}
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight size={18} strokeWidth={2} /> : <ChevronLeft size={18} strokeWidth={2} />}
            </button>
          </div>
          <nav>
            {navItems.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                title={label}
                aria-label={label}
                activeProps={{ className: "sidebar-nav-link sidebar-nav-link--active" }}
                inactiveProps={{ className: "sidebar-nav-link" }}
              >
                <Icon size={18} strokeWidth={2} aria-hidden />
                <span className="sidebar-nav-link-text">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-cta">
            <div className="sidebar-cta-card">
              <p>Press Ctrl+M for quick actions and navigation shortcuts.</p>
              <CommandPalette />
            </div>
          </div>
        </aside>
        <main>
          <Outlet />
        </main>
        <CardDetail />
      </div>
    </WsProvider>
  );
}

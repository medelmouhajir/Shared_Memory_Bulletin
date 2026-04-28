import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, createRoute, createRouter, Navigate, RouterProvider } from "@tanstack/react-router";

import { RootLayout } from "./routes/__root";
import { AgentsRoute } from "./routes/agents";
import { ConsoleRoute } from "./routes/console";
import { FeedRoute } from "./routes/feed";
import { GraphRoute } from "./routes/graph";
import { KanbanRoute } from "./routes/kanban";
import { TimelineRoute } from "./routes/timeline";
import "./styles.css";

const rootRoute = createRootRoute({ component: RootLayout });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/kanban" />,
});
const kanbanRoute = createRoute({ getParentRoute: () => rootRoute, path: "/kanban", component: KanbanRoute });
const agentsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/agents", component: AgentsRoute });
const consoleRoute = createRoute({ getParentRoute: () => rootRoute, path: "/console", component: ConsoleRoute });
const timelineRoute = createRoute({ getParentRoute: () => rootRoute, path: "/timeline", component: TimelineRoute });
const graphRoute = createRoute({ getParentRoute: () => rootRoute, path: "/graph", component: GraphRoute });
const feedRoute = createRoute({ getParentRoute: () => rootRoute, path: "/feed", component: FeedRoute });

const routeTree = rootRoute.addChildren([
  indexRoute,
  kanbanRoute,
  agentsRoute,
  consoleRoute,
  timelineRoute,
  graphRoute,
  feedRoute,
]);
const router = createRouter({ routeTree });
const queryClient = new QueryClient();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);

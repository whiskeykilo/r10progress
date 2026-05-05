import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { RedirectIfNotLoggedIn } from "./components/AuthRedirects";
import { routes } from "./routes";
import { AIAnalysis } from "./views/AIAnalysis";
import { AIReport } from "./views/AIReport";
import { Dashboard } from "./views/Dashboard";
import { Goals } from "./views/Goals";
import { NewLayout } from "./views/NewLayout";
import { Reports } from "./views/Reports";
import { Sessions } from "./views/Sessions";
import { Settings } from "./views/Settings";
import { Upload } from "./views/Upload";
import { Visualization } from "./views/Visualization";

export const router = createBrowserRouter([
  {
    id: "root",
    path: routes.root,
    Component: () => (
      <RedirectIfNotLoggedIn>
        <NewLayout>
          <Outlet />
        </NewLayout>
      </RedirectIfNotLoggedIn>
    ),
    children: [
      {
        index: true,
        Component: () => <Navigate to={routes.dashboard} replace />,
      },
      {
        path: routes.dashboard,
        Component: Dashboard,
      },
      {
        path: routes.goals,
        Component: Goals,
      },
      {
        path: routes.sessions,
        Component: Sessions,
      },
      {
        path: routes.reports,
        Component: Reports,
      },
      {
        path: routes.visualization,
        Component: Visualization,
      },
      {
        path: routes.settings,
        Component: Settings,
      },
      {
        path: routes.aiAnalysis,
        Component: AIAnalysis,
      },
      {
        path: routes.aiReport,
        Component: AIReport,
      },
      {
        path: routes.upload,
        Component: Upload,
      },
    ],
  },
  {
    path: "*",
    Component: () => <Navigate to="/" replace />,
  },
]);

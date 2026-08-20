import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import CashFlowPage from "./pages/CashFlowPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import PropertiesPage from "./pages/PropertiesPage";

function DashboardRoute() {
  return <DashboardLayout><DashboardPage /></DashboardLayout>;
}

function PropertiesRoute() {
  return <DashboardLayout><PropertiesPage /></DashboardLayout>;
}

function CashFlowRoute() {
  return <DashboardLayout><CashFlowPage /></DashboardLayout>;
}

function ProfileRoute() {
  return <DashboardLayout><ProfilePage /></DashboardLayout>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={DashboardRoute} />
      <Route path={"/propriedades"} component={PropertiesRoute} />
      <Route path={"/fluxo-de-caixa"} component={CashFlowRoute} />
      <Route path={"/perfil"} component={ProfileRoute} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

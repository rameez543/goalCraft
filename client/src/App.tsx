import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import AuthPage from "@/pages/AuthPage";
import CoachChatPage from "@/pages/CoachChatPage";
import { GoalProvider } from "./contexts/GoalContext";
import { AuthProvider } from "./hooks/use-auth";
import { TabProvider } from "./contexts/TabContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={CoachChatPage} />
      <ProtectedRoute path="/classic" component={Home} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route path="/auth" component={AuthPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <TabProvider>
            <GoalProvider>
              <Toaster />
              <Router />
            </GoalProvider>
          </TabProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";

import Dashboard from "@/pages/dashboard";
import PreTradeCheck from "@/pages/check";
import ExecutionMode from "@/pages/execution";
import TradeJournal from "@/pages/journal";
import BehavioralAnalytics from "@/pages/analytics";
import TradingRules from "@/pages/rules";
import CBTJournal from "@/pages/cbt-journal";
import SessionReplay from "@/pages/replay";
import SetupPlans from "@/pages/plans";

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/check" component={PreTradeCheck} />
        <Route path="/execution" component={ExecutionMode} />
        <Route path="/journal" component={TradeJournal} />
        <Route path="/analytics" component={BehavioralAnalytics} />
        <Route path="/rules" component={TradingRules} />
        <Route path="/cbt" component={CBTJournal} />
        <Route path="/replay" component={SessionReplay} />
        <Route path="/plans" component={SetupPlans} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <DisclaimerModal />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

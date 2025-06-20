import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import { LandingPage } from "@/components/LandingPage";
import { useState, useEffect } from "react";

function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for JWT token in localStorage
    const token = localStorage.getItem('chittychain_token');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? Dashboard : LandingPage} />
      <Route path="/auth/callback" component={() => {
        // Handle OAuth callback
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          // Process OAuth callback
          fetch('/api/v1/auth/claude/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          }).then(res => res.json()).then(data => {
            if (data.token) {
              localStorage.setItem('chittychain_token', data.token);
              window.location.href = '/';
            }
          });
        }
        return <div>Processing authentication...</div>;
      }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

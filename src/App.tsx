import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NewPostProvider } from "@/contexts/NewPostContext";
import { AppShell } from "@/components/AppShell";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import NewComplaint from "./pages/NewComplaint";
import ComplaintDetail from "./pages/ComplaintDetail";
import Settings from "./pages/Settings";
import AdminUsers from "./pages/admin/Users";
import AdminPanel from "./pages/admin/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NewPostProvider>
            <Routes>
              {/* Public routes without AppShell */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected routes with AppShell */}
              <Route path="/dashboard" element={<AppShell><Dashboard /></AppShell>} />
              <Route path="/community" element={<AppShell><Community /></AppShell>} />
              <Route path="/new-complaint" element={<AppShell><NewComplaint /></AppShell>} />
              <Route path="/complaint/:id" element={<AppShell><ComplaintDetail /></AppShell>} />
              <Route path="/settings" element={<AppShell><Settings /></AppShell>} />
              <Route path="/admin/users" element={<AppShell><AdminUsers /></AppShell>} />
              <Route path="/admin-panel" element={<AppShell><AdminPanel /></AppShell>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </NewPostProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import UsersPage from "./pages/UsersPage";
import PostsPage from "./pages/PostsPage";
import MarketplacePage from "./pages/MarketplacePage";
import ReportsPage from "./pages/ReportsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

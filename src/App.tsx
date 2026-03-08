import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import UsersPage from "./pages/UsersPage";
import PostsPage from "./pages/PostsPage";
import MarketplacePage from "./pages/MarketplacePage";
import ReportsPage from "./pages/ReportsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import JoinPage from "./pages/JoinPage";
import UserDashboard from "./pages/UserDashboard";
import TopicPage from "./pages/TopicPage";
import UserTopicsPage from "./pages/user/UserTopicsPage";
import UserPostsPage from "./pages/user/UserPostsPage";
import UserMarketplacePage from "./pages/user/UserMarketplacePage";
import UserSettingsPage from "./pages/user/UserSettingsPage";
import UserInvitesPage from "./pages/user/UserInvitesPage";
import UserAnnouncementsPage from "./pages/user/UserAnnouncementsPage";
import UserMessagesPage from "./pages/user/UserMessagesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/join" element={<JoinPage />} />

            {/* User routes */}
            <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/topic/:id" element={<ProtectedRoute><TopicPage /></ProtectedRoute>} />
            <Route path="/user/topics" element={<ProtectedRoute><UserTopicsPage /></ProtectedRoute>} />
            <Route path="/user/posts" element={<ProtectedRoute><UserPostsPage /></ProtectedRoute>} />
            <Route path="/user/marketplace" element={<ProtectedRoute><UserMarketplacePage /></ProtectedRoute>} />
            <Route path="/user/settings" element={<ProtectedRoute><UserSettingsPage /></ProtectedRoute>} />
            <Route path="/user/invites" element={<ProtectedRoute><UserInvitesPage /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/" element={<AdminRoute><Index /></AdminRoute>} />
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
            <Route path="/posts" element={<AdminRoute><PostsPage /></AdminRoute>} />
            <Route path="/marketplace" element={<AdminRoute><MarketplacePage /></AdminRoute>} />
            <Route path="/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
            <Route path="/announcements" element={<AdminRoute><AnnouncementsPage /></AdminRoute>} />
            <Route path="/analytics" element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
            <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

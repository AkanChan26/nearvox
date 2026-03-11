import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useHardwareBackButton } from "@/hooks/useHardwareBackButton";
import Index from "./pages/Index";
import AdminUserProfilePage from "./pages/AdminUserProfilePage";

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
import UserNotificationsPage from "./pages/user/UserNotificationsPage";
import UserBoardsPage from "./pages/user/UserBoardsPage";
import UserBoardDetailPage from "./pages/user/UserBoardDetailPage";
import NotFound from "./pages/NotFound";
import InstallPage from "./pages/InstallPage";

const queryClient = new QueryClient();

function AppRoutes() {
  useHardwareBackButton();
  return (
    <>
      <ScrollToTop />
      <Routes>

            <Route path="/login" element={<LoginPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/install" element={<InstallPage />} />

            {/* User routes */}
            <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/topic/:id" element={<ProtectedRoute><TopicPage /></ProtectedRoute>} />
            <Route path="/user/topics" element={<ProtectedRoute><UserTopicsPage /></ProtectedRoute>} />
            <Route path="/admin/topic/:id" element={<AdminRoute><TopicPage /></AdminRoute>} />
            <Route path="/admin/topics" element={<AdminRoute><UserTopicsPage /></AdminRoute>} />
            <Route path="/user/posts" element={<ProtectedRoute><UserPostsPage /></ProtectedRoute>} />
            <Route path="/user/marketplace" element={<ProtectedRoute><UserMarketplacePage /></ProtectedRoute>} />
            <Route path="/user/settings" element={<ProtectedRoute><UserSettingsPage /></ProtectedRoute>} />
            <Route path="/user/invites" element={<ProtectedRoute><UserInvitesPage /></ProtectedRoute>} />
            <Route path="/user/announcements" element={<ProtectedRoute><UserAnnouncementsPage /></ProtectedRoute>} />
            <Route path="/user/messages" element={<ProtectedRoute><UserMessagesPage /></ProtectedRoute>} />
            <Route path="/user/notifications" element={<ProtectedRoute><UserNotificationsPage /></ProtectedRoute>} />
            <Route path="/user/boards" element={<ProtectedRoute><UserBoardsPage /></ProtectedRoute>} />
            <Route path="/user/boards/:id" element={<ProtectedRoute><UserBoardDetailPage /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/" element={<AdminRoute><Index /></AdminRoute>} />
            
            <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
            <Route path="/users/:userId" element={<AdminRoute><AdminUserProfilePage /></AdminRoute>} />
            <Route path="/posts" element={<AdminRoute><PostsPage /></AdminRoute>} />
            <Route path="/admin/all-posts" element={<AdminRoute><UserPostsPage /></AdminRoute>} />
            <Route path="/admin/boards" element={<AdminRoute><UserBoardsPage /></AdminRoute>} />
            <Route path="/admin/boards/:id" element={<AdminRoute><UserBoardDetailPage /></AdminRoute>} />
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

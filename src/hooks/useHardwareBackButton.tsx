import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Handles hardware back button for Capacitor/APK.
 * Uses popstate event which fires on hardware back.
 */
export function useHardwareBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      // Let React Router handle it naturally via browser history
      // This ensures proper back navigation in APK
    };

    // For Capacitor apps, listen to the backbutton event
    const handleCapacitorBack = () => {
      const path = location.pathname;
      
      // If on dashboard or admin home, minimize/exit app
      if (path === "/dashboard" || path === "/") {
        // Try to use Capacitor App plugin to minimize
        try {
          const { App } = (window as any).Capacitor?.Plugins || {};
          if (App?.minimizeApp) {
            App.minimizeApp();
            return;
          }
        } catch {}
        // Fallback: do nothing (don't navigate away from root)
        return;
      }
      
      // Otherwise go back
      navigate(-1);
    };

    document.addEventListener("backbutton", handleCapacitorBack);
    
    return () => {
      document.removeEventListener("backbutton", handleCapacitorBack);
    };
  }, [navigate, location.pathname]);
}

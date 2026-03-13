import { supabase } from "@/integrations/supabase/client";

export type AdminModerationAction = "suspend" | "unsuspend" | "block" | "unblock";

const getFunctionError = (data: unknown, fallback: string) => {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: string }).error;
    if (message) return message;
  }
  return fallback;
};

export async function runAdminModeration(targetUserId: string, action: AdminModerationAction) {
  const { data, error } = await supabase.functions.invoke("moderate-user", {
    body: { target_user_id: targetUserId, action },
  });

  if (error) throw error;

  const responseError = getFunctionError(data, "Failed to update user status");
  if (responseError !== "Failed to update user status") {
    throw new Error(responseError);
  }
}

export async function runAdminDeleteAccount(targetUserId: string) {
  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: { target_user_id: targetUserId },
  });

  if (error) throw error;

  const responseError = getFunctionError(data, "Failed to delete account");
  if (responseError !== "Failed to delete account") {
    throw new Error(responseError);
  }
}

import { supabase } from "@/integrations/supabase/client";

export type AdminModerationAction = "suspend" | "unsuspend" | "block" | "unblock";

async function getFunctionHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    throw new Error("Your session expired. Please log in again.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

const getFunctionError = (data: unknown, fallback: string) => {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: string }).error;
    if (message) return message;
  }
  return fallback;
};

export async function runAdminModeration(targetUserId: string, action: AdminModerationAction) {
  const headers = await getFunctionHeaders();

  const { data, error } = await supabase.functions.invoke("moderate-user", {
    headers,
    body: { target_user_id: targetUserId, action },
  });

  if (error) throw error;

  const responseError = getFunctionError(data, "Failed to update user status");
  if (responseError !== "Failed to update user status") {
    throw new Error(responseError);
  }
}

export async function runAdminDeleteAccount(targetUserId: string) {
  const headers = await getFunctionHeaders();

  const { data, error } = await supabase.functions.invoke("delete-account", {
    headers,
    body: { target_user_id: targetUserId },
  });

  if (error) throw error;

  const responseError = getFunctionError(data, "Failed to delete account");
  if (responseError !== "Failed to delete account") {
    throw new Error(responseError);
  }
}

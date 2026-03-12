import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if a target_user_id was provided (admin deleting another user)
    let targetUserId = user.id;
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No body = self-delete
    }

    if (body?.target_user_id && body.target_user_id !== user.id) {
      // Verify caller is admin
      const { data: callerRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (!callerRole) {
        return new Response(JSON.stringify({ error: "Only admins can delete other accounts" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = body.target_user_id;
    }

    // Delete all user data from public tables
    const tables = [
      { table: "message_reactions", column: "user_id" },
      { table: "chat_messages", column: "sender_id" },
      { table: "conversation_members", column: "user_id" },
      { table: "board_post_comments", column: "user_id" },
      { table: "board_post_likes", column: "user_id" },
      { table: "board_posts", column: "user_id" },
      { table: "board_members", column: "user_id" },
      { table: "post_comments", column: "user_id" },
      { table: "post_likes", column: "user_id" },
      { table: "reply_likes", column: "user_id" },
      { table: "replies", column: "user_id" },
      { table: "topic_likes", column: "user_id" },
      { table: "topics", column: "user_id" },
      { table: "posts", column: "user_id" },
      { table: "notifications", column: "user_id" },
      { table: "reports", column: "reporter_id" },
      { table: "marketplace_listings", column: "user_id" },
      { table: "invite_tickets", column: "owner_id" },
      { table: "blocked_users", column: "blocker_id" },
      { table: "blocked_users", column: "blocked_id" },
      { table: "messages", column: "sender_id" },
      { table: "messages", column: "recipient_id" },
      { table: "activity_logs", column: "user_id" },
      { table: "user_roles", column: "user_id" },
      { table: "profiles", column: "user_id" },
    ];

    for (const { table, column } of tables) {
      await adminClient.from(table).delete().eq(column, targetUserId);
    }

    // Delete conversations created by user (that are now empty)
    await adminClient.from("conversations").delete().eq("created_by", targetUserId);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Delete account error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

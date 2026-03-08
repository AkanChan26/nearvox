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

    // Verify the user
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

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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
      await adminClient.from(table).delete().eq(column, userId);
    }

    // Delete conversations created by user (that are now empty)
    await adminClient.from("conversations").delete().eq("created_by", userId);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
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

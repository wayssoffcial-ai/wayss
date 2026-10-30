import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return new Response(JSON.stringify({ error: "Support email provider is not configured." }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\\s+/i, "");
  if (!token) return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  const admin = createClient(url, serviceKey);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return new Response(JSON.stringify({ error: "Invalid session." }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  const body = await req.json().catch(() => ({}));
  const ticketId = String(body.ticket_id || "");
  const { data: ticket, error: ticketError } = await admin.from("support_tickets").select("id,user_id,description,screenshot_path,created_at").eq("id", ticketId).eq("user_id", auth.user.id).maybeSingle();
  if (ticketError || !ticket) return new Response(JSON.stringify({ error: "Support ticket not found." }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
  const { data: settings } = await admin.from("support_settings").select("support_email").eq("id", 1).single();
  const destination = settings?.support_email || "vikashjagarwal08@gmail.com";
  let screenshot = "";
  if (ticket.screenshot_path) {
    const { data } = await admin.storage.from("support-attachments").createSignedUrl(ticket.screenshot_path, 60 * 60 * 24 * 7);
    if (data?.signedUrl) screenshot = "\\nScreenshot (private link, expires in 7 days): " + data.signedUrl;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("SUPPORT_FROM_EMAIL") || "WAYS S Support <onboarding@resend.dev>",
      to: [destination],
      subject: "WAYS S Help Center · " + ticket.id,
      text: "A user submitted a support request.\\n\\nUser ID: " + ticket.user_id + "\\nTicket: " + ticket.id + "\\nCreated: " + ticket.created_at + "\\n\\nIssue:\\n" + ticket.description + screenshot
    })
  });
  if (!response.ok) return new Response(JSON.stringify({ error: "Email provider rejected the support message." }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
});
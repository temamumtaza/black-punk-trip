import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type NotificationEvent = {
  id: string;
  recipient_user_id: string;
  title: string;
  body: string;
  path: string;
  dedupe_key: string;
  pushed_at: string | null;
  push_attempts: number;
};

type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const internalSecret = Deno.env.get("NOTIFICATION_INTERNAL_SECRET");
const vapidSubject = Deno.env.get("VAPID_SUBJECT");
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

const admin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function claimEvent(eventId: string): Promise<NotificationEvent | null> {
  if (!admin) throw new Error("Supabase admin client is not configured.");
  const staleClaim = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const response = await admin
    .from("notification_events")
    .update({ dispatch_claimed_at: new Date().toISOString() })
    .eq("id", eventId)
    .is("pushed_at", null)
    .or(`dispatch_claimed_at.is.null,dispatch_claimed_at.lt.${staleClaim}`)
    .select("id,recipient_user_id,title,body,path,dedupe_key,pushed_at,push_attempts")
    .maybeSingle();
  if (response.error) throw response.error;
  return response.data as NotificationEvent | null;
}

async function finishEvent(event: NotificationEvent, delivered: number, attempted: number, errors: string[]) {
  if (!admin) throw new Error("Supabase admin client is not configured.");
  const response = await admin
    .from("notification_events")
    .update({
      pushed_at: delivered > 0 || attempted === 0 ? new Date().toISOString() : null,
      dispatch_claimed_at: null,
      push_attempts: event.push_attempts + attempted,
      last_push_error: errors.length ? errors.slice(0, 3).join(" | ").slice(0, 1000) : null,
    })
    .eq("id", event.id);
  if (response.error) throw response.error;
}

async function disableSubscription(subscriptionId: string) {
  if (!admin) return;
  await admin.from("push_subscriptions").update({ enabled: false }).eq("id", subscriptionId);
}

async function dispatchEvent(eventId: string) {
  if (!admin) throw new Error("Supabase admin client is not configured.");
  const event = await claimEvent(eventId);
  if (!event) return { eventId, status: "already-claimed-or-delivered" };

  const subscriptionsResponse = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,enabled")
    .eq("user_id", event.recipient_user_id)
    .eq("enabled", true);
  if (subscriptionsResponse.error) {
    await finishEvent(event, 0, 0, [subscriptionsResponse.error.message]);
    throw subscriptionsResponse.error;
  }

  const subscriptions = (subscriptionsResponse.data ?? []) as PushSubscription[];
  if (!subscriptions.length) {
    await finishEvent(event, 0, 0, []);
    return { eventId, status: "no-enabled-device" };
  }

  const errors: string[] = [];
  let delivered = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify({
          title: event.title,
          body: event.body,
          url: event.path,
          eventId: event.id,
          tag: event.dedupe_key,
        }),
      );
      delivered += 1;
    } catch (failure) {
      const statusCode = typeof failure === "object" && failure !== null && "statusCode" in failure ? String(failure.statusCode) : "unknown";
      const message = failure instanceof Error ? failure.message : String(failure);
      errors.push(`${statusCode}: ${message}`);
      if (statusCode === "404" || statusCode === "410") await disableSubscription(subscription.id);
    }
  }

  await finishEvent(event, delivered, subscriptions.length, errors);
  return { eventId, status: delivered ? "delivered" : "delivery-failed", delivered, attempted: subscriptions.length };
}

async function dispatchPendingEvents() {
  if (!admin) throw new Error("Supabase admin client is not configured.");
  const response = await admin
    .from("notification_events")
    .select("id")
    .is("pushed_at", null)
    .order("created_at", { ascending: true })
    .limit(100);
  if (response.error) throw response.error;

  const results = [];
  for (const row of response.data ?? []) results.push(await dispatchEvent(row.id));
  return results;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!internalSecret || request.headers.get("x-notification-secret") !== internalSecret) return json({ error: "Unauthorized" }, 401);
  if (!admin || !vapidSubject || !vapidPublicKey || !vapidPrivateKey) return json({ error: "Notification worker is not configured" }, 503);

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const payload = await request.json().catch(() => ({}));
    if (payload.type === "event") {
      if (!isValidUuid(payload.event_id)) return json({ error: "Invalid event id" }, 400);
      return json(await dispatchEvent(payload.event_id));
    }
    if (payload.type === "reminders" || payload.type === "dispatch") {
      if (payload.type === "reminders") {
        const reminderResponse = await admin.rpc("create_due_trip_reminder_events");
        if (reminderResponse.error) throw reminderResponse.error;
      }
      return json({ status: "ok", events: await dispatchPendingEvents() });
    }
    return json({ error: "Unknown notification job" }, 400);
  } catch (failure) {
    console.error("push-notifications failed", failure);
    return json({ error: failure instanceof Error ? failure.message : "Notification dispatch failed" }, 500);
  }
});

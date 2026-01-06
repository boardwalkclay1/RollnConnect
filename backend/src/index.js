// src/index.js
const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
};

async function handleOptions() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

async function getProfile(env, id) {
  const raw = await env.CONNECT_KV.get(`profile:${id}`);
  return raw ? JSON.parse(raw) : null;
}

async function putProfile(env, id, body) {
  await env.CONNECT_KV.put(`profile:${id}`, JSON.stringify(body));
  return body;
}

async function listItems(env) {
  // Example: simple D1 query to fetch items table
  const res = await env.DB.prepare("SELECT id, title, description, price FROM items ORDER BY created_at DESC LIMIT 100").all();
  return res.results || [];
}

async function createItem(env, body) {
  const stmt = env.DB.prepare("INSERT INTO items (title, description, price) VALUES (?, ?, ?)");
  const result = await stmt.run(body.title, body.description, body.price);
  return { id: result.lastInsertRowid, ...body };
}

async function listNotifications(env, userId) {
  // Example: notifications stored in KV as JSON list per user
  const raw = await env.NOTIFICATIONS_KV.get(`notifications:${userId}`);
  return raw ? JSON.parse(raw) : [];
}

async function pushNotification(env, userId, note) {
  const list = await listNotifications(env, userId);
  list.unshift({ id: Date.now().toString(), ...note });
  await env.NOTIFICATIONS_KV.put(`notifications:${userId}`, JSON.stringify(list));
  return list;
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const method = request.method.toUpperCase();

      // CORS preflight
      if (method === "OPTIONS") return handleOptions();

      // Health
      if (path === "/api/hello" && method === "GET") {
        return new Response(JSON.stringify({ message: "Worker backend online" }), { headers: jsonHeaders });
      }

      // Auth stub (replace with real logic)
      if (path === "/api/auth/login" && method === "POST") {
        const body = await request.json();
        // Very simple stub: accept any identifier, return a session token stored in KV
        const token = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const session = { token, userId: body.identifier || "guest", created: Date.now() };
        await env.CONNECT_KV.put(`session:${token}`, JSON.stringify(session), { expirationTtl: 60 * 60 * 24 * 7 }); // 7 days
        return new Response(JSON.stringify({ ok: true, token, userId: session.userId }), { headers: jsonHeaders });
      }

      // Profiles: GET /api/profile/:id  PUT /api/profile/:id
      if (path.startsWith("/api/profile")) {
        const parts = path.split("/").filter(Boolean); // ["api","profile",":id"]
        const id = parts[2];
        if (!id) return new Response(JSON.stringify({ error: "Missing profile id" }), { status: 400, headers: jsonHeaders });

        if (method === "GET") {
          const profile = await getProfile(env, id);
          return new Response(JSON.stringify({ profile }), { headers: jsonHeaders });
        }

        if (method === "PUT") {
          const body = await request.json();
          const saved = await putProfile(env, id, body);
          return new Response(JSON.stringify({ ok: true, profile: saved }), { headers: jsonHeaders });
        }
      }

      // Items: GET /api/items  POST /api/items
      if (path === "/api/items") {
        if (method === "GET") {
          const items = await listItems(env);
          return new Response(JSON.stringify({ items }), { headers: jsonHeaders });
        }
        if (method === "POST") {
          const body = await request.json();
          const created = await createItem(env, body);
          return new Response(JSON.stringify({ ok: true, item: created }), { status: 201, headers: jsonHeaders });
        }
      }

      // Notifications: GET /api/notifications/:userId  POST /api/notifications/:userId
      if (path.startsWith("/api/notifications")) {
        const parts = path.split("/").filter(Boolean);
        const userId = parts[2];
        if (!userId) return new Response(JSON.stringify({ error: "Missing user id" }), { status: 400, headers: jsonHeaders });

        if (method === "GET") {
          const notes = await listNotifications(env, userId);
          return new Response(JSON.stringify({ notifications: notes }), { headers: jsonHeaders });
        }

        if (method === "POST") {
          const body = await request.json();
          const updated = await pushNotification(env, userId, body);
          return new Response(JSON.stringify({ ok: true, notifications: updated }), { status: 201, headers: jsonHeaders });
        }
      }

      // Default 404
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: jsonHeaders });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: jsonHeaders });
    }
  }
};

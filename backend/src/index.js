export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path === "/api/clips" && method === "GET") return listClips(env);
    if (path === "/api/clips" && method === "POST") return createClip(request, env);

    if (path.startsWith("/api/clips/")) {
      const parts = path.split("/");
      const id = parts[3];

      if (parts.length === 4) {
        if (method === "PUT") return updateClip(id, request, env);
        if (method === "DELETE") return deleteClip(id, env);
      }

      if (parts.length === 5) {
        const action = parts[4];
        if (action === "like" && method === "POST") return likeClip(id, request, env);
        if (action === "unlike" && method === "POST") return unlikeClip(id, request, env);
        if (action === "share" && method === "POST") return shareClip(id, env);
        if (action === "comments" && method === "GET") return listComments(id, env);
        if (action === "comments" && method === "POST") return createComment(id, request, env);
      }
    }

    if (path.startsWith("/media/") && method === "GET") {
      const key = decodeURIComponent(path.replace("/media/", ""));
      return serveMedia(key, env);
    }

    return new Response("Not found", { status: 404 });
  }
};

async function listClips(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM clips ORDER BY created_at DESC"
  ).all();

  return Response.json(results.map(r => ({
    ...r,
    media_url: "/media/" + encodeURIComponent(r.media_key)
  })));
}

async function createClip(request, env) {
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return new Response("Missing file", { status: 400 });

  const type = form.get("type") || "photo";
  const title = form.get("title") || null;
  const description = form.get("description") || null;
  const caption = form.get("caption") || null;
  const user_id = form.get("user_id") || null;
  const extra_json = form.get("extra_json") || null;

  const ext = file.name?.split(".").pop() || (type === "audio" ? "webm" : "png");
  const mediaKey = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  await env.MEDIA_BUCKET.put(mediaKey, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" }
  });

  const createdAt = Date.now();

  const { lastRowId } = await env.DB.prepare(
    "INSERT INTO clips (type, title, description, caption, media_key, created_at, user_id, extra_json, likes_total, shares_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)"
  ).bind(type, title, description, caption, mediaKey, createdAt, user_id, extra_json).run();

  return Response.json({
    id: lastRowId,
    type,
    title,
    description,
    caption,
    media_key: mediaKey,
    media_url: "/media/" + encodeURIComponent(mediaKey),
    created_at: createdAt,
    user_id,
    extra_json,
    likes_total: 0,
    shares_total: 0
  });
}

async function updateClip(id, request, env) {
  const data = await request.json();
  const { title, description, caption, extra_json } = data;

  await env.DB.prepare(
    "UPDATE clips SET title = COALESCE(?, title), description = COALESCE(?, description), caption = COALESCE(?, caption), extra_json = COALESCE(?, extra_json) WHERE id = ?"
  ).bind(title, description, caption, extra_json, id).run();

  const { results } = await env.DB.prepare("SELECT * FROM clips WHERE id = ?").bind(id).all();
  if (!results.length) return new Response("Not found", { status: 404 });

  return Response.json({
    ...results[0],
    media_url: "/media/" + encodeURIComponent(results[0].media_key)
  });
}

async function deleteClip(id, env) {
  const { results } = await env.DB.prepare("SELECT media_key FROM clips WHERE id = ?").bind(id).all();
  if (!results.length) return new Response("Not found", { status: 404 });

  await env.MEDIA_BUCKET.delete(results[0].media_key);
  await env.DB.prepare("DELETE FROM clips WHERE id = ?").bind(id).run();

  return new Response(null, { status: 204 });
}

async function serveMedia(key, env) {
  const obj = await env.MEDIA_BUCKET.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.body, {
    headers: { "content-type": obj.httpMetadata?.contentType || "application/octet-stream" }
  });
}

async function likeClip(id, request, env) {
  const { user_id } = await request.json();
  if (!user_id) return new Response("user_id required", { status: 400 });

  const { results } = await env.DB.prepare(
    "SELECT count FROM clip_likes WHERE clip_id = ? AND user_id = ?"
  ).bind(id, user_id).all();

  let current = results.length ? results[0].count : 0;
  if (current >= 3) return Response.json({ allowed: false, reason: "max_reached" });

  if (current === 0) {
    await env.DB.prepare("INSERT INTO clip_likes (clip_id, user_id, count) VALUES (?, ?, 1)")
      .bind(id, user_id).run();
  } else {
    await env.DB.prepare("UPDATE clip_likes SET count = count + 1 WHERE clip_id = ? AND user_id = ?")
      .bind(id, user_id).run();
  }

  await env.DB.prepare("UPDATE clips SET likes_total = likes_total + 1 WHERE id = ?")
    .bind(id).run();

  const { results: clip } = await env.DB.prepare("SELECT likes_total FROM clips WHERE id = ?")
    .bind(id).all();

  return Response.json({ allowed: true, likes_total: clip[0].likes_total, user_likes: current + 1 });
}

async function unlikeClip(id, request, env) {
  const { user_id } = await request.json();
  if (!user_id) return new Response("user_id required", { status: 400 });

  const { results } = await env.DB.prepare(
    "SELECT count FROM clip_likes WHERE clip_id = ? AND user_id = ?"
  ).bind(id, user_id).all();

  if (!results.length || results[0].count <= 0)
    return Response.json({ allowed: false, reason: "none_to_remove" });

  const current = results[0].count;

  if (current === 1) {
    await env.DB.prepare("DELETE FROM clip_likes WHERE clip_id = ? AND user_id = ?")
      .bind(id, user_id).run();
  } else {
    await env.DB.prepare("UPDATE clip_likes SET count = count - 1 WHERE clip_id = ? AND user_id = ?")
      .bind(id, user_id).run();
  }

  await env.DB.prepare(
    "UPDATE clips SET likes_total = likes_total - 1 WHERE id = ? AND likes_total > 0"
  ).bind(id).run();

  const { results: clip } = await env.DB.prepare("SELECT likes_total FROM clips WHERE id = ?")
    .bind(id).all();

  return Response.json({ allowed: true, likes_total: clip[0].likes_total, user_likes: current - 1 });
}

async function shareClip(id, env) {
  await env.DB.prepare("UPDATE clips SET shares_total = shares_total + 1 WHERE id = ?")
    .bind(id).run();

  const { results } = await env.DB.prepare("SELECT shares_total FROM clips WHERE id = ?")
    .bind(id).all();

  return Response.json({ shares_total: results[0].shares_total });
}

async function listComments(clipId, env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM clip_comments WHERE clip_id = ? ORDER BY created_at ASC"
  ).bind(clipId).all();

  return Response.json(results);
}

async function createComment(clipId, request, env) {
  const { user_id, body } = await request.json();
  if (!user_id || !body) return new Response("user_id and body required", { status: 400 });

  const createdAt = Date.now();

  const { lastRowId } = await env.DB.prepare(
    "INSERT INTO clip_comments (clip_id, user_id, body, created_at) VALUES (?, ?, ?, ?)"
  ).bind(clipId, user_id, body, createdAt).run();

  return Response.json({
    id: lastRowId,
    clip_id: clipId,
    user_id,
    body,
    created_at: createdAt
  });
}

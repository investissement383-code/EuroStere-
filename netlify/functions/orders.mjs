import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || req.headers.get("x-admin-password") !== pw) return new Response("Mot de passe incorrect", { status: 401 });
  const site = (context.site && context.site.id) || process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const r = await fetch(`https://api.netlify.com/api/v1/sites/${site}/submissions?per_page=100`, {
    headers: { Authorization: "Bearer " + process.env.NETLIFY_TOKEN },
  });
  if (!r.ok) return new Response("Erreur Netlify " + r.status, { status: 502 });
  const store = getStore("status");
  const out = [];
  for (const s of (await r.json()).filter((x) => x.form_name === "orders")) {
    const st = await store.get(s.data.numero, { type: "json" });
    out.push({ date: s.created_at, ...s.data, status: (st && st.status) || "topay" });
  }
  return Response.json(out);
};

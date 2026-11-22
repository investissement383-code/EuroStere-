exports.handler = async (e) => {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || (e.headers["x-admin-password"] || "") !== pw) return { statusCode: 401, body: "Mot de passe incorrect" };
  const site = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const r = await fetch("https://api.netlify.com/api/v1/sites/" + site + "/submissions?per_page=100", { headers: { Authorization: "Bearer " + process.env.NETLIFY_TOKEN } });
  if (!r.ok) return { statusCode: 502, body: "Erreur Netlify " + r.status };
  const d = await r.json();
  const out = d.filter(s => s.form_name === "orders").map(s => Object.assign({ date: s.created_at }, s.data));
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(out) };
};

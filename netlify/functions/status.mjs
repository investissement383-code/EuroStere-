import { getStore } from "@netlify/blobs";

const OK = ["topay", "paid", "shipped", "delivered", "cancelled"];

export default async (req) => {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || req.headers.get("x-admin-password") !== pw) return new Response("Mot de passe incorrect", { status: 401 });
  if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });
  const { numero, status } = await req.json();
  if (!numero || !OK.includes(status)) return new Response("Données invalides", { status: 400 });
  await getStore("status").setJSON(numero, { status, updated: new Date().toISOString() });
  return Response.json({ ok: true });
};

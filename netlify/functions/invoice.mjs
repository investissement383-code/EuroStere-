import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const num = (s) => parseFloat(String(s).replace(/[^\d,.-]/g, "").replace(",", "."));
const eur = (x) => x.toFixed(2).replace(".", ",") + " €";
const clean = (s) => String(s || "").replace(/[^\x20-\x7E\xA0-\xFF€]/g, "?");

export default async (req, context) => {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || req.headers.get("x-admin-password") !== pw) return new Response("Mot de passe incorrect", { status: 401 });
  const { numero } = await req.json();
  const site = (context.site && context.site.id) || process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const r = await fetch(`https://api.netlify.com/api/v1/sites/${site}/submissions?per_page=100`, {
    headers: { Authorization: "Bearer " + process.env.NETLIFY_TOKEN },
  });
  if (!r.ok) return new Response("Erreur Netlify " + r.status, { status: 502 });
  const sub = (await r.json()).find((s) => s.form_name === "orders" && s.data.numero === numero);
  if (!sub) return new Response("Commande introuvable", { status: 404 });

  const o = sub.data;
  const vat = parseFloat(process.env.VAT_RATE || "10");
  const total = num(o.total);
  const items = [];
  let goods = 0, disc = 0;
  for (const l of o.articles.split(" | ")) {
    let m = l.match(/^(\d+) x (.+) = ([\d,.]+) €$/);
    if (m) { const q = +m[1], a = num(m[3]); goods += a; items.push([m[2], q, a / q, a]); continue; }
    m = l.match(/^Remise -(\d+)% = -([\d,.]+) €$/);
    if (m) disc = num(m[2]);
  }
  const shipping = Math.max(0, total - (goods - disc));
  const ht = total / (1 + vat / 100), tva = total - ht;

  const pdf = await PDFDocument.create();
  const pg = pdf.addPage([595, 842]);
  const f = await pdf.embedFont(StandardFonts.Helvetica);
  const b = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  const w = (t, x, size = 10, bold = false) =>
    pg.drawText(clean(t), { x, y, size, font: bold ? b : f, color: rgb(0.1, 0.1, 0.1) });
  const nl = (h = 14) => { y -= h; };

  w("FACTURE", 50, 22, true); w("N° F-" + o.numero, 400, 11, true); nl(16);
  w("Date : " + new Date().toLocaleDateString("fr-FR"), 400); nl(30);
  w(process.env.SELLER_NAME || "[Nom du vendeur]", 50, 11, true); nl();
  w(process.env.SELLER_ADDRESS || "[Adresse]", 50); nl();
  w("N° TVA : " + (process.env.SELLER_VAT_ID || "[numéro de TVA]"), 50); nl();
  w(process.env.SELLER_EMAIL || "", 50); nl(28);
  w("Client", 50, 11, true); nl();
  w(o.client, 50); nl(); w(o.adresse, 50); nl(); w(o.pays + " · " + o.email, 50); nl(30);
  w("Désignation", 50, 10, true); w("Qté", 330, 10, true); w("PU TTC", 390, 10, true); w("Total TTC", 480, 10, true); nl(16);
  for (const [d, q, pu, t] of items) { w(d.slice(0, 48), 50); w(String(q), 330); w(eur(pu), 390); w(eur(t), 480); nl(); }
  if (disc) { w("Remise quantité", 50); w("-" + eur(disc), 480); nl(); }
  w("Livraison", 50); w(eur(shipping), 480); nl(26);
  w("Total HT", 380); w(eur(ht), 480); nl();
  w("TVA " + vat + " %", 380); w(eur(tva), 480); nl();
  w("Total TTC", 380, 11, true); w(eur(total), 480, 11, true); nl(30);
  w("Mode de paiement : " + o.paiement + " · Commande " + o.numero, 50, 9);

  const bytes = await pdf.save();
  return new Response(bytes, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="facture-${o.numero}.pdf"` },
  });
};

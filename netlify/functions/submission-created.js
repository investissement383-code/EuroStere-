const T = {
  fr: ["Votre commande ", "Merci pour votre commande !", "Nous vous enverrons les instructions de paiement et le délai de livraison dans un prochain e-mail.", "Total TTC", "Livraison à"],
  en: ["Your order ", "Thank you for your order!", "We will email you the payment instructions and the delivery time shortly.", "Total incl. VAT", "Delivery to"],
  de: ["Ihre Bestellung ", "Danke für Ihre Bestellung!", "Wir senden Ihnen in Kürze die Zahlungsanweisungen und die Lieferzeit per E-Mail.", "Gesamt inkl. MwSt.", "Lieferung an"],
  it: ["Il tuo ordine ", "Grazie per il tuo ordine!", "Ti invieremo a breve via e-mail le istruzioni di pagamento e i tempi di consegna.", "Totale IVA incl.", "Consegna a"],
  es: ["Tu pedido ", "¡Gracias por tu pedido!", "En breve te enviaremos por correo las instrucciones de pago y el plazo de entrega.", "Total IVA incl.", "Entrega en"],
  nl: ["Je bestelling ", "Bedankt voor je bestelling!", "Je ontvangt binnenkort per e-mail de betaalinstructies en de levertijd.", "Totaal incl. btw", "Levering aan"],
};
const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

exports.handler = async (event) => {
  const p = JSON.parse(event.body).payload;
  if (p.form_name !== "orders") return { statusCode: 200, body: "skip" };
  const key = process.env.BREVO_API_KEY, from = process.env.SENDER_EMAIL, d = p.data;
  if (!key || !from || !d.email) return { statusCode: 200, body: "e-mail non configuré" };
  const m = (d.instructions || "").match(/^\[(\w\w)\]/);
  const l = T[(m ? m[1] : "fr").toLowerCase()] || T.fr;
  const html = `<div style="font-family:sans-serif"><h2>${l[1]}</h2><p>${l[2]}</p><p><b>${esc(d.numero)}</b></p><p>${esc(d.articles).split(" | ").join("<br>")}</p><p><b>${l[3]} : ${esc(d.total)}</b></p><p>${l[4]} : ${esc(d.client)}, ${esc(d.adresse)}, ${esc(d.pays)}</p></div>`;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: process.env.SENDER_NAME || "EuroStere", email: from },
      to: [{ email: d.email, name: d.client }],
      replyTo: { email: process.env.SELLER_EMAIL || from },
      subject: l[0] + d.numero,
      htmlContent: html,
    }),
  });
  return { statusCode: 200, body: r.ok ? "ok" : "brevo " + r.status };
};

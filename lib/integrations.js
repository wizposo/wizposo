// Integrasi luar: Midtrans (payment gateway) dan Fonnte (WhatsApp).
import { sha512hex, rp } from "./util.js";

/* ================= MIDTRANS ================= */
const mtBase = (prod) => prod ? { snap: "https://app.midtrans.com", api: "https://api.midtrans.com" } : { snap: "https://app.sandbox.midtrans.com", api: "https://api.sandbox.midtrans.com" };
const mtAuth = (key) => "Basic " + btoa(key + ":");

export async function midtransCreate(cfg, d, campaignJudul, finishUrl) {
  const res = await fetch(mtBase(cfg.midtrans_production).snap + "/snap/v1/transactions", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", authorization: mtAuth(cfg.midtrans_server_key) },
    body: JSON.stringify({
      transaction_details: { order_id: d.id, gross_amount: d.total },
      item_details: [{ id: "C" + (d.campaign_id || 0), price: d.total, quantity: 1, name: String(campaignJudul).slice(0, 48) }],
      customer_details: { first_name: (d.anonim ? "Hamba Allah" : d.nama || "Donatur").slice(0, 40), phone: d.wa ? "+" + d.wa : undefined },
      callbacks: { finish: finishUrl },
      expiry: { unit: "hours", duration: 24 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.redirect_url) throw new Error("Payment gateway menolak: " + (data.error_messages || [res.status]).join(", "));
  return { token: data.token, url: data.redirect_url };
}

// Verifikasi tanda tangan notifikasi Midtrans
export async function midtransVerify(cfg, n) {
  const expect = await sha512hex(`${n.order_id}${n.status_code}${n.gross_amount}${cfg.midtrans_server_key}`);
  return expect === n.signature_key;
}
export function midtransStatus(n) {
  const s = n.transaction_status;
  if (s === "settlement" || (s === "capture" && (n.fraud_status || "accept") === "accept")) return "paid";
  if (s === "expire") return "expired";
  if (s === "cancel" || s === "deny" || s === "failure") return "failed";
  return "pending";
}
export async function midtransCheck(cfg, orderId) {
  const res = await fetch(mtBase(cfg.midtrans_production).api + `/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { accept: "application/json", authorization: mtAuth(cfg.midtrans_server_key) },
  });
  return res.json();
}

/* ================= FONNTE (WhatsApp) ================= */
// file (opsional): { url, filename } — gambar dikirim lewat URL publik. Bila paket Fonnte tidak
// mendukung lampiran, pesan dikirim ulang sebagai teks saja (pesan sudah memuat tautan dokumen).
export async function sendWA(cfg, target, message, file = null) {
  if (!cfg.fonnte_token || !target) return { ok: false, reason: "WhatsApp otomatis belum diatur" };
  const post = async (withFile) => {
    const body = new FormData();
    body.append("target", target); body.append("message", message); body.append("countryCode", "62");
    if (withFile) { body.append("url", file.url); body.append("filename", file.filename || "dokumen.png"); }
    const res = await fetch("https://api.fonnte.com/send", { method: "POST", headers: { Authorization: cfg.fonnte_token }, body });
    const data = await res.json().catch(() => ({}));
    return { ok: !!data.status, reason: data.reason || data.detail || "" };
  };
  try {
    if (file?.url) {
      const r = await post(true);
      if (r.ok) return { ...r, gambar: true };
      const t = await post(false);
      return { ...t, gambar: false, reason: t.ok ? "terkirim sebagai teks: " + r.reason : t.reason };
    }
    return await post(false);
  } catch (e) { return { ok: false, reason: String(e.message || e) }; }
}

/* ================= TEMPLATE PESAN ================= */
export function msgKuitansi(cfg, d, judul, url) {
  const nama = d.anonim || !d.nama ? "Hamba Allah" : `${d.sapaan || ""} ${d.nama}`.trim();
  return `Assalamu'alaikum ${nama},\n\nAlhamdulillah, ${d.jenis_dana === "zakat" ? "zakat" : "donasi"} Anda telah kami terima.\n\n` +
    `*Kuitansi WIZ Cabang ${cfg.cabang}*\nNo: ${d.id}\nProgram: ${judul}\nNominal: ${rp(d.total)}\nJenis dana: ${d.jenis_dana.toUpperCase()}\n\n` +
    `Kuitansi lengkap: ${url}\n\n` +
    `_Ajarakallahu fiima a'thaita, wa baaraka laka fiima abqaita, wa ja'alahu laka thahuura._\n` +
    `Semoga Allah memberi pahala atas apa yang Anda berikan, memberkahi harta yang tersisa, dan menjadikannya penyuci bagi Anda.\n\nJazakallahu khairan.`;
}
export function msgAdmin(cfg, d, judul, frNama) {
  return `🔔 Donasi masuk – WIZ ${cfg.cabang}\n${rp(d.total)} · ${judul}\n${d.anonim ? "Hamba Allah" : d.nama || "-"}${d.wa ? " (+" + d.wa + ")" : ""}\nMetode: ${d.metode}${frNama ? "\nFundraiser: " + frNama : ""}\nNo: ${d.id}`;
}
export function msgFundraiser(cfg, d, judul, fr) {
  return `Alhamdulillah, ${fr.nama}! Ada donasi ${rp(d.total)} untuk "${judul}" lewat tautan Anda. Semoga menjadi pahala yang terus mengalir. Jazakallahu khairan.`;
}

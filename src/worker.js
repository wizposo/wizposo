// Pintu masuk untuk Cloudflare Workers (alternatif dari Pages Functions).
// /api/* ditangani lib/app.js, sisanya dilayani dari folder public/.
// Cron (lihat wrangler.jsonc) menyalin data ke Google Drive di latar belakang.
import { handle, scheduled } from "../lib/app.js";
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handle(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scheduled(env, ctx));
  },
};

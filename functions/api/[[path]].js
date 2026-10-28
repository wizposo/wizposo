// Semua permintaan /api/* ditangani oleh lib/app.js
import { handle } from "../../lib/app.js";
export const onRequest = (context) => handle(context.request, context.env, context);

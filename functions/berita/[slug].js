import { ogPage } from "../../lib/app.js";
// Tautan bagikan dengan pratinjau gambar (WhatsApp/Facebook)
export const onRequestGet = ({ request, env }) => ogPage(request, env);

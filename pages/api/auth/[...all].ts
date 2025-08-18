// pages/api/auth/[...all].ts
import { toNodeHandler } from "better-auth/node";
import { auth } from "@/lib/auth";

// Desactivar bodyParser, Better Auth parsea por su cuenta
export const config = { api: { bodyParser: false } };

export default toNodeHandler(auth.handler);

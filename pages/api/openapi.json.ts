// pages/api/openapi.json.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getOpenApiDocument } from "@/lib/openapi"; // si no tienes alias "@", usa: ../../lib/openapi

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host as string;
  const baseUrl = `${proto}://${host}`;
  const spec = getOpenApiDocument(baseUrl);
  res.status(200).json(spec);
}

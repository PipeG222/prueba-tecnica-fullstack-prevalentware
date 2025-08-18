// pages/api/docs.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host as string;
  const origin = `${proto}://${host}`;

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8"/><title>API Docs</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"/>
<style>body{margin:0}.swagger-ui{min-height:100vh}</style>
</head><body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
window.onload = () => SwaggerUIBundle({
  url: '${origin}/api/openapi.json',
  dom_id: '#swagger-ui',
  deepLinking: true,
  persistAuthorization: true
});
</script>
</body></html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Proxy POST -> BACKEND /billing/portal
 * Backend should return { url }
 */
const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://localhost:4001";
const BACKEND_PATH = "/billing/portal";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (req.headers.authorization) headers["Authorization"] = String(req.headers.authorization);
    const backendUrl = `${BACKEND_BASE.replace(/\/$/, "")}${BACKEND_PATH}`;
    const r = await fetch(backendUrl, { method: "POST", headers, body: JSON.stringify(req.body || {}) });
    const text = await r.text();
    try {
      const data = JSON.parse(text);
      res.status(r.status).json(data);
    } catch {
      res.status(r.status).send(text);
    }
  } catch (err: any) {
    console.error("portal proxy error", err);
    res.status(500).json({ message: "Proxy error" });
  }
}
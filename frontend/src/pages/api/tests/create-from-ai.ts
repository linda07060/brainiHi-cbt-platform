import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

/**
 * Proxy route: /api/tests/create-from-ai -> <BACKEND_URL>/tests/create-from-ai
 *
 * This forwards the request body and Authorization header (if supplied) to your backend.
 * Using a server-side proxy avoids CORS issues and keeps frontend code simple.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const backendUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    if (!backendUrl) {
      return res.status(500).json({ message: 'Backend URL not configured' });
    }

    const url = `${backendUrl}/tests/create-from-ai`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization as string;
    }

    const backendRes = await axios.post(url, req.body, { headers, timeout: 120000 });
    return res.status(backendRes.status).json(backendRes.data);
  } catch (err: any) {
    // If backend returned a structured error, forward it
    if (err?.response?.data) {
      try {
        return res.status(err.response.status || 500).json(err.response.data);
      } catch {}
    }
    // Fallback generic error
    return res.status(500).json({ message: err?.message || 'Unknown error from create-from-ai proxy' });
  }
}
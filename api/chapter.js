import { handleApiRequest } from '../novel-browser/src/server/readnovelfull.mjs';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://novel-browser-glass.vercel.app');
    const result = await handleApiRequest('/api/chapter', url.searchParams);
    res.status(result.status).json(result.payload);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Request failed' });
  }
}

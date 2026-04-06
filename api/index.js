export default async function handler(req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const key = (req.headers.authorization || '').replace(/^Bearer /i, '');
    if (!key) return res.status(401).json({ error: 'no key' });

    const url = `https://generativelanguage.googleapis.com${req.url}?key=${key}`;
    const resp = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body)
    });

    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'crash', msg: e.message });
  }
};

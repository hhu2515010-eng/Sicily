export default async function handler(req, res) {
  try {
    const targetUrl = new URL(req.url, "https://generativelanguage.googleapis.com");
    const headers = {};

    for (const [key, val] of Object.entries(req.headers)) {
      if (key.toLowerCase() === "authorization") {
        headers["x-goog-api-key"] = val.toString().replace(/^Bearer /i, "");
      } else {
        headers[key] = val;
      }
    }

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: req.method === "GET" ? undefined : JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "proxy failed" });
  }
}

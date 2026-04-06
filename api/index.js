export default async function handler(req, res) {
  const { pathname, search } = new URL(req.url, `http://${req.headers.host}`);
  const targetUrl = `https://generativelanguage.googleapis.com${pathname}${search}`;

  const proxyResponse = await fetch(targetUrl, {
    method: req.method,
    headers: {
      ...req.headers,
      Host: 'generativelanguage.googleapis.com'
    },
    body: req.method === 'POST' ? req.body : undefined
  });

  const data = await proxyResponse.text();
  res.status(proxyResponse.status).setHeader('Content-Type', proxyResponse.headers.get('Content-Type')).send(data);
}

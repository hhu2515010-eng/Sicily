const GEMINI_API_KEY = "AIzaSyDY8qwZJRgMgQ4p8qrklLlOc_h3XmunLWM";

module.exports = async function handler(req, res) {
  // 跨域配置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 只允许 /v1/ 开头的合法API路径
    if (!req.url.startsWith('/v1/')) {
      return res.status(400).json({
        error: 'Invalid path',
        message: 'Please use /v1/models or other valid Gemini API endpoints'
      });
    }

    const targetUrl = new URL(req.url, 'https://generativelanguage.googleapis.com');
    targetUrl.searchParams.set('key', GEMINI_API_KEY);

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body || {}),
    });

    // 先判断响应类型，再解析JSON
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      // 非JSON响应，直接返回文本，避免崩溃
      const text = await response.text();
      return res.status(response.status).send(text);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy failed', message: error.message });
  }
};
};

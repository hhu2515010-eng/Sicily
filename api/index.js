// 已嵌入你的API Key，无需额外配置
const GEMINI_API_KEY = "AIzaSyDY8qwZJRgMgQ4p8qrklLlOc_h3XmunLWM";

module.exports = async function handler(req, res) {
  // 跨域配置，兼容所有客户端
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 自动拼接Key，无需手动传参
    const targetUrl = new URL(req.url, 'https://generativelanguage.googleapis.com');
    targetUrl.searchParams.set('key', GEMINI_API_KEY);

    // 转发请求到Gemini官方API
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body || {}),
    });

    // 原样返回响应
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    // 全局异常捕获，避免崩溃
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy failed', message: error.message });
  }
};

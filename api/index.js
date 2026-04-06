export default async function handler(req, res) {
  // 解决跨域问题
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 提取API Key
    let apiKey = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.key;
    if (!apiKey) return res.status(401).json({ error: 'Unauthorized: Missing API key' });

    // 处理模型列表请求（/v1/models）
    if (req.url.startsWith('/v1/models')) {
      const targetUrl = new URL('https://generativelanguage.googleapis.com/v1beta/models');
      targetUrl.searchParams.set('key', apiKey);
      
      const response = await fetch(targetUrl.toString(), { method: 'GET' });
      const data = await response.json();
      
      // 转换成OpenAI格式
      const models = data.models?.map(m => ({
        id: m.name.replace('models/', ''),
        object: 'model',
        created: Date.now(),
        owned_by: 'google'
      })) || [];
      
      return res.json({ object: 'list', data: models });
    }

    // 处理聊天请求（/v1/chat/completions）
    if (req.url.startsWith('/v1/chat/completions')) {
      const { model, messages } = req.body;
      if (!model || !messages) return res.status(400).json({ error: 'Invalid request body' });

      // 转换成Gemini格式
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const targetUrl = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
      targetUrl.searchParams.set('key', apiKey);

      const response = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(500).json({ error: 'Failed to get response from Gemini' });
      }

      // 转换成OpenAI格式返回
      return res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: data.candidates[0].content.parts[0].text },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      });
    }

    // 其他请求直接转发
    const targetUrl = new URL(req.url, 'https://generativelanguage.googleapis.com');
    targetUrl.searchParams.set('key', apiKey);
    
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: `Proxy error: ${err.message}` });
  }
}

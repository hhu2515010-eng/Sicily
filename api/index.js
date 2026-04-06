export default async function handler(req, res) {
  // 1. 处理跨域 OPTIONS 预检请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 2. 安全提取 API Key（兼容 Bearer 头和 URL 参数，避免空值崩溃）
    const authHeader = req.headers?.authorization || '';
    const apiKey = authHeader.replace(/^Bearer\s+/i, '') || req.query?.key;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API Key' });
    }

    // 3. 模型列表接口（/v1/models → 适配 OpenAI 格式）
    if (req.url.includes('/v1/models')) {
      const geminiUrl = new URL('https://generativelanguage.googleapis.com/v1beta/models');
      geminiUrl.searchParams.set('key', apiKey);

      const geminiRes = await fetch(geminiUrl.toString(), { method: 'GET' });
      const geminiData = await geminiRes.json();

      // 安全处理模型列表，避免空数组崩溃
      const models = (geminiData.models || []).map(m => ({
        id: m.name.replace('models/', ''),
        object: 'model',
        created: Date.now(),
        owned_by: 'google'
      }));

      return res.json({
        object: 'list',
        data: models
      });
    }

    // 4. 聊天接口（/v1/chat/completions → 双向格式转换）
    if (req.url.includes('/v1/chat/completions')) {
      // 安全提取请求体，避免 undefined 崩溃
      const { model, messages } = req.body || {};
      
      if (!model || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body' });
      }

      // 转换为 Gemini 要求的格式
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content || '' }]
      }));

      const geminiUrl = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
      geminiUrl.searchParams.set('key', apiKey);

      const geminiRes = await fetch(geminiUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      const geminiData = await geminiRes.json();
      // 安全提取回复内容，避免空值崩溃
      const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: replyText },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      });
    }

    // 5. 兜底：其他请求直接转发
    const geminiUrl = new URL(req.url, 'https://generativelanguage.googleapis.com');
    geminiUrl.searchParams.set('key', apiKey);

    const geminiRes = await fetch(geminiUrl.toString(), {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body || {})
    });

    const data = await geminiRes.json();
    return res.status(geminiRes.status).json(data);

  } catch (err) {
    // 全局异常捕获，避免函数崩溃
    console.error('Proxy error:', err);
    return res.status(500).json({ error: `Proxy failed: ${err.message}` });
  }
}
        object: 'list',
        data: models
      });
    } catch (e) {
      return res.status(500).json({ error: 'Models fetch failed: ' + e.message });
    }
  }

  // 4. 聊天接口（/v1/chat/completions → 双向格式转换）
  if (req.url.includes('/v1/chat/completions')) {
    const { model, messages } = req.body || {};
    
    if (!model || !messages) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // 转成 Gemini 要求的 messages 格式
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const geminiUrl = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
    geminiUrl.searchParams.set('key', apiKey);

    try {
      const geminiRes = await fetch(geminiUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      const geminiData = await geminiRes.json();
      const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // 转成 OpenAI 标准聊天响应格式
      return res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: replyText },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      });
    } catch (e) {
      return res.status(500).json({ error: 'Chat fetch failed: ' + e.message });
    }
  }

  // 5. 兜底：其他请求直接转发
  const geminiUrl = new URL(req.url, 'https://generativelanguage.googleapis.com');
  geminiUrl.searchParams.set('key', apiKey);

  try {
    const geminiRes = await fetch(geminiUrl.toString(), {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body)
    });

    const data = await geminiRes.json();
    return res.status(geminiRes.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Proxy failed: ' + e.message });
  }
}

      const geminiData = await geminiRes.json();
      const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // 转成 OpenAI 标准聊天响应格式
      return res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: replyText },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      });
    } catch (e) {
      return res.status(500).json({ error: 'Chat fetch failed: ' + e.message });
    }
  }

  // 5. 兜底：其他请求直接转发
  const geminiUrl = new URL(req.url, 'https://generativelanguage.googleapis.com');
  geminiUrl.searchParams.set('key', apiKey);

  try {
    const geminiRes = await fetch(geminiUrl.toString(), {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'GET' ? undefined : JSON.stringify(req.body)
    });

    const data = await geminiRes.json();
    return res.status(geminiRes.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Proxy failed: ' + e.message });
  }
}

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

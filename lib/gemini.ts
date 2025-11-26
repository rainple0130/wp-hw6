// 使用 REST API 直接呼叫，避免 SDK 在 Vercel 環境的 streaming 問題
const DEFAULT_MODEL = 'gemini-2.5-flash';

export async function getGeminiResponse(message: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const systemPrompt = '你是一個友善的 LINE Chatbot 助手，請用簡潔、親切的語氣回應用戶。';
  const prompt = `${systemPrompt}\n\n用戶訊息：${message}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;
  
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  };

  console.log('[Gemini] Calling REST API...');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || text.trim().length === 0) {
    return '抱歉，我無法產生回應。請稍後再試。';
  }

  return text;
}

// 為了向後相容
export function getGeminiModel() {
  throw new Error('getGeminiModel() is deprecated. Use getGeminiResponse() directly.');
}

export default getGeminiResponse;

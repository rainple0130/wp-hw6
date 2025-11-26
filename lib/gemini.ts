// 使用 REST API 直接呼叫 Gemini，避免官方 SDK 在 Vercel 等環境的 streaming 問題
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * 使用 REST API 呼叫 Gemini API 取得回應
 * 這個版本不會卡在 streaming，適用於 Vercel、Cloudflare 等環境
 * @param message 用戶訊息
 * @returns Gemini 回應文字
 */
export async function getGeminiResponse(message: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const systemPrompt = '你是一個友善的 LINE Chatbot 助手，請用簡潔、親切的語氣回應用戶。';
  const fullPrompt = `${systemPrompt}\n\n用戶訊息：${message}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: fullPrompt }]
      }
    ]
  };

  try {
    console.log(`[Gemini] Calling REST API with model: ${DEFAULT_MODEL}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini] API error (${response.status}):`, errorText);
      
      if (response.status === 404) {
        throw new Error('Gemini 模型不存在，請檢查模型名稱');
      }
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('Gemini API 金鑰無效或權限不足');
      }
      
      throw new Error(`Gemini API 錯誤 (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    
    // 從回應中提取文字
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text || text.trim().length === 0) {
      console.warn('[Gemini] Empty response received');
      console.log('[Gemini] Full response:', JSON.stringify(data, null, 2));
      return '抱歉，我無法產生回應。請稍後再試。';
    }

    console.log(`[Gemini] Response received (${text.length} chars)`);
    return text;
  } catch (error) {
    console.error('[Gemini] API error:', error instanceof Error ? error.message : String(error));
    
    // 處理常見錯誤
    if (error instanceof Error) {
      if (error.message.includes('fetch failed') || 
          error.message.includes('ECONNREFUSED') || 
          error.message.includes('ENOTFOUND')) {
        throw new Error('Gemini API 連線失敗，請檢查網路連線或稍後再試');
      }
    }
    
    throw error;
  }
}

// 為了向後相容，保留這個 export（但現在不需要了）
export function getGeminiModel() {
  throw new Error('getGeminiModel() is deprecated. Use getGeminiResponse() directly.');
}

export default getGeminiResponse;

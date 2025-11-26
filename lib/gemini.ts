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
  console.log('[Gemini] URL:', url.substring(0, 100) + '...');
  console.log('[Gemini] Body length:', JSON.stringify(body).length);
  
  const startTime = Date.now();
  
  // 使用 AbortController 設定 30 秒超時
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error('[Gemini] ❌ Fetch timeout after 30s, aborting...');
    controller.abort();
  }, 30000);
  
  let response;
  try {
    console.log('[Gemini] Starting fetch at', new Date().toISOString());
    
    // 使用 Promise.race 確保不會永遠卡住
    const fetchPromise = fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Fetch timeout after 30s'));
      }, 30000);
    });
    
    response = await Promise.race([fetchPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    const fetchTime = Date.now() - startTime;
    console.log(`[Gemini] ✅ Fetch completed in ${fetchTime}ms, status: ${response.status}`);
    console.log(`[Gemini] Response headers:`, Object.fromEntries(response.headers.entries()));
  } catch (fetchError) {
    clearTimeout(timeoutId);
    const fetchTime = Date.now() - startTime;
    console.error(`[Gemini] ❌ Fetch failed after ${fetchTime}ms:`, fetchError instanceof Error ? fetchError.message : String(fetchError));
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      throw new Error('Gemini API 請求超時，請稍後再試');
    }
    throw fetchError;
  }

  console.log('[Gemini] Checking response status...');
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Gemini] ❌ API error (${response.status}):`, errorText.substring(0, 500));
    throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  console.log('[Gemini] Reading response body...');
  const responseText = await response.text();
  console.log('[Gemini] Response body read, length:', responseText.length);
  console.log('[Gemini] Response preview:', responseText.substring(0, 200));
  
  console.log('[Gemini] Parsing JSON response...');
  let data;
  try {
    data = JSON.parse(responseText);
    console.log('[Gemini] JSON parsed successfully');
  } catch (parseError) {
    console.error('[Gemini] ❌ JSON parse error:', parseError);
    console.error('[Gemini] Response text:', responseText);
    throw new Error('無法解析 Gemini API 回應');
  }
  
  console.log('[Gemini] Extracting text from response...');
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('[Gemini] Text extracted, length:', text?.length || 0);

  if (!text || text.trim().length === 0) {
    console.warn('[Gemini] ⚠️ Empty response');
    return '抱歉，我無法產生回應。請稍後再試。';
  }

  const totalTime = Date.now() - startTime;
  console.log(`[Gemini] ✅ Success! Total time: ${totalTime}ms`);
  return text;
}

// 為了向後相容
export function getGeminiModel() {
  throw new Error('getGeminiModel() is deprecated. Use getGeminiResponse() directly.');
}

export default getGeminiResponse;

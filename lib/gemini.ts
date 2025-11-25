import { GoogleGenerativeAI } from '@google/generative-ai';

// 使用 lazy initialization 避免建置時檢查環境變數
let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    geminiClient = new GoogleGenerativeAI(apiKey);
  }

  return geminiClient;
}

/**
 * 呼叫 Gemini API 取得回應（帶超時處理）
 * @param message 用戶訊息
 * @param timeoutMs 超時時間（毫秒），預設 30 秒
 * @returns Gemini 回應文字
 */
export async function getGeminiResponse(message: string, timeoutMs: number = 30000): Promise<string> {
  try {
    const client = getGeminiClient();
    
    console.log('Calling Gemini API with model: gemini-2.5-flash');
    
    // 使用 Gemini 2.5 Flash（快速且高效）
    // 如果模型錯誤，API 會回傳明確的錯誤訊息
    const model = client.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 500, // 限制回應長度
        temperature: 0.7,
      },
    });
    
    // 將系統提示和用戶訊息組合
    const systemPrompt = '你是一個友善的 LINE Chatbot 助手，請用簡潔、親切的語氣回應用戶。';
    const fullPrompt = `${systemPrompt}\n\n用戶訊息：${message}`;
    
    console.log('Sending request to Gemini API...');
    
    // 使用 Promise.race 實現超時
    const apiCall = model.generateContent(fullPrompt);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Gemini API timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    const result = await Promise.race([apiCall, timeoutPromise]);
    const response = result.response.text() || '抱歉，我無法產生回應。';
    console.log('Gemini API response received, length:', response.length);
    return response;
  } catch (error) {
    console.error('Gemini API error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    
    // 如果是超時，提供更明確的錯誤訊息
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('Gemini API timeout - request took too long');
      throw new Error('Gemini API 回應超時，請稍後再試');
    }
    
    // 如果是模型不存在，提供明確錯誤
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('not found'))) {
      console.error('Gemini model not found - check model name');
      throw new Error('Gemini 模型不存在，請檢查模型名稱');
    }
    
    throw error;
  }
}

export default getGeminiClient;


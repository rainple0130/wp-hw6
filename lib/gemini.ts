import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini 模型預設值
const DEFAULT_MODEL = 'gemini-2.5-flash';

// 使用 lazy initialization 避免建置時檢查環境變數
let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: any = null;

function getGeminiModel() {
  if (!geminiModel) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // 使用與 client.ts 完全相同的穩定方式
    geminiClient = new GoogleGenerativeAI(apiKey);
    // 注意：client.ts 沒有傳入 generationConfig，先保持一致
    geminiModel = geminiClient.getGenerativeModel({ 
      model: DEFAULT_MODEL,
    });
  }

  return geminiModel;
}

/**
 * 呼叫 Gemini API 取得回應
 * @param message 用戶訊息
 * @returns Gemini 回應文字
 */
export async function getGeminiResponse(message: string): Promise<string> {
  try {
    const model = getGeminiModel();
    
    const systemPrompt = '你是一個友善的 LINE Chatbot 助手，請用簡潔、親切的語氣回應用戶。';
    const fullPrompt = `${systemPrompt}\n\n用戶訊息：${message}`;
    
    console.log(`[Gemini] Calling API with model: ${DEFAULT_MODEL}`);
    
    // 正確的 SDK 使用方式（與 client.ts 相同）
    // 1. await generateContent() 取得 result
    const result = await model.generateContent(fullPrompt);
    
    // 2. await result.response 取得 response（這是關鍵！）
    const response = await result.response;
    
    // 3. 呼叫 .text() 取得文字
    const text = response.text();
    
    if (!text || text.trim().length === 0) {
      console.warn('[Gemini] Empty response received');
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
      
      if (error.message.includes('404') || error.message.includes('not found')) {
        throw new Error('Gemini 模型不存在，請檢查模型名稱');
      }
    }
    
    throw new Error(`Gemini API 錯誤：${error instanceof Error ? error.message : String(error)}`);
  }
}

// 為了向後相容，保留這個 export（但現在返回 model）
function getGeminiClient() {
  return getGeminiModel();
}

export default getGeminiClient;

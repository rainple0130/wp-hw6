import { GoogleGenAI } from '@google/genai';

// 使用 lazy initialization 避免建置時檢查環境變數
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

/**
 * 呼叫 Gemini API 取得回應（帶超時處理）
 * @param message 用戶訊息
 * @param timeoutMs 超時時間（毫秒），預設 120 秒（LLM 需要時間思考）
 * @returns Gemini 回應文字
 */
export async function getGeminiResponse(message: string, timeoutMs: number = 120000): Promise<string> {
  try {
    const client = getGeminiClient();
    
    console.log('Calling Gemini API with model: gemini-2.5-flash');
    
    // 將系統提示和用戶訊息組合
    const systemPrompt = '你是一個友善的 LINE Chatbot 助手，請用簡潔、親切的語氣回應用戶。';
    const fullPrompt = `${systemPrompt}\n\n用戶訊息：${message}`;
    
    console.log('Sending request to Gemini API...');
    
    // 使用官方新 API 方式
    const apiCall = client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
    });
    
    // 使用 Promise.race 實現超時
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Gemini API timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    const response = await Promise.race([apiCall, timeoutPromise]);
    
    console.log('Gemini API response received:', {
      hasResponse: !!response,
      responseType: typeof response,
      responseKeys: response ? Object.keys(response) : [],
    });
    
    // 取得回應文字
    let responseText: string;
    try {
      responseText = response.text || '';
      console.log('Gemini response.text extracted, length:', responseText?.length || 0);
    } catch (textError) {
      console.error('Error extracting response.text:', textError);
      throw new Error(`無法取得 Gemini 回應文字：${textError instanceof Error ? textError.message : String(textError)}`);
    }
    
    // 記錄回應資訊
    console.log('Gemini API response details:', {
      hasText: !!responseText,
      textLength: responseText?.length || 0,
      textPreview: responseText?.substring(0, 50) || 'N/A',
    });
    
    // 如果回應為空
    if (!responseText || responseText.trim().length === 0) {
      console.warn('Gemini returned empty response');
      return '抱歉，我無法產生回應。請稍後再試。';
    }
    
    console.log('Gemini API response text length:', responseText.length);
    console.log('Gemini API response preview:', responseText.substring(0, 100));
    return responseText;
  } catch (error) {
    console.error('Gemini API error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // 如果是 fetch failed，可能是網路問題，提供明確訊息
    if (error instanceof Error && (
      error.message.includes('fetch failed') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('network')
    )) {
      console.error('Gemini API network error - connection failed');
      throw new Error('Gemini API 連線失敗，請檢查網路連線或稍後再試');
    }
    
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
    
    // 其他錯誤，提供通用錯誤訊息
    throw new Error(`Gemini API 錯誤：${error instanceof Error ? error.message : String(error)}`);
  }
}

export default getGeminiClient;


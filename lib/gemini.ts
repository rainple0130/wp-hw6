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
 * 呼叫 Gemini API 取得回應
 * @param message 用戶訊息
 * @returns Gemini 回應文字
 */
export async function getGeminiResponse(message: string): Promise<string> {
  try {
    const client = getGeminiClient();
    
    console.log('Calling Gemini API with model: gemini-pro');
    
    // 使用 Gemini Pro（免費且穩定）
    const model = client.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        maxOutputTokens: 500, // 限制回應長度
        temperature: 0.7,
      },
    });
    
    // 將系統提示和用戶訊息組合
    const systemPrompt = '你是一個友善的 LINE Chatbot 助手，請用簡潔、親切的語氣回應用戶。';
    const fullPrompt = `${systemPrompt}\n\n用戶訊息：${message}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text() || '抱歉，我無法產生回應。';
    console.log('Gemini API response received, length:', response.length);
    return response;
  } catch (error) {
    console.error('Gemini API error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export default getGeminiClient;


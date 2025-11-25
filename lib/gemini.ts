import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

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
        maxOutputTokens: 2000, // 提高回應長度限制
        temperature: 0.7,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
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
    
    // 檢查回應是否被安全設定阻擋
    const responseText = result.response.text();
    const candidates = result.response.candidates || [];
    const firstCandidate = candidates[0];
    const finishReason = firstCandidate?.finishReason;
    const safetyRatings = firstCandidate?.safetyRatings || [];
    
    console.log('Gemini API response received:', {
      hasText: !!responseText,
      textLength: responseText?.length || 0,
      finishReason: finishReason,
      candidatesCount: candidates.length,
      safetyRatings: safetyRatings.map((r: any) => ({
        category: r.category,
        probability: r.probability,
      })),
    });
    
    // 如果回應被安全設定阻擋
    if (finishReason === 'SAFETY') {
      console.warn('Gemini response was blocked by safety settings');
      const blockedCategories = safetyRatings
        .filter((r: any) => r.probability === 'HIGH' || r.probability === 'MEDIUM')
        .map((r: any) => r.category);
      console.warn('Blocked categories:', blockedCategories);
      return '抱歉，我無法回應這個訊息，因為內容可能違反安全政策。請嘗試換個方式表達。';
    }
    
    // 如果回應被引用檢查阻擋
    if (finishReason === 'RECITATION') {
      console.warn('Gemini response was blocked by recitation check');
      return '抱歉，我無法回應這個訊息，因為可能涉及受版權保護的內容。';
    }
    
    // 如果回應為空
    if (!responseText || responseText.trim().length === 0) {
      console.warn('Gemini returned empty response, finishReason:', finishReason);
      return '抱歉，我無法產生回應。請稍後再試。';
    }
    
    console.log('Gemini API response text length:', responseText.length);
    console.log('Gemini API response preview:', responseText.substring(0, 100));
    return responseText;
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


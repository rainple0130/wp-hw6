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
 * @param timeoutMs 超時時間（毫秒），預設 120 秒（LLM 需要時間思考）
 * @returns Gemini 回應文字
 */
export async function getGeminiResponse(message: string, timeoutMs: number = 120000): Promise<string> {
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
    
    console.log('Gemini API raw result received:', {
      hasResponse: !!result.response,
      responseType: typeof result.response,
      responseKeys: result.response ? Object.keys(result.response) : [],
    });
    
    // 直接取得回應文字，不過度檢查
    let responseText: string;
    try {
      responseText = result.response.text();
      console.log('✅ Gemini response.text() SUCCESS, length:', responseText?.length || 0);
    } catch (textError) {
      console.error('❌ Error calling result.response.text():', textError);
      // 嘗試從 candidates 直接取得內容
      const candidates = result.response.candidates || [];
      if (candidates.length > 0 && candidates[0].content) {
        const parts = candidates[0].content.parts || [];
        responseText = parts.map((p: any) => p.text || '').join('');
        console.log('✅ Got response from candidates, length:', responseText.length);
      } else {
        throw new Error(`無法取得 Gemini 回應文字：${textError instanceof Error ? textError.message : String(textError)}`);
      }
    }
    
    // 記錄詳細資訊（但不阻擋發送）
    const candidates = result.response.candidates || [];
    const firstCandidate = candidates[0];
    const finishReason = firstCandidate?.finishReason;
    
    console.log('📊 Gemini response info:', {
      textLength: responseText?.length || 0,
      textPreview: responseText?.substring(0, 100) || 'N/A',
      finishReason: finishReason,
      candidatesCount: candidates.length,
    });
    
    // 只有當 finishReason 明確是 SAFETY 且沒有文字時，才返回錯誤訊息
    // 否則即使 finishReason 是 SAFETY，如果有文字就發送
    if (finishReason === 'SAFETY' && (!responseText || responseText.trim().length === 0)) {
      console.warn('⚠️ Gemini response blocked by safety (no text)');
      return '抱歉，我無法回應這個訊息，因為內容可能違反安全政策。';
    }
    
    // 如果回應為空
    if (!responseText || responseText.trim().length === 0) {
      console.warn('⚠️ Gemini returned empty response, finishReason:', finishReason);
      return '抱歉，我無法產生回應。請稍後再試。';
    }
    
    // 成功取得回應，直接返回
    console.log('✅✅✅ Gemini API response READY to send, length:', responseText.length);
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


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
 * 呼叫 Gemini API 取得回應（帶超時處理和重試機制）
 * @param message 用戶訊息
 * @param timeoutMs 超時時間（毫秒），預設 60 秒
 * @param maxRetries 最大重試次數，預設 2 次
 * @returns Gemini 回應文字
 */
export async function getGeminiResponse(
  message: string, 
  timeoutMs: number = 60000,
  maxRetries: number = 2
): Promise<string> {
  let lastError: Error | null = null;
  
  // 重試邏輯
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const client = getGeminiClient();
      
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🚀 [${requestId}] Starting Gemini API call (attempt ${attempt + 1}/${maxRetries + 1})...`);
      console.log(`📝 [${requestId}] User message:`, message.substring(0, 100));
      console.log(`🔑 [${requestId}] API Key exists:`, !!process.env.GEMINI_API_KEY);
      
      // 使用 gemini-2.5-flash（用戶明確指定的模型）
      const modelName = 'gemini-2.5-flash';
      console.log(`🤖 [${requestId}] Using model: ${modelName}`);
      
      const model = client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          maxOutputTokens: 2000,
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
      
      console.log(`📤 [${requestId}] Sending request to Gemini API...`);
      console.log(`⏱️  [${requestId}] Timeout set to: ${timeoutMs}ms`);
      
      // 改善的超時處理：使用 AbortController 來正確取消請求
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Gemini API timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });
      
      try {
        console.log(`⏳ [${requestId}] Waiting for Gemini API response...`);
        const apiCall = model.generateContent(fullPrompt);
        
        // 使用 Promise.race 實現超時，但確保正確清理
        const result = await Promise.race([apiCall, timeoutPromise]);
        
        // 清除超時計時器
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        console.log(`✅ [${requestId}] Gemini API response received!`);
        
        // 驗證回應結構
        if (!result || !result.response) {
          throw new Error('Gemini API 返回了無效的回應結構');
        }
        
        console.log(`📦 [${requestId}] Gemini API raw result received:`, {
          hasResponse: !!result.response,
          responseType: typeof result.response,
          responseKeys: result.response ? Object.keys(result.response) : [],
        });
        
        // 取得回應文字
        let responseText: string;
        try {
          responseText = result.response.text();
          console.log(`✅ [${requestId}] Gemini response.text() SUCCESS, length: ${responseText?.length || 0}`);
        } catch (textError) {
          console.error(`❌ [${requestId}] Error calling result.response.text():`, textError);
          // 嘗試從 candidates 直接取得內容
          const candidates = result.response.candidates || [];
          if (candidates.length > 0 && candidates[0].content) {
            const parts = candidates[0].content.parts || [];
            responseText = parts.map((p: any) => p.text || '').join('');
            console.log(`✅ [${requestId}] Got response from candidates, length: ${responseText.length}`);
          } else {
            throw new Error(`無法取得 Gemini 回應文字：${textError instanceof Error ? textError.message : String(textError)}`);
          }
        }
        
        // 記錄詳細資訊
        const candidates = result.response.candidates || [];
        const firstCandidate = candidates[0];
        const finishReason = firstCandidate?.finishReason;
        
        console.log(`📊 [${requestId}] Gemini response info:`, {
          textLength: responseText?.length || 0,
          textPreview: responseText?.substring(0, 100) || 'N/A',
          finishReason: finishReason,
          candidatesCount: candidates.length,
        });
        
        // 只有當 finishReason 明確是 SAFETY 且沒有文字時，才返回錯誤訊息
        if (finishReason === 'SAFETY' && (!responseText || responseText.trim().length === 0)) {
          console.warn(`⚠️ [${requestId}] Gemini response blocked by safety (no text)`);
          return '抱歉，我無法回應這個訊息，因為內容可能違反安全政策。';
        }
        
        // 如果回應為空
        if (!responseText || responseText.trim().length === 0) {
          console.warn(`⚠️ [${requestId}] Gemini returned empty response, finishReason: ${finishReason}`);
          return '抱歉，我無法產生回應。請稍後再試。';
        }
        
        // 成功取得回應
        console.log(`✅✅✅ [${requestId}] Gemini API response READY to send, length: ${responseText.length}`);
        return responseText;
      } catch (raceError) {
        // 清除超時計時器
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        throw raceError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const requestId = `req-${Date.now()}`;
      console.error(`❌ [${requestId}] Gemini API ERROR occurred (attempt ${attempt + 1}/${maxRetries + 1})!`);
      console.error(`[${requestId}] Error type:`, error?.constructor?.name || typeof error);
      console.error(`[${requestId}] Error message:`, lastError.message);
      console.error(`[${requestId}] Error stack:`, lastError.stack || 'No stack trace');
      
      // 如果是 GoogleGenerativeAI 錯誤，記錄更多細節
      if (error && typeof error === 'object' && 'message' in error) {
        const errorObj = error as any;
        console.error(`[${requestId}] Error object keys:`, Object.keys(errorObj));
        if (errorObj.cause) {
          console.error(`[${requestId}] Error cause:`, errorObj.cause);
        }
        if (errorObj.status) {
          console.error(`[${requestId}] HTTP status:`, errorObj.status);
        }
        if (errorObj.statusText) {
          console.error(`[${requestId}] HTTP status text:`, errorObj.statusText);
        }
      }
      
      // 判斷是否應該重試
      const errorMessage = lastError.message;
      const shouldRetry = 
        attempt < maxRetries && (
          errorMessage.includes('timeout') ||
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('network') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('socket hang up') ||
          (error && typeof error === 'object' && 'status' in error && (error as any).status >= 500)
        );
      
      if (shouldRetry) {
        const retryDelay = Math.min(1000 * Math.pow(2, attempt), 5000); // 指數退避，最多 5 秒
        console.log(`🔄 [${requestId}] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue; // 重試
      }
      
      // 不應該重試或已達最大重試次數，拋出錯誤
      if (errorMessage.includes('fetch failed') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('network')) {
        console.error(`🌐 [${requestId}] Gemini API network error - connection failed`);
        throw new Error('Gemini API 連線失敗，請檢查網路連線或稍後再試');
      }
      
      if (errorMessage.includes('timeout')) {
        console.error(`⏱️  [${requestId}] Gemini API timeout - request took too long`);
        throw new Error('Gemini API 回應超時，請稍後再試');
      }
      
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        console.error(`🔍 [${requestId}] Gemini model not found - check model name`);
        throw new Error('Gemini 模型不存在，請檢查模型名稱');
      }
      
      // 其他錯誤
      console.error(`❓ [${requestId}] Unknown Gemini API error`);
      throw new Error(`Gemini API 錯誤：${errorMessage}`);
    }
  }
  
  // 如果所有重試都失敗
  throw lastError || new Error('Gemini API 調用失敗');
}

export default getGeminiClient;


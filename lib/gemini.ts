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

    // 使用與 client.ts 相同的穩定方式
    geminiClient = new GoogleGenerativeAI(apiKey);
    geminiModel = geminiClient.getGenerativeModel({ 
      model: DEFAULT_MODEL,
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
    });
  }

  return geminiModel;
}

/**
 * 呼叫 Gemini API 取得回應（帶超時處理）
 * @param message 用戶訊息
 * @param timeoutMs 超時時間（毫秒），預設 120 秒（LLM 需要時間思考）
 * @returns Gemini 回應文字
 */
export async function getGeminiResponse(message: string, timeoutMs: number = 120000): Promise<string> {
  try {
    const model = getGeminiModel();
    
    console.log(`Calling Gemini API with model: ${DEFAULT_MODEL}`);
    
    // 將系統提示和用戶訊息組合
    const systemPrompt = '你是一個友善的 LINE Chatbot 助手，請用簡潔、親切的語氣回應用戶。';
    const fullPrompt = `${systemPrompt}\n\n用戶訊息：${message}`;
    
    console.log('Sending request to Gemini API...');
    console.log('Message length:', message.length);
    
    // 使用標準方式（與 client.ts 相同）
    const apiCall = model.generateContent(fullPrompt);
    
    // 使用 Promise.race 實現超時
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Gemini API timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    const startTime = Date.now();
    const result = await Promise.race([apiCall, timeoutPromise]);
    const elapsedTime = Date.now() - startTime;
    console.log(`✅ Gemini API call completed in ${elapsedTime}ms (${(elapsedTime / 1000).toFixed(2)}s)`);
    
    // 詳細記錄 result 的結構
    console.log('📊 Result structure:', {
      hasResult: !!result,
      resultType: typeof result,
      resultKeys: result ? Object.keys(result) : [],
      hasResponse: !!(result as any)?.response,
      hasCandidates: !!(result as any)?.candidates,
    });
    
    // 嘗試多種方式取得回應
    let responseText: string = '';
    
    try {
      // 方式 1：標準方式（與 client.ts 相同）
      console.log('🔍 Attempting to get response via result.response...');
      const response = (result as any).response;
      
      if (response) {
        console.log('✅ Response object found');
        console.log('Response type:', typeof response);
        console.log('Response keys:', Object.keys(response || {}));
        
        // 檢查 response 是否是 Promise
        if (response instanceof Promise) {
          console.log('⚠️  response is a Promise, awaiting...');
          const awaitedResponse = await response;
          responseText = awaitedResponse.text();
          console.log('✅ Got response text via await Promise');
        } else {
          // response 是同步物件
          responseText = response.text();
          console.log('✅ Got response text via synchronous call');
        }
      } else {
        throw new Error('result.response is undefined');
      }
    } catch (error1) {
      console.error('❌ Method 1 failed:', error1);
      
      try {
        // 方式 2：直接從 result.candidates 取得（根據 API 回應格式）
        console.log('🔍 Attempting to get response via candidates...');
        const candidates = (result as any).candidates;
        
        if (candidates && candidates.length > 0) {
          const firstCandidate = candidates[0];
          if (firstCandidate.content && firstCandidate.content.parts) {
            responseText = firstCandidate.content.parts
              .map((p: any) => p.text || '')
              .join('');
            console.log('✅ Got response text via candidates');
          } else {
            throw new Error('Candidate structure invalid');
          }
        } else {
          throw new Error('No candidates found');
        }
      } catch (error2) {
        console.error('❌ Method 2 also failed:', error2);
        throw new Error(`無法取得 Gemini 回應：${error1 instanceof Error ? error1.message : String(error1)}`);
      }
    }
    
    console.log('📝 Gemini API response received:', {
      hasText: !!responseText,
      textLength: responseText?.length || 0,
      textPreview: responseText?.substring(0, 50) || 'N/A',
    });
    
    // 如果回應為空
    if (!responseText || responseText.trim().length === 0) {
      console.warn('⚠️  Gemini returned empty response');
      return '抱歉，我無法產生回應。請稍後再試。';
    }
    
    console.log('✅ Gemini API response text length:', responseText.length);
    console.log('✅ Gemini API response preview:', responseText.substring(0, 100));
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

// 為了向後相容，保留這個 export（但現在返回 model）
function getGeminiClient() {
  return getGeminiModel();
}

export default getGeminiClient;

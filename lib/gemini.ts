import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODEL = 'gemini-2.5-flash';

let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: any = null;

function getGeminiModel() {
  if (!geminiModel) {
    console.log('[Gemini] Initializing model...');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Gemini] ❌ GEMINI_API_KEY not set');
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    console.log('[Gemini] API key found, creating client...');
    geminiClient = new GoogleGenerativeAI(apiKey);
    console.log('[Gemini] Client created, getting model:', DEFAULT_MODEL);
    geminiModel = geminiClient.getGenerativeModel({ model: DEFAULT_MODEL });
    console.log('[Gemini] Model obtained successfully');
  } else {
    console.log('[Gemini] Using cached model');
  }
  return geminiModel;
}

export async function getGeminiResponse(message: string): Promise<string> {
  console.log('[Gemini] getGeminiResponse called with message:', message.substring(0, 50));
  
  const systemPrompt = '你是一個友善的 LINE Chatbot 助手，請用簡潔、親切的語氣回應用戶。';
  const prompt = `${systemPrompt}\n\n用戶訊息：${message}`;
  
  console.log('[Gemini] Prompt prepared, length:', prompt.length);
  console.log('[Gemini] Getting model...');
  
  const model = getGeminiModel();
  console.log('[Gemini] Model obtained, calling generateContent...');
  
  const result = await model.generateContent(prompt);
  console.log('[Gemini] generateContent returned, getting response...');
  
  const response = await result.response;
  console.log('[Gemini] response obtained, calling text()...');
  
  const text = response.text();
  console.log('[Gemini] text() returned, length:', text.length);

  return text || '抱歉，我無法產生回應。請稍後再試。';
}

export { getGeminiModel };
export default getGeminiResponse;

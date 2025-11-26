import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODEL = 'gemini-2.5-flash';

let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: any = null;

function getGeminiModel() {
  if (!geminiModel) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
    geminiModel = geminiClient.getGenerativeModel({ model: DEFAULT_MODEL });
  }
  return geminiModel;
}

export async function getGeminiResponse(message: string): Promise<string> {
  const systemPrompt = '你是一個友善的 LINE Chatbot 助手，請用簡潔、親切的語氣回應用戶。';
  const prompt = `${systemPrompt}\n\n用戶訊息：${message}`;

  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return text || '抱歉，我無法產生回應。請稍後再試。';
}

export { getGeminiModel };
export default getGeminiResponse;

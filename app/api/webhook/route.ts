import { NextRequest, NextResponse } from 'next/server';
import { validateSignature } from '@line/bot-sdk';
import getBot from '@/bot';

export async function POST(request: NextRequest) {
  try {
    // 取得請求 body
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';
    const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

    // 驗證 LINE signature
    if (!validateSignature(body, channelSecret, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 解析 webhook body
    const webhookBody = JSON.parse(body);

    // 轉換 Next.js Headers 為 IncomingHttpHeaders 格式
    const headers: Record<string, string | string[] | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // 建立完整的 RequestContext
    const url = new URL(request.url);
    const requestContext = {
      method: 'POST',
      path: '/api/webhook',
      query: Object.fromEntries(url.searchParams.entries()),
      headers: headers as any,
      rawBody: body,
      body: webhookBody,
      params: {},
      url: request.url,
    };

    // 使用 Bottender 的 request handler
    const bot = getBot();
    const requestHandler = bot.createRequestHandler();
    await requestHandler(webhookBody, requestContext);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// LINE webhook 需要支援 GET 請求進行驗證
export async function GET() {
  return NextResponse.json({ message: 'LINE Webhook is running' });
}


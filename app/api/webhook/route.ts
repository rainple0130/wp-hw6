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
    console.log('Processing webhook request...', {
      eventsCount: webhookBody.events?.length || 0,
      destination: webhookBody.destination,
      events: webhookBody.events?.map((e: any) => ({
        type: e.type,
        messageType: e.message?.type,
        text: e.message?.text?.substring(0, 50), // 只記錄前50個字元
      })),
      fullBody: JSON.stringify(webhookBody).substring(0, 500), // 記錄完整 body 的前500個字元
    });

    // 檢查環境變數
    const hasChannelSecret = !!process.env.LINE_CHANNEL_SECRET;
    const hasAccessToken = !!process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!hasChannelSecret || !hasAccessToken) {
      console.error('Missing environment variables:', {
        hasChannelSecret,
        hasAccessToken,
      });
      throw new Error('LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN must be set');
    }

    console.log('Environment variables check passed');

    let bot;
    try {
      bot = getBot();
      console.log('Bot initialized successfully');
    } catch (botError) {
      console.error('Failed to initialize bot:', botError);
      throw botError;
    }

    // 使用 Bottender 的 request handler
    const requestHandler = bot.createRequestHandler();
    
    try {
      // 確保 webhookBody 格式正確
      if (!webhookBody.events || webhookBody.events.length === 0) {
        console.log('No events in webhook body');
        return NextResponse.json({ success: true }, { status: 200 });
      }

      await requestHandler(webhookBody, requestContext);
      console.log('Request handler completed successfully');
    } catch (handlerError) {
      console.error('Request handler error:', handlerError);
      console.error('Error details:', {
        message: handlerError instanceof Error ? handlerError.message : String(handlerError),
        stack: handlerError instanceof Error ? handlerError.stack : 'No stack',
      });
      // 不拋出錯誤，讓 webhook 返回成功，避免 LINE 重試
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// LINE webhook 需要支援 GET 請求進行驗證
export async function GET(request: NextRequest) {
  const url = request.url;
  return NextResponse.json({ 
    message: 'LINE Webhook is running',
    path: '/api/webhook',
    url: url,
    timestamp: new Date().toISOString()
  });
}


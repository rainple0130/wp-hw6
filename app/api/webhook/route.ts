import { NextRequest, NextResponse } from 'next/server';
import { validateSignature } from '@line/bot-sdk';
import getBot from '@/bot';
import dbConnect from '@/lib/mongodb';

// 在模組載入時確保 MongoDB 連線已初始化
// 這樣可以在部署完成時就建立連線
if (process.env.MONGODB_URI) {
  // 非阻塞方式初始化，不等待結果
  dbConnect().catch((error) => {
    console.warn('MongoDB connection initialization warning (non-blocking):', error);
  });
}

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

    // 確保 webhookBody 格式正確
    if (!webhookBody.events || webhookBody.events.length === 0) {
      console.log('No events in webhook body');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 使用 Bottender 的 request handler
    const requestHandler = bot.createRequestHandler();
    
    // 關鍵修復：快速返回 webhook 響應，然後在背景處理事件
    // 這樣可以避免訊息塞車，每個事件都能獨立處理
    const processEvents = async () => {
      try {
        // 將每個事件分別處理，避免一個慢的事件阻塞其他事件
        const eventPromises = webhookBody.events.map(async (event: any) => {
          const singleEventWebhook = {
            ...webhookBody,
            events: [event], // 只包含當前事件
          };
          
          try {
            await requestHandler(singleEventWebhook, requestContext);
            console.log(`Event ${event.type} (${event.message?.type || 'N/A'}) processed successfully`);
          } catch (eventError) {
            console.error(`Error processing event ${event.type}:`, eventError);
            console.error('Event error details:', {
              message: eventError instanceof Error ? eventError.message : String(eventError),
              stack: eventError instanceof Error ? eventError.stack : 'No stack',
              eventType: event.type,
              messageType: event.message?.type,
            });
            // 不拋出錯誤，讓其他事件可以繼續處理
          }
        });
        
        // 並發處理所有事件，但等待所有完成（用 Promise.allSettled 避免一個失敗影響其他）
        await Promise.allSettled(eventPromises);
        console.log('All events processed');
      } catch (handlerError) {
        console.error('Request handler error:', handlerError);
        console.error('Error details:', {
          message: handlerError instanceof Error ? handlerError.message : String(handlerError),
          stack: handlerError instanceof Error ? handlerError.stack : 'No stack',
        });
        // 不拋出錯誤，讓 webhook 返回成功，避免 LINE 重試
      }
    };

    // 在背景處理事件，不阻塞 webhook 響應
    // 使用 setImmediate 確保響應先返回
    setImmediate(() => {
      processEvents().catch((error) => {
        console.error('Background event processing error:', error);
      });
    });

    // 立即返回成功響應，讓 LINE 知道我們已收到事件
    // 實際處理在背景進行
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


import { LineBot } from 'bottender';
import { handleTextMessage, handlePostback } from './handlers/messages';
import dbConnect from '@/lib/mongodb';

// 使用 lazy initialization 避免建置時檢查環境變數
let bot: LineBot | null = null;

function getBot(): LineBot {
  if (!bot) {
    const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

    if (!channelSecret || !accessToken) {
      throw new Error(
        'LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN must be set'
      );
    }

    bot = new LineBot({
      channelSecret,
      accessToken,
    });

    // 初始化 session store（如果需要，在背景執行）
    bot.initSessionStore().catch((sessionError) => {
      console.warn('Session store initialization failed (non-critical):', sessionError);
    });

    // 處理文字訊息
    bot.onEvent(async (context) => {
      try {
        const event = context.event;
        
        // Bottender 將原始事件包裝在 _rawEvent 中
        const rawEvent = (event as any)?._rawEvent || event;
        
        console.log('Bot event received:', {
          type: rawEvent?.type,
          hasEvent: !!event,
          hasRawEvent: !!(event as any)?._rawEvent,
          timestamp: new Date().toISOString(),
        });

        // 連接到 MongoDB（阻塞式，等待連線完成）
        // 如果沒有設定 MONGODB_URI，跳過連線
        if (process.env.MONGODB_URI) {
          try {
            console.log('Connecting to MongoDB (blocking)...');
            await dbConnect();
            console.log('MongoDB connection established');
          } catch (dbError) {
            console.error('MongoDB connection failed, but continuing bot operation:', dbError);
            // 即使 MongoDB 連線失敗，也繼續處理 bot 訊息
            // 這樣 bot 仍然可以回應，只是無法使用資料庫功能
          }
        }

        // 檢查事件是否存在
        if (!rawEvent || !rawEvent.type) {
          console.error('Invalid event structure:', { event, rawEvent });
          return;
        }

        // 處理文字訊息
        if (rawEvent.type === 'message' && rawEvent.message?.type === 'text') {
          const messageText = rawEvent.message.text || '';
          console.log('Processing text message:', {
            text: messageText,
            length: messageText.length,
            eventType: rawEvent.type,
            messageType: rawEvent.message.type
          });
          try {
            await handleTextMessage(context);
            console.log('Text message handled successfully');
          } catch (handleError) {
            console.error('Error in handleTextMessage:', handleError);
            // 如果 handleTextMessage 出錯，嘗試發送預設回應
            try {
              await context.sendText(`你說了：${messageText}`);
            } catch (sendError) {
              console.error('Failed to send fallback message:', sendError);
            }
          }
        }
        // 處理 Postback 事件
        else if (rawEvent.type === 'postback') {
          console.log('Processing postback event:', rawEvent.postback?.data);
          await handlePostback(context);
          console.log('Postback handled successfully');
        }
        // 處理其他類型的訊息（圖片、影片等）
        else if (rawEvent.type === 'message') {
          console.log('Processing other message type:', rawEvent.message?.type);
          await context.sendText('我目前只支援文字訊息，請傳送文字給我！');
        }
        // 處理其他事件（follow, unfollow, join, leave 等）
        else {
          console.log('Processing other event type:', rawEvent.type);
          // 不回應這些事件，避免不必要的訊息
        }
      } catch (error) {
        console.error('Error in bot event handler:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        
        // 檢查是否是 LINE API 錯誤
        const isLineApiError = error instanceof Error && (
          error.message.includes('socket hang up') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('timeout')
        );

        if (isLineApiError) {
          console.error('LINE API connection error, this is usually temporary');
          // LINE API 錯誤通常是暫時的，不拋出錯誤，讓 webhook 返回成功
          // 這樣 LINE 不會重試
          return;
        }

        // 其他錯誤，嘗試發送錯誤訊息給用戶
        try {
          await context.sendText('抱歉，處理訊息時發生錯誤。');
        } catch (sendError) {
          console.error('Failed to send error message:', sendError);
          // 如果連錯誤訊息都發送失敗，可能是 LINE API 問題，不拋出錯誤
          return;
        }
        // 不拋出錯誤，讓 webhook 返回成功，避免 LINE 重試
      }
    });
  }

  return bot;
}

export default getBot;



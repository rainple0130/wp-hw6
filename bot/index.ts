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

    // 處理文字訊息
    bot.onEvent(async (context) => {
      try {
        console.log('Bot event received:', {
          type: context.event.type,
          timestamp: new Date().toISOString(),
        });

        // 連接到 MongoDB（可選，如果需要儲存資料）
        try {
          await dbConnect();
        } catch (error) {
          console.error('MongoDB connection error:', error);
        }

        const event = context.event;

        // 處理文字訊息
        if (event.type === 'message' && event.message.type === 'text') {
          console.log('Processing text message:', event.message.text);
          await handleTextMessage(context);
          console.log('Text message handled successfully');
        }
        // 處理 Postback 事件
        else if (event.type === 'postback') {
          console.log('Processing postback event:', event.postback?.data);
          await handlePostback(context);
          console.log('Postback handled successfully');
        }
        // 處理其他事件
        else {
          console.log('Processing other event type:', event.type);
          await context.sendText('收到你的訊息了！');
        }
      } catch (error) {
        console.error('Error in bot event handler:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // 嘗試發送錯誤訊息給用戶
        try {
          await context.sendText('抱歉，處理訊息時發生錯誤。');
        } catch (sendError) {
          console.error('Failed to send error message:', sendError);
        }
        throw error;
      }
    });
  }

  return bot;
}

export default getBot;



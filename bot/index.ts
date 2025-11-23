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
      // 連接到 MongoDB（可選，如果需要儲存資料）
      try {
        await dbConnect();
      } catch (error) {
        console.error('MongoDB connection error:', error);
      }

      const event = context.event;

      // 處理文字訊息
      if (event.type === 'message' && event.message.type === 'text') {
        await handleTextMessage(context);
      }
      // 處理 Postback 事件
      else if (event.type === 'postback') {
        await handlePostback(context);
      }
      // 處理其他事件
      else {
        await context.sendText('收到你的訊息了！');
      }
    });
  }

  return bot;
}

export default getBot;



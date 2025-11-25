import { LineContext } from 'bottender';
import { getGeminiResponse } from '@/lib/gemini';

export async function handleTextMessage(context: LineContext) {
  try {
    const event = context.event;
    // Bottender 將原始事件包裝在 _rawEvent 中
    const rawEvent = (event as any)?._rawEvent || event;
    const originalText = rawEvent.type === 'message' && rawEvent.message?.type === 'text' 
      ? rawEvent.message.text 
      : '';
    const text = originalText.toLowerCase();

    console.log('Handling text message:', { 
      original: originalText, 
      lowercased: text,
      eventType: rawEvent.type,
      messageType: rawEvent.type === 'message' ? rawEvent.message?.type : 'N/A'
    });

    // 基本問候 - 檢查多種可能的寫法
    if (text.includes('你好') || text.includes('hello') || text.includes('hi') || text === 'hello' || text === 'hi') {
      console.log('Matched greeting pattern, sending greeting message');
      await context.sendText('你好！我是 LINE Chatbot，很高興認識你！');
      return;
    }

  // 選單指令
  if (text.includes('選單') || text.includes('menu')) {
    await context.sendButtonTemplate('請選擇一個選項：', {
      text: '請選擇一個選項：',
      actions: [
        {
          type: 'postback',
          label: '文字回應',
          data: 'action=text',
          text: '文字回應',
        },
        {
          type: 'postback',
          label: '輪播範例',
          data: 'action=carousel',
          text: '輪播範例',
        },
        {
          type: 'uri',
          label: '開啟網站',
          uri: 'https://line.me',
        },
      ],
    });
    return;
  }

  // 輪播範例
  if (text.includes('輪播') || text.includes('carousel')) {
    await context.sendCarouselTemplate('這是輪播範例：', [
      {
        thumbnailImageUrl: 'https://via.placeholder.com/300x200',
        title: '選項 1',
        text: '這是第一個選項的描述',
        actions: [
          {
            type: 'postback',
            label: '選擇',
            data: 'action=option1',
            text: '你選擇了選項 1',
          },
        ],
      },
      {
        thumbnailImageUrl: 'https://via.placeholder.com/300x200',
        title: '選項 2',
        text: '這是第二個選項的描述',
        actions: [
          {
            type: 'postback',
            label: '選擇',
            data: 'action=option2',
            text: '你選擇了選項 2',
          },
        ],
      },
      {
        thumbnailImageUrl: 'https://via.placeholder.com/300x200',
        title: '選項 3',
        text: '這是第三個選項的描述',
        actions: [
          {
            type: 'postback',
            label: '選擇',
            data: 'action=option3',
            text: '你選擇了選項 3',
          },
        ],
      },
    ]);
    return;
  }

  // 快速回覆範例
  if (text.includes('快速回覆') || text.includes('quick reply')) {
    await context.sendText('請選擇一個快速回覆選項：', {
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '選項 A',
              text: '我選擇了選項 A',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '選項 B',
              text: '我選擇了選項 B',
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '選項 C',
              text: '我選擇了選項 C',
            },
          },
        ],
      },
    });
    return;
  }

    // 預設回應 - 先 Echo，再呼叫 GPT
    const messageText = rawEvent.type === 'message' && rawEvent.message?.type === 'text' 
      ? rawEvent.message.text 
      : '';
    
    // 開發階段：先 echo 收到的訊息
    console.log('Echoing received message:', messageText);
    try {
      await context.sendText(`收到：${messageText}`);
    } catch (echoError) {
      console.error('Failed to send echo message:', echoError);
      // 如果 echo 失敗，繼續嘗試發送 Gemini 回應
    }
    
    // 呼叫 Gemini API 取得回應
    try {
      console.log('Calling Gemini API...');
      const geminiResponse = await getGeminiResponse(messageText);
      console.log('Gemini response received:', geminiResponse.substring(0, 100));
      
      // 發送 Gemini 回應（使用 try-catch 避免 LINE API 錯誤影響）
      try {
        await context.sendText(geminiResponse);
      } catch (sendError) {
        console.error('Failed to send Gemini response:', sendError);
        // LINE API 錯誤通常是暫時的，不拋出錯誤避免 webhook 重試
      }
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError);
      // 如果 API 失敗，嘗試發送錯誤訊息（但不強制）
      try {
        await context.sendText('抱歉，我暫時無法處理你的訊息。請稍後再試。');
      } catch (sendError) {
        console.error('Failed to send error message:', sendError);
        // 靜默處理，避免 webhook 重試
      }
    }
  } catch (error) {
    console.error('Error in handleTextMessage:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export async function handlePostback(context: LineContext) {
  const event = context.event;
  // Bottender 將原始事件包裝在 _rawEvent 中
  const rawEvent = (event as any)?._rawEvent || event;
  const data = rawEvent.postback?.data || '';

  if (data === 'action=text') {
    await context.sendText('這是一個文字回應範例！');
  } else if (data === 'action=carousel') {
    await context.sendCarouselTemplate('這是輪播範例：', [
      {
        thumbnailImageUrl: 'https://via.placeholder.com/300x200',
        title: '選項 1',
        text: '這是第一個選項的描述',
        actions: [
          {
            type: 'postback',
            label: '選擇',
            data: 'action=option1',
            text: '你選擇了選項 1',
          },
        ],
      },
      {
        thumbnailImageUrl: 'https://via.placeholder.com/300x200',
        title: '選項 2',
        text: '這是第二個選項的描述',
        actions: [
          {
            type: 'postback',
            label: '選擇',
            data: 'action=option2',
            text: '你選擇了選項 2',
          },
        ],
      },
    ]);
  } else if (data.startsWith('action=option')) {
    await context.sendText(`你選擇了 ${data.split('=')[1]}`);
  } else {
    await context.sendText('收到 postback 事件');
  }
}


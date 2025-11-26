import { Context, LineContext } from 'bottender';
import { getGeminiResponse } from '@/lib/gemini';

async function testGemini(): Promise<string> {
  return await getGeminiResponse('Testing Gemini');
}

export async function handleTextMessage(context: LineContext) {
  try {
    const event = context.event;
    // Bottender 將原始事件包裝在 _rawEvent 中
    const rawEvent = (event as any)?._rawEvent || event;
    const originalText = rawEvent.type === 'message' && rawEvent.message?.type === 'text' 
      ? rawEvent.message.text 
      : '';
    const text = originalText.toLowerCase();

    console.log('🔍 Handling text message:', { 
      original: originalText, 
      lowercased: text,
      eventType: rawEvent.type,
      messageType: rawEvent.type === 'message' ? rawEvent.message?.type : 'N/A'
    });

    // 注意：replyToken 只能使用一次，所以我們移除 echo，只回覆 Gemini 回應
    // DEBUG 特殊語法：直接回應，不呼叫 Gemini
    const trimmedText = text.trim();
    console.log('🔍 Checking for DEBUG command, trimmed text:', trimmedText);
    if (trimmedText.toUpperCase() === 'DEBUG' || trimmedText.toLowerCase() === 'debug') {
      console.log('✅ DEBUG command detected, sending direct response');
      try {
        await context.sendText('DEBUG 模式：機器人正常運作中！\n\n系統狀態：\n- Echo: 正常\n- Gemini API: 已設定\n- MongoDB: 已初始化');
        console.log('✅ DEBUG response sent successfully');
      } catch (debugError) {
        console.error('❌ Failed to send DEBUG response:', debugError);
        throw debugError;
      }
      return;
    }

    if (text.trim().toUpperCase() === 'TEST' || text.trim().toLowerCase() === 'test') {
      console.log('TEST command detected, sending test response');
      const response = await testGemini();
      await context.sendText(response);
      return;
    }


    // 基本問候 - 檢查多種可能的寫法
    if (text.includes('你好') || text.includes('hello') || text.includes('hi') || text === 'hello' || text === 'hi') {
      console.log('Matched greeting pattern, calling Gemini...');
      
      try {
        const geminiResponse = await getGeminiResponse(originalText);
        console.log('Gemini response received for greeting, length:', geminiResponse.length);
        
        // 只回覆 Gemini 回應（replyToken 只能使用一次）
        if (geminiResponse && geminiResponse.trim().length > 0) {
          await context.sendText(geminiResponse);
          console.log('✅ Gemini response sent successfully for greeting');
        } else {
          await context.sendText('你好！我是 LINE Chatbot，很高興認識你！');
        }
      } catch (geminiError) {
        console.error('Gemini API error for greeting:', geminiError);
        // 只發送問候訊息，不發送錯誤訊息
        await context.sendText('你好！我是 LINE Chatbot，很高興認識你！');
      }
      
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

    // 預設回應 - 呼叫 Gemini，然後一次回覆 echo + Gemini 回應
    const messageText = originalText;
    
    // 呼叫 Gemini API 取得回應
    try {
      console.log('[Handler] Calling Gemini API...');
      console.log('[Handler] Message text:', messageText);
      const geminiResponse = await getGeminiResponse(messageText);
      console.log('[Handler] Gemini response received, length:', geminiResponse.length);
      
      // 確保回應不為空
      if (!geminiResponse || geminiResponse.trim().length === 0) {
        console.warn('Gemini returned empty response, sending fallback message');
        await context.sendText('抱歉，我無法產生回應。請稍後再試。');
        return;
      }
      
      // 只回覆 Gemini 回應（replyToken 只能使用一次）
      await context.sendText(geminiResponse);
      console.log('✅ Gemini response sent successfully');
    } catch (geminiError) {
      console.error('[Handler] ❌ Gemini API error caught');
      console.error('[Handler] Error type:', geminiError?.constructor?.name);
      console.error('[Handler] Error message:', geminiError instanceof Error ? geminiError.message : String(geminiError));
      console.error('[Handler] Error stack:', geminiError instanceof Error ? geminiError.stack : 'No stack');
      
      // 如果 API 失敗，發送錯誤訊息
      try {
        const errorMessage = geminiError instanceof Error 
          ? geminiError.message 
          : 'Gemini API 發生錯誤';
        await context.sendText(`抱歉，處理你的訊息時發生錯誤：${errorMessage}`);
        console.log('✅ Error message sent successfully');
      } catch (sendError) {
        console.error('Failed to send error message:', sendError);
        // 如果是 socket hang up，記錄但不拋出錯誤
        if (sendError instanceof Error && sendError.message.includes('socket hang up')) {
          console.warn('LINE API socket hang up on error message, this is usually temporary');
        }
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


import { Context, LineContext } from 'bottender';
import { getGeminiResponse } from '@/lib/gemini';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});
async function testGemini(): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Testing Gemini',
    config: {
      thinkingConfig: {
        thinkingBudget: 0,
      },
    }
  });
  console.log(response.text);
  return response.text || '';
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

    console.log('Handling text message:', { 
      original: originalText, 
      lowercased: text,
      eventType: rawEvent.type,
      messageType: rawEvent.type === 'message' ? rawEvent.message?.type : 'N/A'
    });

    // DEBUG 特殊語法：直接回應，不呼叫 Gemini
    if (text.trim().toUpperCase() === 'DEBUG' || text.trim().toLowerCase() === 'debug') {
      console.log('DEBUG command detected, sending direct response');
      await context.sendText('DEBUG 模式：機器人正常運作中！\n\n系統狀態：\n- Echo: 正常\n- Gemini API: 已設定\n- MongoDB: 已初始化');
      return;
    }

    if (text.trim().toUpperCase() === 'TEST' || text.trim().toLowerCase() === 'test') {
      console.log('TEST command detected, sending test response');
      const response = await testGemini();
      await context.sendText(response);
      return;
    }

    // 開發階段：先 echo 收到的訊息（必須在所有處理前發送）
    console.log('Echoing received message:', originalText);
    try {
      await context.sendText(`收到：${originalText}`);
      console.log('Echo message sent successfully');
    } catch (echoError) {
      console.error('Failed to send echo message:', echoError);
      // 如果是 socket hang up，可能是 LINE API 暫時問題，繼續處理
      if (echoError instanceof Error && echoError.message.includes('socket hang up')) {
        console.warn('LINE API socket hang up on echo, continuing...');
      } else {
        // 其他錯誤，記錄但不中斷
        console.error('Echo error details:', echoError);
      }
    }

    // 基本問候 - 檢查多種可能的寫法
    if (text.includes('你好') || text.includes('hello') || text.includes('hi') || text === 'hello' || text === 'hi') {
      console.log('Matched greeting pattern, sending greeting message');
      try {
        await context.sendText('你好！我是 LINE Chatbot，很高興認識你！');
        console.log('Greeting message sent successfully');
      } catch (greetingError) {
        console.error('Failed to send greeting message:', greetingError);
      }
      
      // 問候訊息後也呼叫 Gemini（等待完成，確保回應能發送）
      try {
        console.log('Calling Gemini API for greeting...');
        const geminiResponse = await getGeminiResponse(originalText);
        console.log('Gemini response received for greeting, length:', geminiResponse.length);
        
        // 確保回應不為空
        if (!geminiResponse || geminiResponse.trim().length === 0) {
          console.warn('Gemini returned empty response for greeting');
          return;
        }
        
        try {
          await context.sendText(geminiResponse);
          console.log('Gemini response sent successfully for greeting');
        } catch (sendError) {
          console.error('Failed to send Gemini response for greeting:', sendError);
          if (sendError instanceof Error && sendError.message.includes('socket hang up')) {
            console.warn('LINE API socket hang up on Gemini response for greeting');
          }
        }
      } catch (geminiError) {
        console.error('Gemini API error for greeting:', geminiError);
        console.error('Error details:', geminiError instanceof Error ? geminiError.message : String(geminiError));
        
        // 嘗試發送錯誤訊息給用戶
        try {
          const errorMessage = geminiError instanceof Error 
            ? geminiError.message 
            : 'Gemini API 發生錯誤';
          await context.sendText(`抱歉，處理你的訊息時發生錯誤：${errorMessage}`);
          console.log('Error message sent successfully for greeting');
        } catch (sendError) {
          console.error('Failed to send error message for greeting:', sendError);
        }
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

    // 預設回應 - 呼叫 Gemini（echo 已在上面發送）
    const messageText = originalText;
    
    // 呼叫 Gemini API 取得回應（等待完成，確保回應能發送）
    try {
      console.log('Calling Gemini API...');
      const geminiResponse = await getGeminiResponse(messageText);
      console.log('Gemini response received, length:', geminiResponse.length);
      
      // 確保回應不為空
      if (!geminiResponse || geminiResponse.trim().length === 0) {
        console.warn('Gemini returned empty response, sending fallback message');
        try {
          await context.sendText('抱歉，我無法產生回應。請稍後再試。');
        } catch (fallbackError) {
          console.error('Failed to send fallback message:', fallbackError);
        }
        return;
      }
      
      // 發送 Gemini 回應（使用 try-catch 避免 LINE API 錯誤影響）
      try {
        await context.sendText(geminiResponse);
        console.log('Gemini response sent successfully');
      } catch (sendError) {
        console.error('Failed to send Gemini response:', sendError);
        console.error('Send error details:', sendError instanceof Error ? sendError.message : String(sendError));
        // 如果是 socket hang up，記錄但不拋出錯誤
        if (sendError instanceof Error && sendError.message.includes('socket hang up')) {
          console.warn('LINE API socket hang up on Gemini response, this is usually temporary');
        }
        // LINE API 錯誤通常是暫時的，不拋出錯誤避免 webhook 重試
      }
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError);
      console.error('Error details:', geminiError instanceof Error ? geminiError.message : String(geminiError));
      
      // 如果 API 失敗，嘗試發送錯誤訊息（但不強制）
      try {
        const errorMessage = geminiError instanceof Error 
          ? geminiError.message 
          : 'Gemini API 發生錯誤';
        await context.sendText(`抱歉，處理你的訊息時發生錯誤：${errorMessage}`);
        console.log('Error message sent successfully');
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


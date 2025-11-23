import { LineContext } from 'bottender';

export async function handleTextMessage(context: LineContext) {
  const event = context.event;
  const text = (event.type === 'message' && event.message.type === 'text' 
    ? event.message.text 
    : '').toLowerCase();

  // 基本問候
  if (text.includes('你好') || text.includes('hello') || text.includes('hi')) {
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

  // 預設回應 - Echo
  const messageText = event.type === 'message' && event.message.type === 'text' 
    ? event.message.text 
    : '';
  await context.sendText(`你說了：${messageText}`);
}

export async function handlePostback(context: LineContext) {
  const data = context.event.postback?.data || '';

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


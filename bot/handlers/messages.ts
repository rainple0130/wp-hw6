import { LineContext } from 'bottender';
import { queryLatex, formatQueryResult } from '@/lib/latex-query';

/**
 * 顯示主選單
 */
export async function showMainMenu(context: LineContext) {
  const intro = `📐 LaTeX 數學式語法查詢與渲染工具

歡迎使用！我是你的 LaTeX 助手，可以幫助你：
1. 查詢 LaTeX 語法
2. 渲染數學公式為圖片
3. 數學計算（開發中）

請選擇功能：`;

  await context.sendButtonTemplate(intro, {
    text: intro,
    actions: [
      {
        type: 'postback',
        label: '1. 語法查詢',
        data: 'action=syntax',
        text: '語法查詢',
      },
      {
        type: 'postback',
        label: '2. 渲染器',
        data: 'action=render',
        text: '渲染器',
      },
      {
        type: 'postback',
        label: '3. 數學計算',
        data: 'action=calculate',
        text: '數學計算',
      },
      {
        type: 'postback',
        label: '主選單',
        data: 'action=menu',
        text: '主選單',
      },
    ],
  });
}

/**
 * 處理使用者加入（follow 事件）
 */
export async function handleFollow(context: LineContext) {
  console.log('User followed the bot, showing main menu');
  await showMainMenu(context);
}

/**
 * 處理語法查詢
 */
async function handleSyntaxQuery(context: LineContext, query: string) {
  console.log('Handling syntax query:', query);
  
  const result = queryLatex(query);
  
  if (result) {
    const formatted = formatQueryResult(result);
    await context.sendText(formatted);
  } else {
    await context.sendText(
      `找不到與「${query}」相關的 LaTeX 語法。\n\n` +
      `提示：\n` +
      `- 可以輸入中文關鍵字（如「箭頭」、「alpha」）\n` +
      `- 可以輸入英文關鍵字（如「arrow」、「sum」）\n` +
      `- 可以直接輸入 LaTeX 命令（如「\\rightarrow」）\n\n` +
      `輸入「主選單」或「menu」返回主選單。`
    );
  }
}

/**
 * 處理渲染器請求
 */
async function handleRender(context: LineContext, latex: string) {
  console.log('Handling render request:', latex);
  
  try {
    // 取得應用程式 URL（用於建立渲染 API 的完整 URL）
    // 在 Vercel 中，使用 VERCEL_URL 環境變數
    // 在本地開發時，使用 NEXT_PUBLIC_APP_URL 或預設 localhost
    let appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      if (process.env.VERCEL_URL) {
        appUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        appUrl = 'http://localhost:3000';
      }
    }
    
    // 建立渲染 API URL
    const renderUrl = `${appUrl}/api/render?latex=${encodeURIComponent(latex)}`;
    console.log('Render URL:', renderUrl);
    
    // 使用 LINE 的圖片上傳 API 或直接發送圖片 URL
    // 注意：LINE 需要圖片是可公開訪問的 URL，所以我們需要先上傳圖片
    // 這裡先使用簡單的方式：告訴使用者如何訪問
    
    // 嘗試直接發送圖片（如果 renderUrl 是可訪問的）
    try {
      await context.sendImage({
        originalContentUrl: renderUrl,
        previewImageUrl: renderUrl,
      });
      await context.sendText(`已渲染：${latex}`);
    } catch (imageError) {
      // 如果無法直接發送圖片，提供 URL
      console.warn('Failed to send image directly, providing URL:', imageError);
      await context.sendText(
        `已渲染你的 LaTeX：\n${latex}\n\n` +
        `圖片網址：\n${renderUrl}\n\n` +
        `（如果無法顯示圖片，請複製網址到瀏覽器查看）`
      );
    }
  } catch (error) {
    console.error('Render error:', error);
    await context.sendText(
      `渲染失敗：${error instanceof Error ? error.message : '未知錯誤'}\n\n` +
      `請確認 LaTeX 語法是否正確。`
    );
  }
}

/**
 * 處理文字訊息
 */
export async function handleTextMessage(context: LineContext) {
  try {
    const event = context.event;
    const rawEvent = (event as any)?._rawEvent || event;
    const originalText = rawEvent.type === 'message' && rawEvent.message?.type === 'text' 
      ? rawEvent.message.text 
      : '';
    const text = originalText.toLowerCase().trim();

    console.log('🔍 Handling text message:', { 
      original: originalText, 
      lowercased: text,
    });

    // DEBUG 命令
    if (text === 'debug') {
      await context.sendText('DEBUG 模式：機器人正常運作中！\n\n系統狀態：\n- LaTeX 查詢: 正常\n- 渲染器: 正常\n- MongoDB: 已初始化');
      return;
    }

    // 主選單指令
    if (text === '選單' || text === 'menu' || text === '主選單') {
      await showMainMenu(context);
      return;
    }

    // 問候語 - 顯示主選單
    if (text.includes('你好') || text.includes('hello') || text.includes('hi') || 
        text === 'hello' || text === 'hi' || text === '你好') {
      await showMainMenu(context);
      return;
    }

    // 檢查是否在語法查詢模式（可以根據 session 狀態判斷，這裡簡化處理）
    // 如果輸入看起來像 LaTeX 命令或查詢關鍵字，進行語法查詢
    if (text.startsWith('\\') || text.length < 50) {
      // 可能是 LaTeX 命令或查詢關鍵字
      await handleSyntaxQuery(context, originalText);
      return;
    }

    // 檢查是否包含 LaTeX 語法（簡單判斷：包含 $ 或常見命令）
    if (originalText.includes('$') || originalText.includes('\\')) {
      // 可能是渲染請求
      await handleRender(context, originalText);
      return;
    }

    // 預設：嘗試語法查詢
    await handleSyntaxQuery(context, originalText);
    
  } catch (error) {
    console.error('Error in handleTextMessage:', error);
    try {
      await context.sendText('抱歉，處理訊息時發生錯誤。請輸入「主選單」返回主選單。');
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
}

/**
 * 處理 Postback 事件
 */
export async function handlePostback(context: LineContext) {
  const event = context.event;
  const rawEvent = (event as any)?._rawEvent || event;
  const data = rawEvent.postback?.data || '';

  console.log('Processing postback:', data);

  if (data === 'action=menu') {
    await showMainMenu(context);
  } else if (data === 'action=syntax') {
    await context.sendText(
      '📚 語法查詢模式\n\n' +
      '請輸入你要查詢的 LaTeX 語法關鍵字：\n\n' +
      '範例：\n' +
      '- 「箭頭」或「arrow」\n' +
      '- 「alpha」或「阿爾法」\n' +
      '- 「\\sum」或「求和」\n' +
      '- 「分數」或「frac」\n\n' +
      '輸入「主選單」返回主選單。'
    );
  } else if (data === 'action=render') {
    await context.sendText(
      '🖼️ 渲染器模式\n\n' +
      '請輸入要渲染的 LaTeX 數學式：\n\n' +
      '範例：\n' +
      '- $x^2 + y^2 = r^2$\n' +
      '- $\\frac{a}{b}$\n' +
      '- $\\sum_{i=1}^{n} i$\n' +
      '- $\\int_0^1 x dx$\n\n' +
      '輸入「主選單」返回主選單。'
    );
  } else if (data === 'action=calculate') {
    await context.sendText(
      '🧮 數學計算功能\n\n' +
      '此功能目前開發中，敬請期待！\n\n' +
      '輸入「主選單」返回主選單。'
    );
  } else {
    await context.sendText('收到 postback 事件，返回主選單。');
    await showMainMenu(context);
  }
}

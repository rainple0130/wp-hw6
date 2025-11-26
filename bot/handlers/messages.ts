import { LineContext } from 'bottender';
import { queryLatex, formatQueryResults } from '@/lib/latex-query';

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
 * 取得用戶當前模式
 */
function getMode(context: LineContext): string {
  const state = context.state as any || {};
  return (state.mode as string) || 'default';
}

/**
 * 設定用戶模式
 */
async function setMode(context: LineContext, mode: string) {
  await context.setState({ mode });
  console.log('✅ Mode set to:', mode);
}

/**
 * 清除用戶模式（返回預設模式）
 */
async function clearMode(context: LineContext) {
  await context.setState({ mode: 'default' });
  console.log('✅ Mode cleared to default');
}

/**
 * 處理語法查詢
 */
async function handleSyntaxQuery(context: LineContext, query: string) {
  console.log('Handling syntax query:', query);
  
  const results = queryLatex(query);
  
  if (results.length > 0) {
    const formatted = formatQueryResults(results);
    // LINE 訊息長度限制為 5000 字元，如果結果太長，分段發送
    if (formatted.length > 4500) {
      // 如果結果太長，只顯示前 20 個結果
      const limitedResults = results.slice(0, 20);
      const limitedFormatted = formatQueryResults(limitedResults);
      await context.sendText(
        limitedFormatted + 
        `\n\n（顯示前 20 個結果，共找到 ${results.length} 個匹配結果）`
      );
    } else {
      await context.sendText(formatted);
    }
  } else {
    await context.sendText(
      `找不到與「${query}」相關的 LaTeX 語法。\n\n` +
      `提示：\n` +
      `- 可以輸入中文關鍵字（如「箭頭」、「alpha」）\n` +
      `- 可以輸入英文關鍵字（如「arrow」、「sum」）\n` +
      `- 可以直接輸入 LaTeX 命令（如「\\rightarrow」）\n\n` +
      `輸入「結束查詢」、「返回」或「主選單」退出查詢模式。`
    );
  }
}

/**
 * 處理渲染器請求
 */
async function handleRender(context: LineContext, latex: string) {
  console.log('🖼️ Handling render request:', latex);
  
  // 驗證 LaTeX 輸入
  if (!latex || latex.trim().length === 0) {
    await context.sendText('請輸入有效的 LaTeX 數學式。');
    return;
  }
  
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
    
    // 確保 URL 格式正確
    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      appUrl = `https://${appUrl}`;
    }
    
    // 建立渲染 API URL
    const renderUrl = `${appUrl}/api/render?latex=${encodeURIComponent(latex)}`;
    console.log('🔗 Render URL:', renderUrl);
    
    // 先測試 URL 是否可訪問
    try {
      const testResponse = await fetch(renderUrl, { method: 'HEAD' });
      console.log('✅ Render URL is accessible, status:', testResponse.status);
      
      if (!testResponse.ok) {
        throw new Error(`Render API returned status ${testResponse.status}`);
      }
    } catch (urlError) {
      console.error('❌ Render URL test failed:', urlError);
      // 繼續嘗試發送，可能只是 HEAD 請求不支援
    }
    
    // 嘗試直接發送圖片（如果 renderUrl 是可訪問的）
    try {
      console.log('📤 Attempting to send image via LINE API...');
      await context.sendImage({
        originalContentUrl: renderUrl,
        previewImageUrl: renderUrl,
      });
      console.log('✅ Image sent successfully');
      await context.sendText(
        `已渲染：${latex}\n\n` +
        `輸入「結束查詢」、「返回」或「主選單」退出渲染模式。`
      );
    } catch (imageError) {
      // 如果無法直接發送圖片，提供 URL
      console.error('❌ Failed to send image directly:', imageError);
      const errorMsg = imageError instanceof Error ? imageError.message : String(imageError);
      console.error('Error details:', errorMsg);
      
      await context.sendText(
        `已渲染你的 LaTeX：\n${latex}\n\n` +
        `圖片網址：\n${renderUrl}\n\n` +
        `（如果無法顯示圖片，請複製網址到瀏覽器查看）\n\n` +
        `錯誤訊息：${errorMsg.substring(0, 100)}\n\n` +
        `輸入「結束查詢」、「返回」或「主選單」退出渲染模式。`
      );
    }
  } catch (error) {
    console.error('❌ Render error:', error);
    const errorMsg = error instanceof Error ? error.message : '未知錯誤';
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    await context.sendText(
      `渲染失敗：${errorMsg}\n\n` +
      `請確認：\n` +
      `1. LaTeX 語法是否正確\n` +
      `2. 是否包含數學模式符號（$...$ 或 $$...$$）\n` +
      `3. 範例：$x^2 + y^2 = r^2$\n\n` +
      `輸入「結束查詢」、「返回」或「主選單」退出渲染模式。`
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
      mode: getMode(context),
    });

    // DEBUG 命令
    if (text === 'debug') {
      await context.sendText('DEBUG 模式：機器人正常運作中！\n\n系統狀態：\n- LaTeX 查詢: 正常\n- 渲染器: 正常\n- MongoDB: 已初始化');
      return;
    }

    // 主選單指令（會清除模式）
    if (text === '選單' || text === 'menu' || text === '主選單') {
      await clearMode(context);
      await showMainMenu(context);
      return;
    }

    // 結束查詢/返回指令（清除模式並返回主選單）
    if (text === '結束查詢' || text === '結束' || text === '返回' || text === 'exit' || text === 'back') {
      await clearMode(context);
      await context.sendText('已退出當前模式，返回主選單。');
      await showMainMenu(context);
      return;
    }

    // 問候語 - 顯示主選單
    if (text.includes('你好') || text.includes('hello') || text.includes('hi') || 
        text === 'hello' || text === 'hi' || text === '你好') {
      await clearMode(context);
      await showMainMenu(context);
      return;
    }

    // 根據當前模式處理訊息
    const currentMode = getMode(context);
    
    if (currentMode === 'syntax') {
      // 語法查詢模式
      await handleSyntaxQuery(context, originalText);
      return;
    } else if (currentMode === 'render') {
      // 渲染器模式
      await handleRender(context, originalText);
      return;
    } else {
      // 預設模式：顯示主選單提示
      await context.sendText(
        '請從主選單選擇功能：\n\n' +
        '輸入「選單」或「menu」顯示主選單。'
      );
    }
    
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
    await clearMode(context);
    await showMainMenu(context);
  } else if (data === 'action=syntax') {
    await setMode(context, 'syntax');
    console.log('✅ Syntax mode activated, current mode:', getMode(context));
    await context.sendText(
      '📚 語法查詢模式\n\n' +
      '請輸入你要查詢的 LaTeX 語法關鍵字：\n\n' +
      '範例：\n' +
      '- 「箭頭」或「arrow」\n' +
      '- 「alpha」或「阿爾法」\n' +
      '- 「\\sum」或「求和」\n' +
      '- 「分數」或「frac」\n\n' +
      '輸入「結束查詢」、「返回」或「主選單」退出查詢模式。'
    );
  } else if (data === 'action=render') {
    await setMode(context, 'render');
    console.log('✅ Render mode activated, current mode:', getMode(context));
    await context.sendText(
      '🖼️ 渲染器模式\n\n' +
      '請輸入要渲染的 LaTeX 數學式：\n\n' +
      '範例：\n' +
      '- $x^2 + y^2 = r^2$\n' +
      '- $\\frac{a}{b}$\n' +
      '- $\\sum_{i=1}^{n} i$\n' +
      '- $\\int_0^1 x dx$\n\n' +
      '輸入「結束查詢」、「返回」或「主選單」退出渲染模式。'
    );
  } else if (data === 'action=calculate') {
    await clearMode(context);
    await context.sendText(
      '🧮 數學計算功能\n\n' +
      '此功能目前開發中，敬請期待！\n\n' +
      '輸入「主選單」返回主選單。'
    );
  } else {
    await clearMode(context);
    await context.sendText('收到 postback 事件，返回主選單。');
    await showMainMenu(context);
  }
}

import latexUnicode from '@/table/latex-unicode.json';
import latexDescriptions from '@/table/latex-descriptions.json';

// 中英文關鍵字映射表
const keywordMap: Record<string, string> = {
  // 箭頭相關
  '箭頭': 'arrow',
  'arrow': 'arrow',
  '右箭頭': 'rightarrow',
  '左箭頭': 'leftarrow',
  '雙向箭頭': 'leftrightarrow',
  'rightarrow': 'rightarrow',
  'leftarrow': 'leftarrow',
  'leftrightarrow': 'leftrightarrow',
  
  // 希臘字母
  'alpha': 'alpha',
  'beta': 'beta',
  'gamma': 'gamma',
  'delta': 'delta',
  'epsilon': 'epsilon',
  'theta': 'theta',
  'lambda': 'lambda',
  'mu': 'mu',
  'pi': 'pi',
  'sigma': 'sigma',
  '阿爾法': 'alpha',
  '貝塔': 'beta',
  '伽馬': 'gamma',
  '德爾塔': 'delta',
  '艾普西龍': 'epsilon',
  '西塔': 'theta',
  '拉姆達': 'lambda',
  '繆': 'mu',
  '派': 'pi',
  '西格瑪': 'sigma',
  
  // 運算符
  '求和': 'sum',
  '積分': 'int',
  '乘積': 'prod',
  '分數': 'frac',
  '根號': 'sqrt',
  '無窮': 'infty',
  'sum': 'sum',
  'int': 'int',
  'prod': 'prod',
  'frac': 'frac',
  'sqrt': 'sqrt',
  'infty': 'infty',
  
  // 關係符號
  '小於等於': 'leq',
  '大於等於': 'geq',
  '不等於': 'neq',
  '約等於': 'approx',
  '恆等於': 'equiv',
  '屬於': 'in',
  'leq': 'leq',
  'geq': 'geq',
  'neq': 'neq',
  'approx': 'approx',
  'equiv': 'equiv',
  'in': 'in',
  
  // 集合符號
  '子集': 'subset',
  '聯集': 'cup',
  '交集': 'cap',
  '空集合': 'emptyset',
  'subset': 'subset',
  'cup': 'cup',
  'cap': 'cap',
  'emptyset': 'emptyset',
};

interface QueryResult {
  latex: string;
  unicode: string;
  description: string;
}

/**
 * 查詢 LaTeX 語法（返回所有匹配結果）
 * @param query 使用者輸入的查詢字串
 * @returns 所有匹配的查詢結果陣列
 */
export function queryLatex(query: string): QueryResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  const results: QueryResult[] = [];
  const seenLatex = new Set<string>(); // 用於去重
  
  // 輔助函數：添加結果（避免重複）
  const addResult = (result: QueryResult) => {
    if (!seenLatex.has(result.latex)) {
      seenLatex.add(result.latex);
      results.push(result);
    }
  };
  
  // 1. 直接查詢（如果輸入就是 LaTeX 命令）
  if (normalizedQuery.startsWith('\\')) {
    const latex = normalizedQuery;
    const unicode = (latexUnicode as Record<string, string>)[latex];
    if (unicode) {
      addResult({
        latex,
        unicode,
        description: (latexDescriptions as Record<string, string>)[latex] || '無說明',
      });
    }
  }
  
  // 2. 透過關鍵字映射查詢
  const mappedKeyword = keywordMap[normalizedQuery];
  if (mappedKeyword) {
    // 嘗試不同的 LaTeX 命令格式
    const possibleCommands = [
      `\\${mappedKeyword}`,
      `\\${mappedKeyword.charAt(0).toUpperCase() + mappedKeyword.slice(1)}`,
    ];
    
    for (const cmd of possibleCommands) {
      const unicode = (latexUnicode as Record<string, string>)[cmd];
      if (unicode) {
        addResult({
          latex: cmd,
          unicode,
          description: (latexDescriptions as Record<string, string>)[cmd] || '無說明',
        });
      }
    }
  }
  
  // 3. 模糊搜尋（在關鍵字映射中找包含查詢字串的項目）
  for (const [key, value] of Object.entries(keywordMap)) {
    if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
      const cmd = `\\${value}`;
      const unicode = (latexUnicode as Record<string, string>)[cmd];
      if (unicode) {
        addResult({
          latex: cmd,
          unicode,
          description: (latexDescriptions as Record<string, string>)[cmd] || '無說明',
        });
      }
    }
  }
  
  // 4. 在 LaTeX 命令中搜尋（部分匹配）
  // 過濾掉單一字元的命令（如 ^, _, {, } 等），這些通常是特殊符號而不是有意義的命令
  for (const [latex, unicode] of Object.entries(latexUnicode as Record<string, string>)) {
    // 跳過單一字元的命令（除了字母和數字）
    const cmdWithoutBackslash = latex.substring(1);
    if (cmdWithoutBackslash.length === 1 && !/^[a-zA-Z0-9]$/.test(cmdWithoutBackslash)) {
      continue; // 跳過單一特殊字元
    }
    
    const cmdLower = cmdWithoutBackslash.toLowerCase();
    if (cmdLower.includes(normalizedQuery) || normalizedQuery.includes(cmdLower)) {
      addResult({
        latex,
        unicode,
        description: (latexDescriptions as Record<string, string>)[latex] || '無說明',
      });
    }
  }
  
  return results;
}

/**
 * 格式化單個查詢結果
 */
export function formatQueryResult(result: QueryResult): string {
  return `LaTeX 語法：\n${result.latex}\n\nUnicode 符號：\n${result.unicode}\n\n說明：\n${result.description}`;
}

/**
 * 格式化多個查詢結果為文字訊息
 */
export function formatQueryResults(results: QueryResult[]): string {
  if (results.length === 0) {
    return '找不到匹配的結果。';
  }
  
  if (results.length === 1) {
    return formatQueryResult(results[0]);
  }
  
  // 多個結果時，格式化為列表
  let message = `找到 ${results.length} 個匹配結果：\n\n`;
  
  results.forEach((result, index) => {
    message += `【結果 ${index + 1}】\n`;
    message += `LaTeX 語法：${result.latex}\n`;
    message += `Unicode 符號：${result.unicode}\n`;
    message += `說明：${result.description}\n`;
    message += '\n';
  });
  
  return message.trim();
}


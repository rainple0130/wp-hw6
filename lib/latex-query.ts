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
 * 查詢 LaTeX 語法
 * @param query 使用者輸入的查詢字串
 * @returns 查詢結果，包含 LaTeX 語法、Unicode 符號和說明
 */
export function queryLatex(query: string): QueryResult | null {
  const normalizedQuery = query.trim().toLowerCase();
  
  // 1. 直接查詢（如果輸入就是 LaTeX 命令）
  if (normalizedQuery.startsWith('\\')) {
    const latex = normalizedQuery;
    const unicode = (latexUnicode as Record<string, string>)[latex];
    if (unicode) {
      return {
        latex,
        unicode,
        description: (latexDescriptions as Record<string, string>)[latex] || '無說明',
      };
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
        return {
          latex: cmd,
          unicode,
          description: (latexDescriptions as Record<string, string>)[cmd] || '無說明',
        };
      }
    }
  }
  
  // 3. 模糊搜尋（在關鍵字映射中找包含查詢字串的項目）
  for (const [key, value] of Object.entries(keywordMap)) {
    if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
      const cmd = `\\${value}`;
      const unicode = (latexUnicode as Record<string, string>)[cmd];
      if (unicode) {
        return {
          latex: cmd,
          unicode,
          description: (latexDescriptions as Record<string, string>)[cmd] || '無說明',
        };
      }
    }
  }
  
  // 4. 在 LaTeX 命令中搜尋（部分匹配）
  for (const [latex, unicode] of Object.entries(latexUnicode as Record<string, string>)) {
    const cmdWithoutBackslash = latex.substring(1).toLowerCase();
    if (cmdWithoutBackslash.includes(normalizedQuery) || normalizedQuery.includes(cmdWithoutBackslash)) {
      return {
        latex,
        unicode,
        description: (latexDescriptions as Record<string, string>)[latex] || '無說明',
      };
    }
  }
  
  return null;
}

/**
 * 格式化查詢結果為文字訊息
 */
export function formatQueryResult(result: QueryResult): string {
  return `LaTeX 語法：\n${result.latex}\n\nUnicode 符號：\n${result.unicode}\n\n說明：\n${result.description}`;
}


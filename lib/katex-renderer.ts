import katex from 'katex';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';

/**
 * 使用 KaTeX 渲染 LaTeX 並轉換為 PNG
 * @param latex LaTeX 字串（可以是數學模式或純 LaTeX 命令）
 * @param options 渲染選項
 * @returns PNG Buffer
 */
export async function renderLatexToPng(
  latex: string,
  options: {
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    padding?: number;
  } = {}
): Promise<Buffer> {
  const {
    fontSize = 20,
    color = '#000000',
    backgroundColor = '#FFFFFF',
    padding = 20,
  } = options;

  // 清理 LaTeX 字串（移除多餘的 $ 符號）
  let cleanedLatex = latex.trim();
  if (cleanedLatex.startsWith('$') && cleanedLatex.endsWith('$')) {
    cleanedLatex = cleanedLatex.slice(1, -1);
  }
  if (cleanedLatex.startsWith('$$') && cleanedLatex.endsWith('$$')) {
    cleanedLatex = cleanedLatex.slice(2, -2);
  }

  // 使用 KaTeX 渲染為 HTML
  const html = katex.renderToString(cleanedLatex, {
    throwOnError: false,
    displayMode: false,
    output: 'html',
    strict: false,
  });

  // 使用 JSDOM 解析 HTML 並提取 SVG
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const svgElement = document.querySelector('svg');

  if (!svgElement) {
    throw new Error('無法從 KaTeX 輸出中提取 SVG');
  }

  // 取得 SVG 字串
  const svgString = svgElement.outerHTML;

  // 使用 sharp 將 SVG 轉換為 PNG
  // 先取得 SVG 的尺寸
  const viewBox = svgElement.getAttribute('viewBox');
  let width = 400;
  let height = 100;

  if (viewBox) {
    const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
    if (vbWidth && vbHeight) {
      // 根據字體大小調整尺寸
      const scale = fontSize / 20;
      width = Math.ceil(vbWidth * scale) + padding * 2;
      height = Math.ceil(vbHeight * scale) + padding * 2;
    }
  }

  // 建立帶有背景的 SVG
  const svgWithBackground = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
      <g transform="translate(${padding}, ${padding})">
        ${svgElement.innerHTML}
      </g>
    </svg>
  `;

  // 轉換為 PNG
  const pngBuffer = await sharp(Buffer.from(svgWithBackground))
    .png()
    .toBuffer();

  return pngBuffer;
}

/**
 * 驗證 LaTeX 語法是否有效
 */
export function validateLatex(latex: string): { valid: boolean; error?: string } {
  try {
    const cleanedLatex = latex.trim().replace(/^\$+|\$+$/g, '');
    katex.renderToString(cleanedLatex, {
      throwOnError: true,
      displayMode: false,
    });
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : '未知錯誤',
    };
  }
}


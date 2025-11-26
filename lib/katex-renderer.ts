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

  // 取得 SVG 的原始尺寸
  const viewBox = svgElement.getAttribute('viewBox');
  let svgWidth = 400;
  let svgHeight = 100;

  if (viewBox) {
    const parts = viewBox.split(/\s+/);
    if (parts.length >= 4) {
      svgWidth = parseFloat(parts[2]) || svgWidth;
      svgHeight = parseFloat(parts[3]) || svgHeight;
    }
  }

  // 檢查 SVG 元素是否有 width 和 height 屬性
  const svgWidthAttr = svgElement.getAttribute('width');
  const svgHeightAttr = svgElement.getAttribute('height');
  
  if (svgWidthAttr) {
    const parsed = parseFloat(svgWidthAttr);
    if (!isNaN(parsed)) svgWidth = parsed;
  }
  if (svgHeightAttr) {
    const parsed = parseFloat(svgHeightAttr);
    if (!isNaN(parsed)) svgHeight = parsed;
  }

  // 根據字體大小調整 SVG 尺寸
  const scale = fontSize / 20;
  const scaledWidth = Math.ceil(svgWidth * scale);
  const scaledHeight = Math.ceil(svgHeight * scale);

  // 計算最終圖片尺寸（包含 padding）
  const finalWidth = scaledWidth + padding * 2;
  const finalHeight = scaledHeight + padding * 2;

  // 方法 1: 先將原始 SVG 轉換為 PNG，然後添加背景和 padding
  // 建立完整的 SVG（包含正確的尺寸和命名空間）
  const svgWithSize = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${scaledWidth}" height="${scaledHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${svgElement.innerHTML}
</svg>`;
  
  const originalSvgBuffer = Buffer.from(svgWithSize, 'utf-8');

  // 先將 SVG 轉換為 PNG（使用較高的解析度）
  let tempPng: Buffer;
  try {
    tempPng = await sharp(originalSvgBuffer, {
      density: 300,
    })
      .resize(Math.ceil(scaledWidth), Math.ceil(scaledHeight), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // 透明背景
      })
      .png()
      .toBuffer();
  } catch (sharpError) {
    console.error('Sharp conversion error:', sharpError);
    // 如果 sharp 轉換失敗，嘗試使用原始 SVG 尺寸
    tempPng = await sharp(originalSvgBuffer, {
      density: 300,
    })
      .png()
      .toBuffer();
  }

  // 解析背景顏色
  let bgColor: { r: number; g: number; b: number; alpha: number };
  if (backgroundColor === '#FFFFFF' || backgroundColor === 'white' || backgroundColor === '#fff') {
    bgColor = { r: 255, g: 255, b: 255, alpha: 1 };
  } else if (backgroundColor.startsWith('#')) {
    // 解析十六進位顏色
    const hex = backgroundColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    bgColor = { r, g, b, alpha: 1 };
  } else {
    // 預設白色
    bgColor = { r: 255, g: 255, b: 255, alpha: 1 };
  }

  // 建立最終的 PNG（添加白底和 padding）
  const pngBuffer = await sharp({
    create: {
      width: finalWidth,
      height: finalHeight,
      channels: 4,
      background: bgColor,
    },
  })
    .composite([
      {
        input: tempPng,
        left: padding,
        top: padding,
      },
    ])
    .png({
      quality: 100,
      compressionLevel: 6,
    })
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


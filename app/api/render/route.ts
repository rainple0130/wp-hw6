import { NextRequest, NextResponse } from 'next/server';
import { renderLatexToPng } from '@/lib/katex-renderer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latex, fontSize, color, backgroundColor, padding } = body;

    if (!latex || typeof latex !== 'string') {
      return NextResponse.json(
        { error: '請提供有效的 LaTeX 字串' },
        { status: 400 }
      );
    }

    // 渲染 LaTeX 為 PNG
    const pngBuffer = await renderLatexToPng(latex, {
      fontSize: fontSize || 20,
      color: color || '#000000',
      backgroundColor: backgroundColor || '#FFFFFF',
      padding: padding || 20,
    });

    // 回傳 PNG 圖片
    return new NextResponse(pngBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('LaTeX 渲染錯誤:', error);
    return NextResponse.json(
      {
        error: '渲染失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}

// 也支援 GET 請求（使用 query parameter）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latex = searchParams.get('latex');

    if (!latex) {
      return NextResponse.json(
        { error: '請提供 LaTeX 參數' },
        { status: 400 }
      );
    }

    const fontSize = searchParams.get('fontSize')
      ? Number(searchParams.get('fontSize'))
      : undefined;
    const color = searchParams.get('color') || undefined;
    const backgroundColor = searchParams.get('backgroundColor') || undefined;
    const padding = searchParams.get('padding')
      ? Number(searchParams.get('padding'))
      : undefined;

    const pngBuffer = await renderLatexToPng(latex, {
      fontSize,
      color,
      backgroundColor,
      padding,
    });

    return new NextResponse(pngBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('LaTeX 渲染錯誤:', error);
    return NextResponse.json(
      {
        error: '渲染失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}


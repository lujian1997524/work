import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.gei5.com';
    
    const response = await fetch(`${backendUrl}/api/queue/public/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('公共排队API代理错误:', error);
    return NextResponse.json(
      { error: '获取排队信息失败，请稍后重试' },
      { status: 500 }
    );
  }
}
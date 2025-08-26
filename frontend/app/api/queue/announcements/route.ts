import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/api';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.gei5.com';
    
    const response = await fetch(`${backendUrl}/api/queue/announcements`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('获取公告API代理错误:', error);
    return NextResponse.json(
      { error: '获取公告失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.gei5.com';
    
    const response = await fetch(`${backendUrl}/api/queue/announcements`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('发布公告API代理错误:', error);
    return NextResponse.json(
      { error: '发布公告失败，请稍后重试' },
      { status: 500 }
    );
  }
}
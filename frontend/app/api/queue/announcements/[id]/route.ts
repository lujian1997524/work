import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/api';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.gei5.com';
    
    const response = await fetch(`${backendUrl}/api/queue/announcements/${id}`, {
      method: 'PUT',
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
    console.error('编辑公告API代理错误:', error);
    return NextResponse.json(
      { error: '编辑公告失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.gei5.com';
    
    const response = await fetch(`${backendUrl}/api/queue/announcements/${id}`, {
      method: 'DELETE',
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
    console.error('删除公告API代理错误:', error);
    return NextResponse.json(
      { error: '删除公告失败，请稍后重试' },
      { status: 500 }
    );
  }
}
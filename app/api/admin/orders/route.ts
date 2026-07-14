import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { getAllOrders, updateOrderStatus, OrderRecord } from '@/lib/orders';

function checkAuth(ip: string, adminPassword: unknown) {
  if (!rateLimit(`admin-orders:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요' }, { status: 429 });
  }
  if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// 전체 주문 목록 (관리자용 — 채팅 로그 포함)
export async function POST(req: NextRequest) {
  const { adminPassword } = await req.json();
  const authError = checkAuth(getClientIp(req), adminPassword);
  if (authError) return authError;

  const orders: OrderRecord[] = getAllOrders();
  return NextResponse.json({ orders });
}

// 제작/배송 상태 갱신
export async function PATCH(req: NextRequest) {
  const { orderId, status, adminPassword } = await req.json();
  const authError = checkAuth(getClientIp(req), adminPassword);
  if (authError) return authError;

  if (!orderId || !['pending', 'in_production', 'shipped', 'delivered'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const updated = updateOrderStatus(orderId, status);
  if (!updated) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  return NextResponse.json({ order: updated });
}

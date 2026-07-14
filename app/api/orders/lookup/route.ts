import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { isEmailVerified } from '@/lib/emailVerification';
import { getOrdersByEmail, OrderRecord } from '@/lib/orders';

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 고객에게는 채팅로그/결제 캡처ID 등 내부용 필드는 빼고 돌려준다.
function sanitize(o: OrderRecord) {
  const { chatHistory, captureId, ...rest } = o;
  return rest;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`orders-lookup:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요' }, { status: 429 });
  }

  const { email } = await req.json();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  }

  if (!isEmailVerified(email)) {
    return NextResponse.json({ error: '이메일 인증이 필요합니다' }, { status: 401 });
  }

  const orders = getOrdersByEmail(email).map(sanitize);
  return NextResponse.json({ orders });
}

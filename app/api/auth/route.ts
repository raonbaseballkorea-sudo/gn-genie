import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { markEmailVerified } from '@/lib/emailVerification';

const resend = new Resend(process.env.RESEND_API_KEY);

const codeStore = new Map<string, { code: string; expires: number; attempts: number }>();

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { email, code } = await req.json();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  }

  if (code) {
    // 코드 검증 시도: IP + 이메일 기준으로 분당 5회로 제한해 brute force 방지
    if (!rateLimit(`verify:${ip}:${email}`, 5, 60_000)) {
      return NextResponse.json({ error: '잠시 후 다시 시도해주세요' }, { status: 429 });
    }

    const stored = codeStore.get(email);
    const valid = !!stored && Date.now() <= stored.expires && stored.code === code;

    if (!valid) {
      if (stored) stored.attempts += 1;
      // 코드 존재 여부/만료 여부를 구분해 알려주지 않음 (정보 노출 방지)
      return NextResponse.json({ error: '코드가 올바르지 않습니다' }, { status: 400 });
    }

    codeStore.delete(email);
    markEmailVerified(email);
    return NextResponse.json({ success: true });
  }

  // 코드 발송 요청: IP + 이메일 기준으로 시간당 3회로 제한
  if (!rateLimit(`request:${ip}:${email}`, 3, 60 * 60_000)) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요' }, { status: 429 });
  }

  const authCode = Math.floor(100000 + Math.random() * 900000).toString();
  codeStore.set(email, { code: authCode, expires: Date.now() + 10 * 60 * 1000, attempts: 0 });

  try {
    await resend.emails.send({
      from: 'GN Glove <noreply@30dayglove.com>',
      to: email,
      subject: 'GN Glove Verification Code',
      html: `<h2>Your verification code: <strong>${authCode}</strong></h2><p>Please enter this code within 10 minutes.</p>`,
    });
  } catch (e) {
    console.error('[AUTH] Failed to send verification email:', e);
    return NextResponse.json({ error: '이메일 발송에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
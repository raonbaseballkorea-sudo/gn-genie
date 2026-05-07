import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const codeStore = new Map<string, { code: string; expires: number }>();

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();

  if (code) {
    const stored = codeStore.get(email);
    if (!stored) return NextResponse.json({ error: '코드가 없습니다' }, { status: 400 });
    if (Date.now() > stored.expires) return NextResponse.json({ error: '코드가 만료됐습니다' }, { status: 400 });
    if (stored.code !== code) return NextResponse.json({ error: '코드가 틀렸습니다' }, { status: 400 });
    codeStore.delete(email);
    return NextResponse.json({ success: true });
  }

  const authCode = Math.floor(100000 + Math.random() * 900000).toString();
  codeStore.set(email, { code: authCode, expires: Date.now() + 10 * 60 * 1000 });

  await resend.emails.send({
    from: 'GN Glove <noreply@30dayglove.com>',
    to: email,
    subject: 'GN Glove Verification Code',
    html: `<h2>Your verification code: <strong>${authCode}</strong></h2><p>Please enter this code within 10 minutes.</p>`,
  });

  return NextResponse.json({ success: true });
}
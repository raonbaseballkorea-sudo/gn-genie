import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// /api/font-proxy/css가 돌려준 CSS 안의 실제 폰트 바이너리(woff2) 요청을 중계한다.
// SSRF 방지: fonts.gstatic.com 소스만 허용.
const ALLOWED_HOST = 'fonts.gstatic.com';

export async function GET(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const url = req.nextUrl.searchParams.get('url') || '';
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const res = await fetch(parsed.toString());
    if (!res.ok || !res.body) {
      return NextResponse.json({ error: 'Font file fetch failed' }, { status: 502 });
    }

    return new NextResponse(res.body, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'font/woff2',
        // gstatic 파일 경로에는 해시가 들어 있어 URL이 곧 캐시 키 — 영구 캐시 가능
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[font-proxy/file] Error:', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

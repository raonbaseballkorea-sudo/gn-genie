import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// Google Fonts(fonts.googleapis.com/fonts.gstatic.com)는 중국 만리방화벽에 막혀 있어,
// 자수 미리보기가 중국 고객 브라우저에서 엉뚱한 대체 폰트로 캡처되는 문제가 있었다.
// 이 라우트가 서버 쪽에서 대신 Google에 요청해(text= 파라미터로 필요한 글자만) CSS를
// 받아오고, 폰트 파일 URL을 우리 도메인(/api/font-proxy/file)으로 바꿔서 돌려준다.
// 그러면 고객 브라우저는 우리 도메인만 접속하면 되므로 중국에서도 정상 동작한다.

const GSTATIC_PREFIX = 'https://fonts.gstatic.com/';

function isSafeFamily(family: string): boolean {
  return /^[A-Za-z0-9 ]{1,60}$/.test(family);
}

export async function GET(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const family = req.nextUrl.searchParams.get('family') || '';
  const text = req.nextUrl.searchParams.get('text') || '';
  const weight = req.nextUrl.searchParams.get('weight');

  if (!isSafeFamily(family) || !text || text.length > 100) {
    return NextResponse.json({ error: 'Invalid family or text' }, { status: 400 });
  }

  const familyParam = weight && /^\d{1,3}$/.test(weight)
    ? `${family}:wght@${weight}`
    : family;

  const googleUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(familyParam)}&text=${encodeURIComponent(text)}&display=swap`;

  try {
    const res = await fetch(googleUrl, {
      headers: {
        // woff2를 받으려면 최신 브라우저 UA가 필요 — 요청자의 UA를 그대로 전달
        'User-Agent': req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Font fetch failed' }, { status: 502 });
    }

    const css = await res.text();
    const proxied = css.replace(
      new RegExp(GSTATIC_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^)\\s]+', 'g'),
      (match) => `/api/font-proxy/file?url=${encodeURIComponent(match)}`
    );

    return new NextResponse(proxied, {
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[font-proxy/css] Error:', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

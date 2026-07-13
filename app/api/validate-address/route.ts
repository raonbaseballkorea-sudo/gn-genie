import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// 배송 주소 검증 — 사람 자기신고를 그대로 믿지 않고, 우편번호↔도시가 실제로 맞는지 대조한다.
// 정책(오차단 방지가 최우선):
//  - 한국(KR): juso.go.kr 도로명주소 API로 정확 검증 (JUSO_API_KEY 필요; 없으면 스킵)
//  - 아래 신뢰 지원국: Zippopotam으로 우편번호 존재 + 도시 대조
//  - 그 외(CA·GB·CN·TW 등 포맷 민감/미지원): 검증 스킵 → 통과(최종 주문서 확인이 백스톱)
// 반환 ok=false 일 때만 폼이 재작성을 요구한다. checked=false는 "확인 못함(통과)".

// 실측(2026-07)으로 200을 확인한, 숫자 우편번호라 404=오류로 신뢰 가능한 국가들.
// 포맷에 민감한 CA/GB/IT 등은 의도적으로 제외(포맷 차이로 인한 오차단 방지).
const ZIPPO_SUPPORTED = new Set([
  'US', 'JP', 'DE', 'FR', 'ES', 'NL', 'PT', 'PH', 'BR', 'MX',
  'AU', 'CH', 'AT', 'BE', 'SE', 'PL', 'TH', 'IN',
]);

function normalizePostal(cc: string, raw: string): string {
  const p = (raw || '').trim();
  // 일본은 Zippopotam이 'xxx-xxxx' 하이픈 형식을 요구
  if (cc === 'JP') {
    const d = p.replace(/\D/g, '');
    if (d.length === 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  }
  return p;
}

// 도시명 느슨 비교(대소문자·공백·발음기호 무시, 양방향 부분일치)
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function validateKorea(street: string, city: string, postal: string) {
  const key = process.env.JUSO_API_KEY;
  if (!key) return { ok: true, checked: false, note: 'juso-key-missing' };

  const keyword = [street, city].filter(Boolean).join(' ').trim();
  if (!keyword) return { ok: true, checked: false, note: 'empty-keyword' };

  const url = `https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${encodeURIComponent(key)}&currentPage=1&countPerPage=20&resultType=json&keyword=${encodeURIComponent(keyword)}`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    const common = j?.results?.common;
    if (!common || common.errorCode !== '0') {
      // API 오류/키 문제 등은 주문을 막지 않는다(확인 못함으로 통과)
      return { ok: true, checked: false, note: `juso-error:${common?.errorCode ?? 'unknown'}` };
    }
    const list: any[] = j.results.juso || [];
    if (list.length === 0) return { ok: false, checked: true, reason: 'address_not_found' };

    const digits = (postal || '').replace(/\D/g, '');
    if (!digits) return { ok: false, checked: true, reason: 'postal_missing' };

    const match = list.some((x) => (x.zipNo || '').replace(/\D/g, '') === digits);
    if (!match) {
      return { ok: false, checked: true, reason: 'postal_mismatch', expected: list.slice(0, 3).map((x) => x.zipNo) };
    }
    return { ok: true, checked: true };
  } catch {
    return { ok: true, checked: false, note: 'juso-fetch-failed' };
  }
}

async function validateZippo(cc: string, city: string, postal: string) {
  const norm_postal = normalizePostal(cc, postal);
  if (!norm_postal) return { ok: false, checked: true, reason: 'postal_missing' };
  try {
    const r = await fetch(`https://api.zippopotam.us/${cc.toLowerCase()}/${encodeURIComponent(norm_postal)}`);
    if (r.status === 404) return { ok: false, checked: true, reason: 'postal_not_found' };
    if (!r.ok) return { ok: true, checked: false, note: `zippo-http:${r.status}` };
    const data = await r.json();
    const places: any[] = data.places || [];
    // 도시를 입력하지 않았으면 우편번호 존재만 확인하고 통과
    if (!city || !city.trim()) return { ok: true, checked: true };
    const b = norm(city);
    const cityMatch = places.some((p) => {
      const a = norm(p['place name']);
      return a && b && (a.includes(b) || b.includes(a));
    });
    if (!cityMatch) {
      return { ok: false, checked: true, reason: 'city_mismatch', expected: places.map((p) => p['place name']).slice(0, 3) };
    }
    return { ok: true, checked: true };
  } catch {
    return { ok: true, checked: false, note: 'zippo-fetch-failed' };
  }
}

export async function POST(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 30, 60_000)) {
    return NextResponse.json({ ok: true, checked: false, note: 'rate-limited' });
  }

  const { countryCode, postal, city, street } = await req.json();
  const cc = (countryCode || '').toString().trim().toUpperCase();

  if (!cc) return NextResponse.json({ ok: true, checked: false, note: 'no-country' });

  if (cc === 'KR') {
    return NextResponse.json(await validateKorea(street || '', city || '', postal || ''));
  }
  if (ZIPPO_SUPPORTED.has(cc)) {
    return NextResponse.json(await validateZippo(cc, city || '', postal || ''));
  }
  // 미지원국: 검증 스킵(통과)
  return NextResponse.json({ ok: true, checked: false, note: 'country-not-supported' });
}

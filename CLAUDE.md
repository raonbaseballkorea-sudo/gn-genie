# GN-GENIE — Claude Code 작업 가이드

## 프로젝트 개요
커스텀 야구 글러브 주문 챗봇 (Next.js App Router, TypeScript, TailwindCSS)
- 도메인: 30dayglove.com
- AI: Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) via `/api/chat`
- 이메일: Nodemailer + Hostinger SMTP (`smtp.hostinger.com:465`, user: `raonbaseball@30dayglove.com`)
- 결제: Stripe (환경변수 `STRIPE_PAYMENT_LINK`)

## 핵심 파일
| 파일 | 역할 |
|------|------|
| `app/page.tsx` | 메인 UI — 언어 선택 → 사진 업로드 → 챗 → 주문 확인 |
| `app/api/chat/route.ts` | Claude Haiku 스트리밍 API, 시스템 프롬프트 |
| `app/api/order/route.ts` | 주문 저장 + 이메일 발송 (고객용/관리자용) |
| `app/components/OrderSheet.tsx` | 주문서 렌더링 컴포넌트 (고객용/공장용) |
| `app/layout.tsx` | Google Fonts (CJK/Thai 자수 폰트) |
| `.env.local` | 환경변수 (SMTP_PASSWORD, STRIPE_PAYMENT_LINK 등) |

## 언어 지원 (12개)
`en ko ja zh es fr de it nl th tl pt`

언어 선택 UI → `chooseLanguage(lang)` → `selectedLanguageRef`에 저장 →
API 요청마다 `language` 필드로 전송 → 시스템 프롬프트의 `__LANGUAGE_DIRECTIVE__` 치환

## 주문서 분리 (중요)
- **고객용**: 선택한 언어로 출력, `orderSheetRef`로 캡처
- **공장용(zh)**: 간체 중국어로 출력, `factorySheetRef`로 캡처 (`position:absolute, left:-9999px`로 숨김)
- OrderSheet prop: `variant?: 'customer' | 'factory'`
- `isFactory ? 'zh' : orderData.customer_language`로 언어 전환
- `_zh` 필드들: `special_requests_zh`, `web_type_zh`, `part_zh`, `color_zh`, `wrist_zh` 등

## 사진 처리 로직
- Step 1~5: 매 API 요청에 사진 포함 (`photoNeededRef = true`)
- Step 6 (자수): AI가 `[[PHOTO_DONE]]` 마커 출력 → 이후 사진 전송 중단 (`photoNeededRef = false`)
- `[[PHOTO_DONE]]`은 프론트엔드에서 strip하여 사용자에게 미노출

## 자수 폰트 (3가지 스타일)
스크립트별 폰트 (`EMBROIDERY_FONTS` in OrderSheet.tsx):
| 언어 | script | block | elegant |
|------|--------|-------|---------|
| Latin | Brush Script MT | Arial Black | Times New Roman |
| 한국어 | Nanum Pen Script | Black Han Sans | Nanum Myeongjo |
| 일본어 | Yuji Syuku | Noto Sans JP | Noto Serif JP |
| 중국어 | Ma Shan Zheng | Noto Sans SC | Noto Serif SC |
| 태국어 | Mali | Kanit | Charm |

## 주문서 이미지 캡처 (html2canvas)
```ts
// 우측 잘림 방지 — scrollWidth/scrollHeight 필수
html2canvas(container, {
  scale: 1.5,
  width: container.scrollWidth,
  height: container.scrollHeight,
  windowWidth: container.scrollWidth,
  windowHeight: container.scrollHeight,
})
```
고객용 + 공장용 `Promise.all` 병렬 캡처

## 이메일 발송
- 관리자(`raonbaseballkorea@gmail.com`): 고객용 주문서 + 공장용 중국어 작업지시서 + 대화내역
- 고객: 고객용 주문서 + 결제 링크
- `Promise.all(emailJobs)` 병렬 발송

## 규칙 (반드시 준수)
- **수정 전 반드시 먼저 물어볼 것** — 생각을 먼저 말하고 허락 받은 후 파일 수정
- **커밋 후 자동 push 금지** — 로컬 확인 후 사용자가 push 지시할 때만
- git 상태 확인 시 반드시 `git fetch` 먼저 실행 (캐시 기반 주장 금지)

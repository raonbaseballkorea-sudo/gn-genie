// Next.js 서버 시작 시 1회 실행되는 훅 — 인앱 백그라운드 스케줄러를 등록한다.
// Hostinger Horizons는 상시 실행 Node 서버라서 이런 in-process 크론이 동작한다
// (Vercel 같은 서버리스였다면 프로세스가 요청마다 죽어 불가능).
export async function register() {
  // Node 서버 프로세스에서만 등록 (Edge 런타임/빌드 단계에서는 건너뜀).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // 같은 프로세스에서 register가 두 번 불려도 크론이 중복 등록되지 않도록 가드.
  const g = globalThis as unknown as { __weeklyCronRegistered?: boolean };
  if (g.__weeklyCronRegistered) return;
  g.__weeklyCronRegistered = true;

  const cron = (await import('node-cron')).default;
  const { runWeeklySettlement } = await import('@/lib/weeklySettlement');

  // 매주 월요일 09:00 KST — 막 끝난 지난 주의 결제완료 주문을 정산 메일로 발송.
  cron.schedule(
    '0 9 * * 1',
    async () => {
      try {
        const r = await runWeeklySettlement(true);
        console.log(`[scheduler] weekly settlement sent: ${r.week} (${r.paid} paid)`);
      } catch (e) {
        console.error('[scheduler] weekly settlement failed:', e);
      }
    },
    { timezone: 'Asia/Seoul' }
  );

  console.log('[scheduler] weekly settlement cron registered (Mon 09:00 KST)');
}

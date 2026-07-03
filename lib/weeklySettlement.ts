import * as XLSX from 'xlsx';
import { getPaidOrdersBetween, kstIsoWeek } from '@/lib/orders';
import { transporter, SMTP_USER, OWNER_EMAIL } from '@/lib/mailer';

// 주간 결제완료 정산 — 지난 주(usePrev=true) 또는 이번 주의 결제완료 주문을 엑셀로 만들어 Robin에게 메일 발송.
// 인앱 스케줄러(instrumentation.ts, 매주 월요일 09:00 KST)와 수동 호출(GET /api/order?token=...)이 공유.
// 0건이어도 발송 — 스케줄러가 살아있음을 Robin이 확인할 수 있게.
export async function runWeeklySettlement(usePrev: boolean): Promise<{ week: string; paid: number }> {
  const current = kstIsoWeek(new Date());
  // 지난 주의 한 시점(현재 주 시작 3일 전)으로 지난 주 범위를 구함. (KST 기준)
  const target = usePrev ? kstIsoWeek(new Date(current.start.getTime() - 3 * 86400000)) : current;
  const { start, end, key: weekKey } = target;

  const paidOrders = getPaidOrdersBetween(start, end);

  const rows = paidOrders.map((o) => ({
    'Order #': o.orderId,
    'Order Date': o.orderDate,
    'Paid At': o.paidAt,
    'Name': o.customer?.name,
    'Email': o.customer?.email,
    'Phone': o.customer?.phone,
    'Address': o.customer?.address,
    // 스펙 4가지를 한 줄로 합쳐 송장 품명으로 사용
    'Product': [o.sport, o.size, o.position, o.hand].filter(Boolean).join(' / '),
  }));

  const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
  if (rows.length > 0) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, weekKey);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    attachments.push({
      filename: `paid-orders-${weekKey}.xlsx`,
      content: buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  await transporter.sendMail({
    from: `GN Glove <${SMTP_USER}>`,
    to: OWNER_EMAIL,
    subject: `Weekly Paid Orders — ${weekKey} (${rows.length} paid)`,
    html:
      rows.length > 0
        ? `<p>Paid orders for <strong>${weekKey}</strong> attached. Total: <strong>${rows.length} paid</strong>.</p>`
        : `<p>No paid orders for <strong>${weekKey}</strong>.</p>`,
    attachments,
  });

  return { week: weekKey, paid: rows.length };
}

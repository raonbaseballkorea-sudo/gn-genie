import * as fs from 'fs';
import * as path from 'path';

// 주문 저장 형식(느슨) — 결제 관련 필드는 웹훅이 나중에 채움
export interface OrderRecord {
  orderId?: string;
  orderDate?: string;
  customer?: { name?: string; email?: string; phone?: string; address?: string };
  sport?: string;
  size?: string;
  position?: string;
  hand?: string;
  paid?: boolean;
  paidAt?: string;
  amountPaid?: string;
  captureId?: string;
  [k: string]: any;
}

const ordersDir = path.join(process.cwd(), 'orders');

// orders/2026-W27.json 형식의 주차 파일 경로 목록
function weekFilePaths(): string[] {
  if (!fs.existsSync(ordersDir)) return [];
  return fs
    .readdirSync(ordersDir)
    .filter((f) => /^\d{4}-W\d{2}\.json$/.test(f))
    .map((f) => path.join(ordersDir, f));
}

function readOrders(filePath: string): OrderRecord[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

// 결제(PayPal 웹훅)와 주문을 이메일로 매칭해 해당 주문을 paid로 표시.
// NCP 고정 링크가 orderId를 못 실어보내므로 이메일이 유일한 매칭 키 — 완벽하진 않음(고객이 다른 PayPal 이메일로 결제하면 빗나감).
// 같은 이메일의 미결제 주문이 여러 건이면 가장 최근 주문을 결제로 간주. 매칭 실패 시 null 반환(호출측에서 로깅).
export function markOrderPaid(
  email: string,
  info: { amountPaid?: string; paidAt: string; captureId?: string }
): OrderRecord | null {
  if (!email) return null;
  const target = email.trim().toLowerCase();

  let best: { filePath: string; orders: OrderRecord[]; idx: number; ts: number } | null = null;

  for (const filePath of weekFilePaths()) {
    const orders = readOrders(filePath);
    for (let idx = 0; idx < orders.length; idx++) {
      const o = orders[idx];
      if (o.paid) continue;
      const oe = (o.customer?.email || '').trim().toLowerCase();
      if (oe && oe === target) {
        const ts = Date.parse(o.orderDate || '') || 0;
        if (!best || ts >= best.ts) best = { filePath, orders, idx, ts };
      }
    }
  }

  if (!best) return null;

  const order = best.orders[best.idx];
  order.paid = true;
  order.paidAt = info.paidAt;
  if (info.amountPaid) order.amountPaid = info.amountPaid;
  if (info.captureId) order.captureId = info.captureId;

  fs.writeFileSync(best.filePath, JSON.stringify(best.orders, null, 2));
  return order;
}

// paidAt이 [start, end) 범위에 드는 결제완료 주문 전체 (주차 파일에 상관없이 스캔 — 주문/결제 주가 다를 수 있으므로)
export function getPaidOrdersBetween(start: Date, end: Date): OrderRecord[] {
  const result: OrderRecord[] = [];
  for (const filePath of weekFilePaths()) {
    for (const o of readOrders(filePath)) {
      if (!o.paid || !o.paidAt) continue;
      const t = Date.parse(o.paidAt);
      if (!Number.isNaN(t) && t >= start.getTime() && t < end.getTime()) {
        result.push(o);
      }
    }
  }
  return result;
}

// 주어진 날짜가 속한 ISO 주의 월요일 00:00(UTC)
export function isoWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // 월=1 ... 일=7
  d.setUTCDate(d.getUTCDate() - (day - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

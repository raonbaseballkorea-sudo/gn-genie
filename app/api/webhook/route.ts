import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = 'raonbaseballkorea@gmail.com';

// PayPal REST API base — 라이브는 기본값, 샌드박스 테스트 시 PAYPAL_API_BASE=https://api-m.sandbox.paypal.com 로 설정
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';

// PayPal이 동일 이벤트를 재전송할 수 있어, 처리한 이벤트 ID를 기억해 중복 메일 발송을 막음
const processedEvents = new Map<string, number>();
const PROCESSED_TTL_MS = 24 * 60 * 60 * 1000;

function alreadyProcessed(eventId: string): boolean {
  const now = Date.now();
  for (const [id, ts] of processedEvents) {
    if (now - ts > PROCESSED_TTL_MS) processedEvents.delete(id);
  }
  if (processedEvents.has(eventId)) return true;
  processedEvents.set(eventId, now);
  return false;
}

// client_credentials 로 PayPal 액세스 토큰 발급 (웹훅 서명검증 API 호출에 필요)
async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('PAYPAL_CLIENT_ID/SECRET not configured');

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal token request failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// PayPal 웹훅 서명 검증 — 전송 헤더 + 대시보드의 Webhook ID + 원본 바디를 PayPal에 그대로 보내 확인
async function verifyWebhook(req: NextRequest, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error('PAYPAL_WEBHOOK_ID not configured');
    return false;
  }

  const token = await getAccessToken();
  const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: req.headers.get('paypal-auth-algo'),
      cert_url: req.headers.get('paypal-cert-url'),
      transmission_id: req.headers.get('paypal-transmission-id'),
      transmission_sig: req.headers.get('paypal-transmission-sig'),
      transmission_time: req.headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      // event 는 파싱하지 않은 원본 바디를 그대로 넣어야 서명이 일치함
      webhook_event: JSON.parse(rawBody),
    }),
  });

  if (!verifyRes.ok) {
    console.error('PayPal verify-webhook-signature request failed:', verifyRes.status);
    return false;
  }
  const result = await verifyRes.json();
  return result.verification_status === 'SUCCESS';
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let verified = false;
  try {
    verified = await verifyWebhook(req, rawBody);
  } catch (err: any) {
    console.error('PayPal webhook verification error:', err?.message || err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true });
  }

  // 결제가 실제로 캡처(수취)된 시점 = 돈이 들어온 것만 알림
  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const resource = event.resource || {};

    const amountPaid = resource.amount?.value
      ? `${resource.amount.currency_code || 'USD'} ${resource.amount.value}`
      : '$169.00';
    // NCP 고정 링크는 orderId를 실어보낼 수 없어 custom_id/invoice_id 가 대개 비어 있음 → 있으면 표시, 없으면 거래ID로 대체
    const orderRef = resource.custom_id || resource.invoice_id || resource.id || '(no reference)';
    // 캡처 페이로드에 구매자 정보가 담겨오면 사용 (없을 수 있음)
    let payer = resource.payer || {};
    // 캡처에 구매자 이메일이 없으면 상위 주문을 조회해 이메일/이름을 확보
    if (!payer.email_address) {
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      if (orderId) {
        try {
          const token = await getAccessToken();
          const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (orderRes.ok) {
            const order = await orderRes.json();
            if (order.payer) payer = order.payer;
          } else {
            console.error('PayPal order lookup failed:', orderRes.status);
          }
        } catch (err: any) {
          console.error('PayPal order lookup error:', err?.message || err);
        }
      }
    }
    const customerEmail = payer.email_address || '';
    const customerName =
      [payer.name?.given_name, payer.name?.surname].filter(Boolean).join(' ').trim() || 'Customer';

    // Robin에게 결제 완료 알림 (결제된 주문만)
    await resend.emails.send({
      from: 'GN Glove <orders@30dayglove.com>',
      to: OWNER_EMAIL,
      subject: `💰 Payment Received (PayPal): ${orderRef} — ${customerName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#111;">PAYMENT CONFIRMED (PayPal)</h2>
          <p><strong>Reference:</strong> ${orderRef}</p>
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Email:</strong> ${customerEmail || '(not provided in webhook)'}</p>
          <p><strong>Amount:</strong> ${amountPaid}</p>
          <p><strong>Transaction ID:</strong> ${resource.id || '(unknown)'}</p>
          <p style="color:#228b22;font-weight:bold;">✅ Production can begin now.</p>
          <p style="color:#888;font-size:12px;">Match this payment to the order sheet by customer name / email / amount.</p>
          <hr style="border:0.5px solid #eee;margin:16px 0;"/>
          <p style="font-size:11px;color:#aaa;">GN GLOVE · 30dayglove.com</p>
        </div>
      `,
    });

    // 구매자 이메일이 페이로드에 있으면 결제 확인 메일도 발송
    if (customerEmail) {
      await resend.emails.send({
        from: 'GN Glove <orders@30dayglove.com>',
        to: customerEmail,
        subject: `Payment Confirmed — Your GN Glove is being made! 🧤`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#111;letter-spacing:2px;">GN GLOVE</h2>
            <p>Hi <strong>${customerName}</strong>,</p>
            <p>Your payment of <strong style="color:#b8922a;">${amountPaid}</strong> has been confirmed!</p>
            <p>Our craftsmen have started working on your custom glove. You can expect it to arrive within <strong>30 days</strong>.</p>
            <div style="background:#f9f9f9;border-left:3px solid #b8922a;padding:12px 16px;margin:20px 0;">
              <p style="margin:0;font-size:13px;color:#555;">Reference: <strong>${orderRef}</strong></p>
            </div>
            <p style="color:#555;">If you have any questions, reply to this email or contact us at raonbaseballkorea@gmail.com</p>
            <hr style="border:0.5px solid #eee;margin:20px 0;"/>
            <p style="font-size:10px;color:#ccc;text-align:center;letter-spacing:1px;">GN GLOVE · WE MAKE IT. YOU PLAY IT. · 30dayglove.com</p>
          </div>
        `,
      });
    }
  }

  return NextResponse.json({ received: true });
}

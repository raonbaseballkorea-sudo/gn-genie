import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { transporter, SMTP_USER, OWNER_EMAIL } from '@/lib/mailer';
import { runWeeklySettlement } from '@/lib/weeklySettlement';

// 중국어 고객 결제 메일에 추가로 넣을 위챗페이 QR코드 — 이 경로에 이미지 파일을 넣으면 자동으로 메일에 포함됨 (없으면 그냥 생략)
const WECHAT_QR_PATH = path.join(process.cwd(), 'public', 'payment', 'wechat-qr.png');

function devLog(...args: unknown[]) {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
}

// 고객 결제 안내 메일 문구 — OrderSheet.tsx의 LABELS와 동일한 12개 언어 세트를 사용
type EmailLabels = {
  subject: string; greeting: string; received: string; review: string;
  button: string; craftsmen: string; arrival: string;
  wechatOr: string; wechatScan: string;
};

const EMAIL_LABELS: { [lang: string]: EmailLabels } = {
  en: {
    subject: 'Your GN Glove Order — {orderId}', greeting: 'Hi',
    received: 'Your order <strong style="color:#b8922a;">{orderId}</strong> has been received.',
    review: 'Please review your order sheet (attached) and complete your payment to begin production.',
    button: 'COMPLETE PAYMENT — $169', craftsmen: 'Our craftsmen will begin production within 24 hours of payment.',
    arrival: 'Your glove will arrive at your door within 30 days.',
    wechatOr: '— or —', wechatScan: 'Scan to pay with WeChat Pay:',
  },
  ko: {
    subject: 'GN 글러브 주문 확인 — {orderId}', greeting: '안녕하세요,',
    received: '주문하신 <strong style="color:#b8922a;">{orderId}</strong> 건이 접수되었습니다.',
    review: '첨부된 주문서를 확인하시고 결제를 완료해 주시면 제작이 시작됩니다.',
    button: '결제 완료하기 — $169', craftsmen: '결제가 완료되면 24시간 이내에 장인이 제작을 시작합니다.',
    arrival: '글러브는 30일 이내에 문 앞으로 배송됩니다.',
    wechatOr: '— 또는 —', wechatScan: '위챗페이로 결제하려면 스캔하세요:',
  },
  zh: {
    subject: '您的 GN 手套订单 — {orderId}', greeting: '您好，',
    received: '您的订单 <strong style="color:#b8922a;">{orderId}</strong> 已收到。',
    review: '请查看附件中的订单表，并完成付款以开始生产。',
    button: '完成付款 — $169', craftsmen: '付款完成后，我们的工匠将在24小时内开始制作。',
    arrival: '您的手套将在30天内送达。',
    wechatOr: '— 或 —', wechatScan: '使用微信支付扫码付款：',
  },
  ja: {
    subject: 'GNグラブのご注文 — {orderId}', greeting: 'こんにちは、',
    received: 'ご注文 <strong style="color:#b8922a;">{orderId}</strong> を受け付けました。',
    review: '添付の注文書をご確認の上、お支払いを完了してください。お支払い完了後、製作を開始します。',
    button: '支払いを完了する — $169', craftsmen: 'お支払い完了後24時間以内に職人が製作を開始します。',
    arrival: 'グラブは30日以内にお届けします。',
    wechatOr: '— または —', wechatScan: 'WeChat Payでお支払いの場合はスキャンしてください：',
  },
  es: {
    subject: 'Tu Pedido GN Glove — {orderId}', greeting: 'Hola,',
    received: 'Tu pedido <strong style="color:#b8922a;">{orderId}</strong> ha sido recibido.',
    review: 'Por favor revisa tu hoja de pedido (adjunta) y completa el pago para comenzar la producción.',
    button: 'Completar Pago — $169', craftsmen: 'Nuestros artesanos comenzarán la producción dentro de las 24 horas posteriores al pago.',
    arrival: 'Tu guante llegará a tu puerta en un plazo de 30 días.',
    wechatOr: '— o —', wechatScan: 'Escanea para pagar con WeChat Pay:',
  },
  fr: {
    subject: 'Votre Commande GN Glove — {orderId}', greeting: 'Bonjour,',
    received: 'Votre commande <strong style="color:#b8922a;">{orderId}</strong> a été reçue.',
    review: 'Veuillez vérifier votre bon de commande (ci-joint) et finaliser le paiement pour lancer la production.',
    button: 'Finaliser le Paiement — $169', craftsmen: 'Nos artisans commenceront la production dans les 24 heures suivant le paiement.',
    arrival: 'Votre gant arrivera chez vous sous 30 jours.',
    wechatOr: '— ou —', wechatScan: 'Scannez pour payer avec WeChat Pay :',
  },
  de: {
    subject: 'Ihre GN Glove Bestellung — {orderId}', greeting: 'Hallo,',
    received: 'Ihre Bestellung <strong style="color:#b8922a;">{orderId}</strong> ist eingegangen.',
    review: 'Bitte überprüfen Sie Ihr Bestellblatt (im Anhang) und schließen Sie die Zahlung ab, um die Produktion zu starten.',
    button: 'Zahlung Abschließen — $169', craftsmen: 'Unsere Handwerker beginnen die Produktion innerhalb von 24 Stunden nach Zahlungseingang.',
    arrival: 'Ihr Handschuh wird innerhalb von 30 Tagen geliefert.',
    wechatOr: '— oder —', wechatScan: 'Scannen Sie, um mit WeChat Pay zu bezahlen:',
  },
  it: {
    subject: 'Il tuo Ordine GN Glove — {orderId}', greeting: 'Ciao,',
    received: 'Il tuo ordine <strong style="color:#b8922a;">{orderId}</strong> è stato ricevuto.',
    review: 'Controlla il foglio ordine (allegato) e completa il pagamento per iniziare la produzione.',
    button: 'Completa il Pagamento — $169', craftsmen: 'I nostri artigiani inizieranno la produzione entro 24 ore dal pagamento.',
    arrival: 'Il tuo guanto arriverà a casa tua entro 30 giorni.',
    wechatOr: '— oppure —', wechatScan: 'Scansiona per pagare con WeChat Pay:',
  },
  nl: {
    subject: 'Je GN Glove Bestelling — {orderId}', greeting: 'Hallo,',
    received: 'Je bestelling <strong style="color:#b8922a;">{orderId}</strong> is ontvangen.',
    review: 'Bekijk je bestelformulier (bijgevoegd) en rond de betaling af om de productie te starten.',
    button: 'Betaling Voltooien — $169', craftsmen: 'Onze vakmensen starten de productie binnen 24 uur na betaling.',
    arrival: 'Je handschoen wordt binnen 30 dagen bij je thuisbezorgd.',
    wechatOr: '— of —', wechatScan: 'Scan om te betalen met WeChat Pay:',
  },
  th: {
    subject: 'คำสั่งซื้อ GN Glove ของคุณ — {orderId}', greeting: 'สวัสดีค่ะ/ครับ,',
    received: 'เราได้รับคำสั่งซื้อของคุณ <strong style="color:#b8922a;">{orderId}</strong> แล้ว',
    review: 'กรุณาตรวจสอบใบสั่งซื้อ (แนบมาพร้อมนี้) และชำระเงินให้เสร็จสิ้นเพื่อเริ่มการผลิต',
    button: 'ชำระเงินให้เสร็จสิ้น — $169', craftsmen: 'ช่างฝีมือของเราจะเริ่มการผลิตภายใน 24 ชั่วโมงหลังจากชำระเงิน',
    arrival: 'ถุงมือของคุณจะถูกจัดส่งถึงหน้าประตูภายใน 30 วัน',
    wechatOr: '— หรือ —', wechatScan: 'สแกนเพื่อชำระเงินด้วย WeChat Pay:',
  },
  tl: {
    subject: 'Ang Iyong GN Glove Order — {orderId}', greeting: 'Kamusta,',
    received: 'Natanggap na ang iyong order na <strong style="color:#b8922a;">{orderId}</strong>.',
    review: 'Pakisuri ang iyong order sheet (nakalakip) at kumpletuhin ang bayad para simulan ang produksyon.',
    button: 'Kumpletuhin ang Bayad — $169', craftsmen: 'Sisimulan ng aming mga manggagawa ang produksyon sa loob ng 24 oras matapos ang bayad.',
    arrival: 'Darating ang iyong guwantes sa iyong pintuan sa loob ng 30 araw.',
    wechatOr: '— o —', wechatScan: 'I-scan para magbayad gamit ang WeChat Pay:',
  },
  pt: {
    subject: 'Seu Pedido GN Glove — {orderId}', greeting: 'Olá,',
    received: 'Seu pedido <strong style="color:#b8922a;">{orderId}</strong> foi recebido.',
    review: 'Por favor, revise sua folha de pedido (anexa) e conclua o pagamento para iniciar a produção.',
    button: 'Concluir Pagamento — $169', craftsmen: 'Nossos artesãos iniciarão a produção dentro de 24 horas após o pagamento.',
    arrival: 'Sua luva chegará à sua porta em até 30 dias.',
    wechatOr: '— ou —', wechatScan: 'Escaneie para pagar com WeChat Pay:',
  },
};

function getEmailLabels(lang?: string): EmailLabels {
  return EMAIL_LABELS[(lang || 'en').toLowerCase()] || EMAIL_LABELS.en;
}

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'GN-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function saveOrder(orderData: any) {
  const ordersDir = path.join(process.cwd(), 'orders');
  if (!fs.existsSync(ordersDir)) fs.mkdirSync(ordersDir);
  const weekKey = getISOWeekKey(new Date());
  const filePath = path.join(ordersDir, `${weekKey}.json`);
  let orders = [];
  if (fs.existsSync(filePath)) {
    orders = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  orders.push(orderData);
  fs.writeFileSync(filePath, JSON.stringify(orders, null, 2));
  return weekKey;
}

function formatChatHistory(messages: { role: string; content: string }[]): string {
  if (!messages || messages.length === 0) return '(No conversation history)';
  return messages
    .map((m) => {
      const role = m.role === 'user' ? '👤 Customer' : '🤖 Genie';
      const content = m.content === '[USER_IMAGE]' ? '[Image uploaded]' : m.content;
      return `${role}:\n${content}`;
    })
    .join('\n\n---\n\n');
}

export async function POST(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  try {
    const { orderData, orderImageBase64, factoryImageBase64, messages } = await req.json();

    if (!orderData || typeof orderData !== 'object') {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    const customerEmail = orderData.customer?.email;
    if (customerEmail && !isValidEmail(customerEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    devLog('[ORDER] customer email:', customerEmail);
    devLog('[ORDER] customer name:', orderData?.customer?.name);
    devLog('[ORDER] orderImageBase64 present:', !!orderImageBase64);

    const orderId = generateOrderId();
    const orderDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const chatHistory = formatChatHistory(messages || []);
    const fullOrder = { ...orderData, orderId, orderDate, chatHistory, status: 'pending' as const };

    saveOrder(fullOrder);

    // 고객용 — 고객 언어로 된 주문서
    const attachments: any[] = [];
    if (orderImageBase64) {
      attachments.push({
        filename: `order-${orderId}.jpg`,
        content: Buffer.from(orderImageBase64, 'base64'),
        contentType: 'image/jpeg',
      });
    }

    // 본인(Robin)용 — 고객용 주문서 + 공장용 중국어 작업지시서 + 대화 내용
    const adminAttachments = [...attachments];
    if (factoryImageBase64) {
      adminAttachments.push({
        filename: `factory-order-${orderId}-zh.jpg`,
        content: Buffer.from(factoryImageBase64, 'base64'),
        contentType: 'image/jpeg',
      });
    }
    adminAttachments.push({
      filename: `chat-${orderId}.txt`,
      content: Buffer.from(chatHistory, 'utf-8'),
      contentType: 'text/plain',
    });

    // PayPal NCP 고정 결제 링크 — 모든 고객이 같은 URL 사용 (orderId/이메일 프리필 불가)
    const paymentUrl = process.env.PAYPAL_PAYMENT_LINK || 'https://www.paypal.com/ncp/payment/7VVRZSPCERBR8';

    // Robin과 고객에게 동시에 발송 (순차 대기 대신 병렬로 보내 처리 시간 단축)
    devLog('[ORDER] Sending admin + customer emails in parallel...');
    const emailJobs: Promise<any>[] = [
      transporter.sendMail({
        from: `GN Glove <${SMTP_USER}>`,
        to: OWNER_EMAIL,
        subject: `New Order: ${orderId} — ${orderData.customer?.name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#111;letter-spacing:2px;">NEW ORDER — ${orderId}</h2>
            <p style="color:#555;">From: <strong>${orderData.customer?.name}</strong> (${customerEmail})</p>
            <p style="color:#555;">Date: ${orderDate}</p>
            <p style="color:#888;font-size:13px;">Attached: customer order sheet, factory work order (Simplified Chinese), and full chat history.</p>
            <p style="color:#e88;font-size:13px;">⏳ Awaiting payment from customer.</p>
            <hr style="border:0.5px solid #eee;margin:16px 0;"/>
            <p style="font-size:11px;color:#aaa;">GN GLOVE · 30dayglove.com</p>
          </div>
        `,
        attachments: adminAttachments,
      }),
    ];

    if (customerEmail) {
      // 중국어 고객에게는 Stripe 카드결제 외에 위챗페이 QR코드도 함께 보내 둘 중 하나를 고르게 함
      const hasWechatQr = orderData.customer_language === 'zh' && fs.existsSync(WECHAT_QR_PATH);
      const customerAttachments = [...(orderImageBase64 ? [attachments[0]] : [])];
      if (hasWechatQr) {
        customerAttachments.push({
          filename: 'wechat-qr.png',
          content: fs.readFileSync(WECHAT_QR_PATH),
          cid: 'wechat-qr',
        });
      }

      const t = getEmailLabels(orderData.customer_language);
      const wechatOrSection = hasWechatQr ? `
              <p style="color:#aaa;font-size:12px;text-align:center;margin:24px 0 8px;">${t.wechatOr}</p>
              <div style="text-align:center;margin-bottom:24px;">
                <p style="color:#555;font-size:13px;margin-bottom:10px;">${t.wechatScan}</p>
                <img src="cid:wechat-qr" alt="WeChat Pay QR" style="width:180px;height:180px;" />
              </div>` : '';

      emailJobs.push(
        transporter.sendMail({
          from: `GN Glove <${SMTP_USER}>`,
          to: customerEmail,
          subject: t.subject.replace('{orderId}', orderId),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#111;letter-spacing:2px;">GN GLOVE</h2>
              <p style="color:#555;">${t.greeting} <strong>${orderData.customer?.name}</strong>,</p>
              <p style="color:#555;">${t.received.replace('{orderId}', orderId)}</p>
              <p style="color:#555;">${t.review}</p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${paymentUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#3a3f4d,#232733);color:#f0c86a;padding:16px 48px;font-weight:bold;font-size:15px;text-decoration:none;border-radius:14px;letter-spacing:1.5px;box-shadow:0 6px 16px rgba(0,0,0,0.18);">
                  ${t.button} →
                </a>
              </div>${wechatOrSection}
              <p style="color:#aaa;font-size:11px;text-align:center;">
                ${t.craftsmen}<br/>
                ${t.arrival}
              </p>
              <hr style="border:0.5px solid #eee;margin:20px 0;"/>
              <p style="font-size:10px;color:#ccc;text-align:center;letter-spacing:1px;">GN GLOVE · WE MAKE IT. YOU PLAY IT. · 30dayglove.com</p>
            </div>
          `,
          attachments: customerAttachments.length > 0 ? customerAttachments : undefined,
        })
      );
    } else {
      devLog('[ORDER] WARNING: No customer email — skipping.');
    }

    // 이메일 발송은 응답을 막지 않도록 백그라운드로 처리한다. SMTP로 이미지 첨부를 업로드하는 데
    // 이미지 크기에 비례해 20~80초가 걸려, CDN/게이트웨이 타임아웃 때문에 서버는 성공해도 클라이언트만
    // 연결이 끊겨 주문이 실패하던 문제를 해결. 주문 자체는 위 saveOrder로 이미 디스크에 저장됐으므로
    // 이메일은 best-effort로 뒤에서 보낸다. Hostinger Horizons는 상시 실행 Node 서버라 응답 반환 후에도
    // 이 Promise가 끝까지 실행됨.
    Promise.all(emailJobs)
      .then(() => devLog('[ORDER] Emails sent.'))
      .catch((e: any) => console.error('[ORDER] Background email failed for', orderId, e?.message || e));

    return NextResponse.json({ success: true, orderId });

  } catch (error: any) {
    console.error('[ORDER] Error:', error?.message || error);
    return NextResponse.json({ error: 'Order failed', detail: error?.message }, { status: 500 });
  }
}

// 주간 결제완료 정산의 수동/백업 트리거. 실제 정기 실행은 인앱 스케줄러(instrumentation.ts)가
// 매주 월요일 09:00 KST에 runWeeklySettlement()를 직접 호출한다. 이 엔드포인트는 수동 재실행용.
// 보호: ?token=CRON_SECRET 일치해야 실행 (고객 PII가 담긴 메일이 아무나 호출로 나가지 않도록)
export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    if (req.nextUrl.searchParams.get('token') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ?week=prev 이면 지난 주(막 끝난 주), 기본은 이번 주. 스케줄러는 월요일 09:00 KST에 prev로 실행. (KST 기준)
    const usePrev = req.nextUrl.searchParams.get('week') === 'prev';
    const result = await runWeeklySettlement(usePrev);
    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error('Weekly export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

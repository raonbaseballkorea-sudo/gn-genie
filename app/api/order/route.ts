import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

const OWNER_EMAIL = 'raonbaseballkorea@gmail.com';
const SMTP_USER = 'raonbaseball@30dayglove.com';

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

function devLog(...args: unknown[]) {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
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
    const fullOrder = { ...orderData, orderId, orderDate };

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

    const chatHistory = formatChatHistory(messages || []);

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

    const paymentLink = process.env.STRIPE_PAYMENT_LINK || '';
    const paymentUrl = `${paymentLink}?client_reference_id=${orderId}&prefilled_email=${encodeURIComponent(customerEmail || '')}`;

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
      emailJobs.push(
        transporter.sendMail({
          from: `GN Glove <${SMTP_USER}>`,
          to: customerEmail,
          subject: `Your GN Glove Order — ${orderId}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#111;letter-spacing:2px;">GN GLOVE</h2>
              <p style="color:#555;">Hi <strong>${orderData.customer?.name}</strong>,</p>
              <p style="color:#555;">Your order <strong style="color:#b8922a;">${orderId}</strong> has been received.</p>
              <p style="color:#555;">Please review your order sheet (attached) and complete your payment to begin production.</p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${paymentUrl}"
                   style="display:inline-block;background:#111;color:#f0c040;padding:16px 48px;font-weight:bold;font-size:15px;text-decoration:none;border-radius:6px;letter-spacing:2px;">
                  COMPLETE PAYMENT — $169 →
                </a>
              </div>
              <p style="color:#aaa;font-size:11px;text-align:center;">
                Our craftsmen will begin production within 24 hours of payment.<br/>
                Your glove will arrive at your door within 30 days.
              </p>
              <hr style="border:0.5px solid #eee;margin:20px 0;"/>
              <p style="font-size:10px;color:#ccc;text-align:center;letter-spacing:1px;">GN GLOVE · WE MAKE IT. YOU PLAY IT. · 30dayglove.com</p>
            </div>
          `,
          attachments: orderImageBase64 ? [attachments[0]] : undefined,
        })
      );
    } else {
      devLog('[ORDER] WARNING: No customer email — skipping.');
    }

    await Promise.all(emailJobs);
    devLog('[ORDER] Emails sent.');

    return NextResponse.json({ success: true, orderId });

  } catch (error: any) {
    console.error('[ORDER] Error:', error?.message || error);
    return NextResponse.json({ error: 'Order failed', detail: error?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const weekKey = getISOWeekKey(new Date());
    const filePath = path.join(process.cwd(), 'orders', `${weekKey}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'No orders this week' }, { status: 404 });
    }

    const orders = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const rows = orders.map((o: any) => ({
      'Order #': o.orderId,
      'Date': o.orderDate,
      'Name': o.customer?.name,
      'Email': o.customer?.email,
      'Phone': o.customer?.phone,
      'Address': o.customer?.address,
      'Sport': o.sport,
      'Size': o.size,
      'Position': o.position,
      'Hand': o.hand,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, weekKey);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    await transporter.sendMail({
      from: `GN Glove <${SMTP_USER}>`,
      to: OWNER_EMAIL,
      subject: `Weekly Orders — ${weekKey} (${orders.length} orders)`,
      html: `<p>Weekly order summary attached. Total: <strong>${orders.length} orders</strong></p>`,
      attachments: [{
        filename: `orders-${weekKey}.xlsx`,
        content: buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }],
    });

    return NextResponse.json({ success: true, orders: orders.length });

  } catch (error) {
    console.error('Weekly export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = 'raonbaseballkorea@gmail.com';
const BASE_URL = 'https://30dayglove.com';

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
  try {
    const { orderData, orderImageBase64, messages } = await req.json();
    const orderId = generateOrderId();
    const orderDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const fullOrder = { ...orderData, orderId, orderDate };

    saveOrder(fullOrder);

    const attachments: any[] = [];
    if (orderImageBase64) {
      attachments.push({
        filename: `order-${orderId}.jpg`,
        content: Buffer.from(orderImageBase64, 'base64'),
      });
    }

    // 대화 내용 텍스트 파일 생성
    const chatHistory = formatChatHistory(messages || []);
    const chatBuffer = Buffer.from(chatHistory, 'utf-8');
    const adminAttachments = [
      ...attachments,
      {
        filename: `chat-${orderId}.txt`,
        content: chatBuffer,
      },
    ];

    const paymentUrl = `${BASE_URL}/payment?order=${orderId}`;

    // 관리자(Robin)에게 발송 — 주문서 이미지 + 대화 내용 첨부
    await resend.emails.send({
      from: 'GN Glove <orders@30dayglove.com>',
      to: OWNER_EMAIL,
      subject: `New Order: ${orderId} — ${orderData.customer?.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#111;letter-spacing:2px;">NEW ORDER — ${orderId}</h2>
          <p style="color:#555;">From: <strong>${orderData.customer?.name}</strong> (${orderData.customer?.email})</p>
          <p style="color:#555;">Date: ${orderDate}</p>
          <p style="color:#888;font-size:13px;">Order sheet image and full chat history are attached.</p>
          <hr style="border:0.5px solid #eee;margin:16px 0;"/>
          <p style="font-size:11px;color:#aaa;">GN GLOVE · 30dayglove.com</p>
        </div>
      `,
      attachments: adminAttachments,
    });

    // 고객에게 발송 — 주문서 이미지만 첨부 (대화 내용 제외)
    await resend.emails.send({
      from: 'GN Glove <orders@30dayglove.com>',
      to: orderData.customer?.email,
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
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ success: true, orderId });

  } catch (error) {
    console.error('Order error:', error);
    return NextResponse.json({ error: 'Order failed' }, { status: 500 });
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

    await resend.emails.send({
      from: 'GN Glove <orders@30dayglove.com>',
      to: OWNER_EMAIL,
      subject: `Weekly Orders — ${weekKey} (${orders.length} orders)`,
      html: `<p>Weekly order summary attached. Total: <strong>${orders.length} orders</strong></p>`,
      attachments: [
        {
          filename: `orders-${weekKey}.xlsx`,
          content: buffer,
        },
      ],
    });

    return NextResponse.json({ success: true, orders: orders.length });

  } catch (error) {
    console.error('Weekly export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = 'raonbaseballkorea@gmail.com';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerEmail = session.customer_details?.email || '';
    const customerName = session.customer_details?.name || '';
    const orderId = session.client_reference_id || session.id;
    const amountPaid = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : '$169.00';

    // Robin에게 결제 완료 알림
    await resend.emails.send({
      from: 'GN Glove <orders@30dayglove.com>',
      to: OWNER_EMAIL,
      subject: `💰 Payment Received: ${orderId} — ${customerName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#111;">PAYMENT CONFIRMED</h2>
          <p><strong>Order:</strong> ${orderId}</p>
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
          <p><strong>Amount:</strong> ${amountPaid}</p>
          <p style="color:#228b22;font-weight:bold;">✅ Production can begin now.</p>
          <hr style="border:0.5px solid #eee;margin:16px 0;"/>
          <p style="font-size:11px;color:#aaa;">GN GLOVE · 30dayglove.com</p>
        </div>
      `,
    });

    // 고객에게 결제 확인 이메일
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
              <p style="margin:0;font-size:13px;color:#555;">Order Reference: <strong>${orderId}</strong></p>
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
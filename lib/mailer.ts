import nodemailer from 'nodemailer';

// 공유 메일 설정 — 주문 라우트(app/api/order/route.ts)와 주간 정산(lib/weeklySettlement.ts)이 함께 사용.
export const OWNER_EMAIL = 'raonbaseballkorea@gmail.com';
export const SMTP_USER = 'raonbaseball@30dayglove.com';

export const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

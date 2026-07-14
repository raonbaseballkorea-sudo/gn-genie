'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

interface OrderRecord {
  orderId?: string;
  orderDate?: string;
  paid?: boolean;
  status?: 'pending' | 'in_production' | 'shipped' | 'delivered';
  sport?: string;
  player_type?: string;
  hand?: string;
  size?: string;
  position?: string;
  palm_construction?: string;
  [k: string]: any;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Payment Pending',
  in_production: 'In Production',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-400',
  in_production: 'text-yellow-400',
  shipped: 'text-blue-400',
  delivered: 'text-green-400',
};

export default function OrdersPage() {
  const [step, setStep] = useState<'email' | 'verify' | 'list'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('verify');
      } else {
        alert(data.error);
      }
    } catch {
      alert('Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLoad = async () => {
    setLoading(true);
    try {
      const verifyRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        alert(verifyData.error);
        return;
      }

      const ordersRes = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const ordersData = await ordersRes.json();
      if (ordersData.error) {
        alert(ordersData.error);
        return;
      }
      setOrders(ordersData.orders || []);
      setStep('list');
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Nav />

      <section className="px-6 py-10 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-black mb-2">My Orders</h1>
        <p className="text-gray-400">Verify your email to view your order history.</p>
      </section>

      <div className="max-w-2xl mx-auto px-6 pb-16">
        {step === 'email' && (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
            <input
              className="w-full bg-gray-800 rounded-lg p-3 outline-none text-white"
              placeholder="Your email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendCode()}
            />
            <button
              onClick={sendCode}
              disabled={loading}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-300 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
            <p className="text-gray-400 text-sm">We sent a 6-digit code to <strong className="text-white">{email}</strong>.</p>
            <input
              className="w-full bg-gray-800 rounded-lg p-3 outline-none text-white tracking-widest text-center text-lg"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && verifyAndLoad()}
            />
            <button
              onClick={verifyAndLoad}
              disabled={loading}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-300 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & View Orders'}
            </button>
          </div>
        )}

        {step === 'list' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No orders found for this email.</div>
            ) : (
              orders.map((o) => (
                <div key={o.orderId} className="bg-gray-900 rounded-2xl overflow-hidden">
                  <button
                    className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
                    onClick={() => setExpandedId(expandedId === o.orderId ? null : o.orderId!)}
                  >
                    <div>
                      <div className="text-white font-bold">{o.orderId}</div>
                      <div className="text-gray-500 text-xs">{o.orderDate}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${STATUS_COLORS[o.status || 'pending']}`}>
                        {o.paid ? STATUS_LABELS[o.status || 'pending'] : 'Awaiting Payment'}
                      </span>
                      <span className="text-gray-400">{expandedId === o.orderId ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {expandedId === o.orderId && (
                    <div className="px-5 pb-5 border-t border-gray-800 pt-4 text-sm text-gray-300 space-y-1">
                      <div>Sport: <strong className="text-white">{o.sport}{o.player_type ? ` · ${o.player_type}` : ''}</strong></div>
                      <div>Hand: <strong className="text-white">{o.hand}</strong></div>
                      <div>Size: <strong className="text-white">{o.size ? `${o.size}"` : '-'}</strong></div>
                      <div>Position: <strong className="text-white">{o.position}</strong></div>
                      {o.palm_construction && <div>Palm Construction: <strong className="text-white">{o.palm_construction}</strong></div>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

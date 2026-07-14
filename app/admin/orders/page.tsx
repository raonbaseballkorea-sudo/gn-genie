'use client';

import { useState } from 'react';

interface OrderRecord {
  orderId?: string;
  orderDate?: string;
  paid?: boolean;
  status?: 'pending' | 'in_production' | 'shipped' | 'delivered';
  customer?: { name?: string; email?: string; phone?: string; address?: string };
  sport?: string;
  hand?: string;
  size?: string;
  position?: string;
  chatHistory?: string;
  [k: string]: any;
}

const STATUS_OPTIONS: OrderRecord['status'][] = ['pending', 'in_production', 'shipped', 'delivered'];

export default function AdminOrdersPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const login = async () => {
    const pw = prompt('Admin password:');
    if (!pw) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: pw }),
      });
      const data = await res.json();
      if (data.orders) {
        setAdminPassword(pw);
        setAuthed(true);
        setOrders(data.orders);
      } else {
        alert(data.error || 'Unauthorized');
      }
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (orderId: string, status: string) => {
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status, adminPassword }),
    });
    const data = await res.json();
    if (data.order) {
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, ...data.order } : o)));
    } else {
      alert(data.error || 'Failed to update status');
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <button
          onClick={login}
          disabled={loading}
          className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-300 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Admin Login'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <section className="px-6 py-8 text-center">
        <h1 className="text-3xl font-black">Order Management</h1>
        <p className="text-gray-500 text-sm mt-1">{orders.length} orders</p>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-16 space-y-4">
        {orders.map((o) => (
          <div key={o.orderId} className="bg-gray-900 rounded-2xl overflow-hidden">
            <button
              className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
              onClick={() => setExpandedId(expandedId === o.orderId ? null : o.orderId!)}
            >
              <div>
                <div className="text-white font-bold">{o.orderId} — {o.customer?.name}</div>
                <div className="text-gray-500 text-xs">{o.customer?.email} · {o.orderDate}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${o.paid ? 'text-green-400' : 'text-red-400'}`}>
                  {o.paid ? 'Paid' : 'Unpaid'}
                </span>
                <span className="text-gray-400">{expandedId === o.orderId ? '▲' : '▼'}</span>
              </div>
            </button>

            {expandedId === o.orderId && (
              <div className="px-5 pb-5 border-t border-gray-800 pt-4 text-sm text-gray-300 space-y-4">
                <div className="space-y-1">
                  <div>Sport: <strong className="text-white">{o.sport}</strong></div>
                  <div>Hand: <strong className="text-white">{o.hand}</strong></div>
                  <div>Size: <strong className="text-white">{o.size ? `${o.size}"` : '-'}</strong></div>
                  <div>Position: <strong className="text-white">{o.position}</strong></div>
                  <div>Address: <strong className="text-white">{o.customer?.address}</strong></div>
                </div>

                <div>
                  <div className="text-gray-500 text-xs mb-1">Production Status</div>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeStatus(o.orderId!, s!)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                          (o.status || 'pending') === s
                            ? 'bg-yellow-400 text-black'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {o.chatHistory && (
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Chat History</div>
                    <div className="bg-gray-800 rounded-lg p-3 text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {o.chatHistory}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

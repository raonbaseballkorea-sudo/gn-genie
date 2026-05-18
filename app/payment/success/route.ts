'use client';

export default function PaymentSuccessPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🧤</div>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '3px', marginBottom: '8px' }}>
          PAYMENT CONFIRMED
        </h1>
        <p style={{ color: '#b8922a', fontSize: '16px', fontWeight: 700, marginBottom: '24px', letterSpacing: '1px' }}>
          Your glove is now being crafted.
        </p>
        <div style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#228b22' }} />
            <span style={{ fontSize: '14px', color: '#ccc' }}>Payment received</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#b8922a' }} />
            <span style={{ fontSize: '14px', color: '#ccc' }}>Craftsman assigned within 24 hours</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#555' }} />
            <span style={{ fontSize: '14px', color: '#555' }}>Delivery within 30 days</span>
          </div>
        </div>
        <p style={{ color: '#555', fontSize: '13px', marginBottom: '32px' }}>
          A confirmation email has been sent to you.<br />
          Questions? Contact us at raonbaseballkorea@gmail.com
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            background: '#f0c040',
            color: '#111',
            fontWeight: 700,
            padding: '14px 40px',
            borderRadius: '8px',
            textDecoration: 'none',
            letterSpacing: '2px',
            fontSize: '14px',
          }}
        >
          BACK TO HOME
        </a>
        <div style={{ marginTop: '40px', fontSize: '10px', color: '#333', letterSpacing: '2px' }}>
          GN GLOVE · WE MAKE IT. YOU PLAY IT. · 30dayglove.com
        </div>
      </div>
    </div>
  );
}
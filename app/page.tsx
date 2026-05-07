'use client';

import { useState, useRef, useEffect } from 'react';
import OrderSheet from './components/OrderSheet';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageData?: { base64: string; type: string }[] | null;
}

export default function ChatPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'verify' | 'select' | 'chat' | 'order'>('email');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ base64: string; type: string }[]>([]);
  const [uploadedImages, setUploadedImages] = useState<{ base64: string; type: string }[]>([]);
  const [pinnedImage, setPinnedImage] = useState<{ base64: string; type: string } | null>(null);
  const [pinnedGlove, setPinnedGlove] = useState<{ src: string; label: string } | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const orderSheetRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('gnEmail');
    if (!savedEmail) return;
    const saved = sessionStorage.getItem('selectedGlove');
    const selected = saved ? JSON.parse(saved) : null;
    setEmail(savedEmail);
    if (selected) {
      sessionStorage.removeItem('selectedGlove');
      setPinnedGlove({ src: `/gloves/${selected.category}/${selected.id}.jpg`, label: selected.label });
      setMessages([{ role: 'assistant', content: `Welcome back! I have selected this glove for you: ${selected.label} (${selected.category}). [SHOW_IMAGE: ${selected.category}/${selected.id}.jpg] Would you like to order this exact glove, or customize it further?` }]);
      setStep('chat');
    } else {
      setStep('select');
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const sendCode = async () => {
    if (email) {
      sessionStorage.setItem('gnEmail', email);
      const saved = sessionStorage.getItem('selectedGlove');
      const selected = saved ? JSON.parse(saved) : null;
      if (selected) {
        sessionStorage.removeItem('selectedGlove');
        setStep('chat');
        setPinnedGlove({ src: `/gloves/${selected.category}/${selected.id}.jpg`, label: selected.label });
        setMessages([{ role: 'assistant', content: `Welcome to GN Glove! I have selected this glove for you: ${selected.label} (${selected.category}). [SHOW_IMAGE: ${selected.category}/${selected.id}.jpg] Would you like to order this exact glove, or customize it further?` }]);
      } else {
        setStep('select');
      }
      return;
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('gnEmail', email);
      const saved = sessionStorage.getItem('selectedGlove');
      const selected = saved ? JSON.parse(saved) : null;
      if (selected) {
        sessionStorage.removeItem('selectedGlove');
        setStep('chat');
        setPinnedGlove({ src: `/gloves/${selected.category}/${selected.id}.jpg`, label: selected.label });
        setMessages([{ role: 'assistant', content: `Welcome to GN Glove! I have selected this glove for you: ${selected.label} (${selected.category}). [SHOW_IMAGE: ${selected.category}/${selected.id}.jpg] Would you like to order this exact glove, or customize it further?` }]);
      } else {
        setStep('select');
      }
    } else {
      alert(data.error);
    }
    setLoading(false);
  };

  const resizeImage = (file: File): Promise<{ base64: string; type: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const SIZE = 500;
          const canvas = document.createElement('canvas');
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, SIZE, SIZE);
          const scale = Math.min(SIZE / img.width, SIZE / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (SIZE - w) / 2;
          const y = (SIZE - h) / 2;
          ctx.drawImage(img, x, y, w, h);
          const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
          resolve({ base64, type: 'image/jpeg' });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 4 - images.length;
    const toProcess = files.slice(0, remaining);
    const resized = await Promise.all(toProcess.map(resizeImage));
    setImages(prev => [...prev, ...resized]);
    setUploadedImages(prev => [...prev, ...resized]);
    if (!pinnedImage) setPinnedImage(resized[0]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!input.trim() && images.length === 0) return;
    const userMessage: Message = {
      role: 'user',
      content: input || '[USER_IMAGE]',
      imageData: images.length > 0 ? [...images] : null,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const firstImage = pinnedImage || uploadedImages[0];

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: newMessages.map(m => ({ role: m.role, content: m.content === '[USER_IMAGE]' ? 'Here are my reference photos.' : m.content })),
        imageBase64: firstImage?.base64,
        imageType: firstImage?.type,
        email,
      }),
    });
    const data = await res.json();

    if (data.orderComplete && data.orderData) {
      const finalOrder = { ...data.orderData };
      if (uploadedImages.length > 0) {
        finalOrder.reference_photos = uploadedImages;
      }
      if (pinnedGlove && !finalOrder.reference_photo && uploadedImages.length === 0) {
        finalOrder.reference_photo = pinnedGlove.src;
      }
      setOrderData(finalOrder);
      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
      setTimeout(() => setStep('order'), 1500);
    } else {
      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
    }

    setImages([]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return;
      if ((e.nativeEvent as any).isComposing) return;
      e.preventDefault();
      sendMessage();
    }
  };

  const captureOrderSheet = async (): Promise<string | null> => {
    if (!orderSheetRef.current) return null;
    try {
      const btn = document.getElementById('confirm-btn-area');
      if (btn) btn.style.display = 'none';
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(orderSheetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      if (btn) btn.style.display = '';
      return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    } catch (e) {
      console.error('Capture failed:', e);
      return null;
    }
  };

  const handleOrderConfirm = async () => {
    setLoading(true);
    try {
      const orderImageBase64 = await captureOrderSheet();
      // messages를 텍스트만 추출해서 전달 (이미지 base64 제외하여 용량 절약)
      const chatMessages = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderData, orderImageBase64, messages: chatMessages }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Order ${data.orderId} confirmed! Check your email for your order summary.`);
        setStep('select');
        setMessages([]);
        setOrderData(null);
        setUploadedImages([]);
        setPinnedImage(null);
        setPinnedGlove(null);
        setCode('');
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch (error) {
      alert('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const renderMessage = (content: string, imageData?: { base64: string; type: string }[] | null) => {
    if (content === '[USER_IMAGE]' && imageData && imageData.length > 0) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: imageData.length > 1 ? '1fr 1fr' : '1fr', gap: '4px' }}>
          {imageData.map((img, i) => (
            <img key={i} src={`data:${img.type};base64,${img.base64}`} alt={`reference ${i+1}`} className="w-full rounded-lg cursor-pointer" onClick={() => setModalImage(`data:${img.type};base64,${img.base64}`)} />
          ))}
        </div>
      );
    }
    const parts = content.split(/\[SHOW_IMAGE: ([^\]]+)\]/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <img key={i} src={`/gloves/${part}`} alt="glove" className="w-64 rounded-lg my-2 cursor-pointer" onClick={() => setModalImage(`/gloves/${part}`)} />;
      }
      return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
  };

  const renderPinnedImages = () => {
    if (uploadedImages.length > 0) {
      if (uploadedImages.length === 1) {
        return (
          <img
            src={`data:${uploadedImages[0].type};base64,${uploadedImages[0].base64}`}
            alt="ref"
            style={{ height: '60px', width: 'auto', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => setModalImage(`data:${uploadedImages[0].type};base64,${uploadedImages[0].base64}`)}
          />
        );
      }
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
          {uploadedImages.slice(0, 4).map((img, i) => (
            <img
              key={i}
              src={`data:${img.type};base64,${img.base64}`}
              alt={`ref ${i+1}`}
              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
              onClick={() => setModalImage(`data:${img.type};base64,${img.base64}`)}
            />
          ))}
        </div>
      );
    }
    if (pinnedGlove) {
      return (
        <div className="flex items-center gap-2">
          <img
            src={pinnedGlove.src}
            alt="pinned glove"
            style={{ height: '60px', width: 'auto', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => setModalImage(pinnedGlove.src)}
          />
          <span className="text-xs text-gray-300">{pinnedGlove.label}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">

      {/* 이미지 모달 */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'pointer', padding: '20px',
          }}
        >
          <img
            src={modalImage}
            alt="full size"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setModalImage(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.2)', color: 'white',
              border: 'none', borderRadius: '50%', width: '36px', height: '36px',
              fontSize: '18px', cursor: 'pointer',
            }}
          >✕</button>
        </div>
      )}

      {step === 'email' && (
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
          <div className="mb-6">
            <div className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-2">Korean Craft · Custom Order</div>
            <h1 className="text-3xl font-black text-white leading-tight mb-3">Your Glove.<br/>Your Way.<br/><span className="text-yellow-400">$169. 30 Days.</span></h1>
            <p className="text-gray-400 text-sm">Everything custom. Nothing extra.</p>
          </div>
          <div className="border-t border-gray-700 pt-5">
            <p className="text-gray-500 text-xs mb-3">Enter your email to start. Your order summary will be sent here.</p>
            <input className="w-full bg-gray-800 rounded-lg p-3 mb-4 outline-none text-white" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendCode()} />
            <button onClick={sendCode} disabled={loading} className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-300">
              {loading ? 'Sending...' : 'Start Designing →'}
            </button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">Check Your Email</h1>
          <p className="text-gray-400 mb-6">Enter the 6-digit code sent to {email}</p>
          <input className="w-full bg-gray-800 rounded-lg p-3 mb-4 outline-none text-center text-2xl tracking-widest" placeholder="000000" value={code} onChange={e => setCode(e.target.value)} maxLength={6} />
          <button onClick={verifyCode} disabled={loading} className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-300">
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      )}

      {step === 'select' && (
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">How would you like to start?</h1>
          <p className="text-gray-400 mb-8">Browse our collection or upload a reference photo</p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => window.location.href = '/catalog'}
              className="w-full bg-yellow-400 text-black font-bold py-4 rounded-xl hover:bg-yellow-300 text-lg"
            >
              🧤 Browse Our Catalog
            </button>
            <button
              onClick={() => {
                setStep('chat');
                setMessages([{ role: 'assistant', content: "Welcome to GN Glove! 🧤 Please upload up to 4 reference photos of the glove style you have in mind, or describe what you're looking for!" }]);
              }}
              className="w-full bg-gray-700 text-white font-bold py-4 rounded-xl hover:bg-gray-600 text-lg"
            >
              📷 Upload My Photo
            </button>
          </div>
        </div>
      )}

      {step === 'chat' && (
        <div className="w-full max-w-2xl flex flex-col h-screen">
          <div className="bg-gray-900 p-3 text-center">
            <h1 className="text-xl font-bold text-yellow-400">GN GLOVE Custom Consultant</h1>
          </div>

          {(uploadedImages.length > 0 || pinnedGlove) && (
            <div className="bg-gray-800 px-4 py-2 flex items-center gap-3 border-b border-gray-700">
              <div className="text-xs text-gray-400 whitespace-nowrap">Reference:</div>
              {renderPinnedImages()}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-yellow-400 text-black' : 'bg-gray-800'}`}>
                  {renderMessage(msg.content, msg.imageData)}
                </div>
              </div>
            ))}
            {loading && <div className="text-gray-400 text-sm">Typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          {images.length > 0 && (
            <div className="px-4 py-2 bg-gray-900 flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={`data:${img.type};base64,${img.base64}`} alt={`preview ${i+1}`} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                  <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              {images.length < 4 && (
                <div style={{ fontSize: '11px', color: '#888', alignSelf: 'center' }}>{4 - images.length} more allowed</div>
              )}
            </div>
          )}

          <div className="p-4 bg-gray-900 flex gap-2 items-end">
            {images.length < 4 && (
              <button onClick={() => fileRef.current?.click()} className="bg-gray-700 p-3 rounded-lg hover:bg-gray-600 flex-shrink-0">📷</button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImage} />
            <textarea
              ref={textareaRef}
              className="flex-1 bg-gray-800 rounded-lg p-3 outline-none resize-none leading-relaxed"
              placeholder="Type a message... (Shift+Enter for new line)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px', overflowY: 'auto' }}
            />
            <button onClick={sendMessage} disabled={loading} className="bg-yellow-400 text-black font-bold px-6 rounded-lg hover:bg-yellow-300 flex-shrink-0" style={{ height: '44px' }}>Send</button>
          </div>
        </div>
      )}

      {step === 'order' && orderData && (
        <div className="w-full max-w-3xl py-8">
          <div ref={orderSheetRef}>
            <OrderSheet orderData={orderData} onConfirm={handleOrderConfirm} />
          </div>
        </div>
      )}

    </div>
  );
}

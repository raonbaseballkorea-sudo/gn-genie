'use client';

import { useState, useRef, useEffect } from 'react';
import OrderSheet from './components/OrderSheet';
import Nav from './components/Nav';

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
  const [orderData, setOrderData] = useState<any>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<{ type: 'success' | 'error'; title: string; body: string; okLabel: string } | null>(null);

  // useRef — 렌더링과 무관하게 항상 최신값 유지
  const uploadedImagesRef = useRef<{ base64: string; type: string }[]>([]);
  const pinnedImageRef = useRef<{ base64: string; type: string } | null>(null);
  const pinnedGloveRef = useRef<{ src: string; label: string } | null>(null);
  const emailRef = useRef<string>('');

  // 화면 표시용 state (ref와 동기화)
  const [uploadedImagesDisplay, setUploadedImagesDisplay] = useState<{ base64: string; type: string }[]>([]);
  const [pinnedGloveDisplay, setPinnedGloveDisplay] = useState<{ src: string; label: string } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const orderSheetRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ORDER_COMPLETE 텍스트가 시작되는 인덱스를 찾는 헬퍼
  const findOrderCompleteIndex = (text: string): number => {
    const idx = text.search(/ORDER_COMPLETE/);
    return idx !== -1 ? idx : text.length;
  };

  // 대화 내용의 문자 패턴으로 고객 언어를 추정 (한/일/중 + 일부 라틴어권 특수문자 기반)
  type Lang = 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'en';
  const detectLanguage = (text: string): Lang => {
    if (/[가-힣]/.test(text)) return 'ko';
    if (/[぀-ヿ]/.test(text)) return 'ja';
    if (/[一-鿿]/.test(text)) return 'zh';
    if (/[ñ¿¡]/i.test(text)) return 'es';
    if (/[àâçéèêîôûùëïÿœ]/i.test(text)) return 'fr';
    if (/[äöüß]/i.test(text)) return 'de';
    return 'en';
  };

  const ORDER_RESULT_TEXT: Record<Lang, { successTitle: string; successBody: (orderId: string) => string; errorTitle: string; errorBody: string; okLabel: string }> = {
    en: {
      successTitle: 'Order Confirmed!',
      successBody: (id) => `Your order ${id} has been received. Please check your email for your order summary.\n\nIf anything in your order is unclear to our craftsmen, we may send you a follow-up email to confirm details — please reply as soon as you can so production isn't delayed.`,
      errorTitle: 'Something went wrong',
      errorBody: 'Please try again.',
      okLabel: 'OK',
    },
    ko: {
      successTitle: '주문이 확정되었습니다!',
      successBody: (id) => `주문번호 ${id}가 접수되었습니다. 이메일로 주문 내용을 확인해주세요.\n\n혹시 장인이 주문 내용 중 이해하기 어려운 부분이 있으면 확인 메일을 보내드릴 수 있습니다. 제작이 지연되지 않도록 빠르게 답변해주시면 감사하겠습니다.`,
      errorTitle: '문제가 발생했습니다',
      errorBody: '다시 시도해주세요.',
      okLabel: '확인',
    },
    ja: {
      successTitle: 'ご注文が確定しました！',
      successBody: (id) => `ご注文番号 ${id} を受け付けました。注文内容はメールでご確認ください。\n\n職人が注文内容で分かりにくい点があった場合、確認のメールをお送りすることがあります。製作が遅れないよう、できるだけ早くご返信ください。`,
      errorTitle: 'エラーが発生しました',
      errorBody: 'もう一度お試しください。',
      okLabel: '確認',
    },
    zh: {
      successTitle: '订单已确认！',
      successBody: (id) => `您的订单 ${id} 已收到。请查看邮件以确认订单详情。\n\n如果工匠对订单内容有不清楚的地方，我们可能会给您发邮件确认，请尽快回复以避免延误制作。`,
      errorTitle: '出现错误',
      errorBody: '请重试。',
      okLabel: '确定',
    },
    es: {
      successTitle: '¡Pedido confirmado!',
      successBody: (id) => `Su pedido ${id} ha sido recibido. Por favor revise su correo electrónico para ver el resumen del pedido.\n\nSi algo no está claro para nuestros artesanos, podríamos enviarle un correo de seguimiento para confirmar detalles — por favor responda lo antes posible para no retrasar la producción.`,
      errorTitle: 'Algo salió mal',
      errorBody: 'Por favor, inténtalo de nuevo.',
      okLabel: 'Aceptar',
    },
    fr: {
      successTitle: 'Commande confirmée !',
      successBody: (id) => `Votre commande ${id} a été reçue. Veuillez consulter votre e-mail pour le récapitulatif de la commande.\n\nSi nos artisans ont besoin de clarifier un détail, nous pourrions vous envoyer un e-mail de suivi — merci de répondre rapidement pour ne pas retarder la production.`,
      errorTitle: 'Une erreur est survenue',
      errorBody: 'Veuillez réessayer.',
      okLabel: "D'accord",
    },
    de: {
      successTitle: 'Bestellung bestätigt!',
      successBody: (id) => `Ihre Bestellung ${id} wurde erhalten. Bitte prüfen Sie Ihre E-Mail für die Bestellzusammenfassung.\n\nFalls unseren Handwerkern etwas unklar ist, senden wir Ihnen möglicherweise eine Folge-E-Mail zur Bestätigung — bitte antworten Sie zeitnah, damit die Produktion nicht verzögert wird.`,
      errorTitle: 'Etwas ist schiefgelaufen',
      errorBody: 'Bitte versuchen Sie es erneut.',
      okLabel: 'OK',
    },
  };

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('gnEmail');
    if (!savedEmail) return;
    const saved = sessionStorage.getItem('selectedGlove');
    const selected = saved ? JSON.parse(saved) : null;
    setEmail(savedEmail);
    emailRef.current = savedEmail;
    if (selected) {
      sessionStorage.removeItem('selectedGlove');
      const glove = { src: `/gloves/${selected.category}/${selected.id}.jpg`, label: selected.label };
      pinnedGloveRef.current = glove;
      setPinnedGloveDisplay(glove);
      setMessages([{
        role: 'assistant',
        content: `Welcome back! I have selected this glove for you: ${selected.label} (${selected.category}). [SHOW_IMAGE: ${selected.category}/${selected.id}.jpg] Would you like to order this exact glove, or customize it further?`
      }]);
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
      emailRef.current = email;
      const saved = sessionStorage.getItem('selectedGlove');
      const selected = saved ? JSON.parse(saved) : null;
      if (selected) {
        sessionStorage.removeItem('selectedGlove');
        const glove = { src: `/gloves/${selected.category}/${selected.id}.jpg`, label: selected.label };
        pinnedGloveRef.current = glove;
        setPinnedGloveDisplay(glove);
        setStep('chat');
        setMessages([{
          role: 'assistant',
          content: `Welcome to GN Glove! I have selected this glove for you: ${selected.label} (${selected.category}). [SHOW_IMAGE: ${selected.category}/${selected.id}.jpg] Would you like to order this exact glove, or customize it further?`
        }]);
      } else {
        setStep('select');
      }
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('gnEmail', email);
      emailRef.current = email;
      const saved = sessionStorage.getItem('selectedGlove');
      const selected = saved ? JSON.parse(saved) : null;
      if (selected) {
        sessionStorage.removeItem('selectedGlove');
        const glove = { src: `/gloves/${selected.category}/${selected.id}.jpg`, label: selected.label };
        pinnedGloveRef.current = glove;
        setPinnedGloveDisplay(glove);
        setStep('chat');
        setMessages([{
          role: 'assistant',
          content: `Welcome to GN Glove! I have selected this glove for you: ${selected.label} (${selected.category}). [SHOW_IMAGE: ${selected.category}/${selected.id}.jpg] Would you like to order this exact glove, or customize it further?`
        }]);
      } else {
        setStep('select');
      }
    } else {
      alert(data.error);
    }
    setLoading(false);
  };

  // 정사각형 캔버스에 흰 여백을 두고 비율 유지하며 그려넣는 공통 로직
  const drawToSquareCanvas = (img: HTMLImageElement, size: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    const scale = Math.min(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.drawImage(img, x, y, w, h);
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
  };

  const resizeImage = (file: File, size: number): Promise<{ base64: string; type: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          resolve({ base64: drawToSquareCanvas(img, size), type: 'image/jpeg' });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // 이미 리사이즈된 base64 이미지를 다른 크기로 다시 리사이즈 (업로드 장수가 늘어났을 때 기존 1장을 축소하기 위함)
  const resizeBase64Image = (base64: string, size: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(drawToSquareCanvas(img, size));
      img.src = `data:image/jpeg;base64,${base64}`;
    });
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 4 - images.length;
    const toProcess = files.slice(0, remaining);

    // 사진 업로드 수량에 따라 해상도 결정: 총 1장이면 1000x1000, 2장 이상이면 500x500
    const newTotal = uploadedImagesRef.current.length + toProcess.length;
    const targetSize = newTotal === 1 ? 1000 : 500;

    const resized = await Promise.all(toProcess.map(f => resizeImage(f, targetSize)));

    let existing = uploadedImagesRef.current;
    if (targetSize === 500 && existing.length === 1) {
      // 기존에 1장만 있어서 1000x1000으로 저장돼 있었다면, 2장 이상이 된 지금 500x500으로 다시 리사이즈
      const downsized = await resizeBase64Image(existing[0].base64, 500);
      existing = [{ ...existing[0], base64: downsized }];
    }

    const merged = [...existing, ...resized];

    setImages(prev => [...prev, ...resized]);

    uploadedImagesRef.current = merged;
    setUploadedImagesDisplay([...merged]);

    if (!pinnedImageRef.current) {
      pinnedImageRef.current = resized[0];
    }
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

    const firstImage = uploadedImagesRef.current[0] || pinnedImageRef.current;
    const currentEmail = emailRef.current || email || sessionStorage.getItem('gnEmail') || '';

    console.log('[DEBUG] sendMessage — email:', currentEmail);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content === '[USER_IMAGE]' ? 'Here are my reference photos.' : m.content,
          })),
          imageBase64: firstImage?.base64 || null,
          imageType: firstImage?.type || null,
          email: currentEmail,
        }),
      });

      const data = await res.json();
      console.log('[DEBUG] orderComplete:', data.orderComplete, 'hasOrderData:', !!data.orderData);

      if (data.orderComplete && data.orderData) {
        const finalOrder = { ...data.orderData };

        // 레퍼런스 사진 강제 주입
        if (uploadedImagesRef.current.length > 0) {
          finalOrder.reference_photos = uploadedImagesRef.current;
          finalOrder.reference_photo = `data:${uploadedImagesRef.current[0].type};base64,${uploadedImagesRef.current[0].base64}`;
        } else if (pinnedGloveRef.current) {
          finalOrder.reference_photo = pinnedGloveRef.current.src;
        }

        // 이메일 강제 주입
        finalOrder.customer = {
          ...finalOrder.customer,
          email: currentEmail || finalOrder.customer?.email || '',
        };

        console.log('[DEBUG] finalOrder.customer.email:', finalOrder.customer.email);

        setOrderData(finalOrder);
        setStep('order');
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.message }]);
      }
    } catch (err) {
      console.error('[DEBUG] fetch error:', err);
      setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
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
    const lang = detectLanguage(messages.filter(m => m.role === 'user').map(m => m.content).join(' '));
    const t = ORDER_RESULT_TEXT[lang];
    try {
      const orderImageBase64 = await captureOrderSheet();
      const chatMessages = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderData, orderImageBase64, messages: chatMessages }),
      });
      const data = await res.json();
      if (data.success) {
        setResultModal({ type: 'success', title: t.successTitle, body: t.successBody(data.orderId), okLabel: t.okLabel });
        // 전체 초기화
        setStep('select');
        setMessages([]);
        setOrderData(null);
        setImages([]);
        uploadedImagesRef.current = [];
        pinnedImageRef.current = null;
        pinnedGloveRef.current = null;
        setUploadedImagesDisplay([]);
        setPinnedGloveDisplay(null);
        setCode('');
      } else {
        setResultModal({ type: 'error', title: t.errorTitle, body: t.errorBody, okLabel: t.okLabel });
      }
    } catch (error) {
      console.error('[DEBUG] handleOrderConfirm error:', error);
      setResultModal({ type: 'error', title: t.errorTitle, body: t.errorBody, okLabel: t.okLabel });
    }
    setLoading(false);
  };

  const renderMessage = (content: string, imageData?: { base64: string; type: string }[] | null) => {
    // 유저 이미지 메시지
    if (content === '[USER_IMAGE]' && imageData && imageData.length > 0) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: imageData.length > 1 ? '1fr 1fr' : '1fr', gap: '4px' }}>
          {imageData.map((img, i) => (
            <img
              key={i}
              src={`data:${img.type};base64,${img.base64}`}
              alt={`reference ${i + 1}`}
              className="w-full rounded-lg cursor-pointer"
              onClick={() => setModalImage(`data:${img.type};base64,${img.base64}`)}
            />
          ))}
        </div>
      );
    }

    // ORDER_COMPLETE 이후 텍스트(JSON 포함) 잘라내기
    const cutIndex = findOrderCompleteIndex(content);
    const cleanContent = content.substring(0, cutIndex).trim();

    // [SHOW_IMAGE: ...] 파싱
    const parts = cleanContent.split(/\[SHOW_IMAGE: ([^\]]+)\]/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <img
            key={i}
            src={`/gloves/${part}`}
            alt="glove"
            className="w-64 rounded-lg my-2 cursor-pointer"
            onClick={() => setModalImage(`/gloves/${part}`)}
          />
        );
      }
      return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
  };

  const renderPinnedImages = () => {
    if (uploadedImagesDisplay.length > 0) {
      if (uploadedImagesDisplay.length === 1) {
        return (
          <img
            src={`data:${uploadedImagesDisplay[0].type};base64,${uploadedImagesDisplay[0].base64}`}
            alt="ref"
            style={{ height: '60px', width: 'auto', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => setModalImage(`data:${uploadedImagesDisplay[0].type};base64,${uploadedImagesDisplay[0].base64}`)}
          />
        );
      }
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
          {uploadedImagesDisplay.slice(0, 4).map((img, i) => (
            <img
              key={i}
              src={`data:${img.type};base64,${img.base64}`}
              alt={`ref ${i + 1}`}
              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
              onClick={() => setModalImage(`data:${img.type};base64,${img.base64}`)}
            />
          ))}
        </div>
      );
    }
    if (pinnedGloveDisplay) {
      return (
        <div className="flex items-center gap-2">
          <img
            src={pinnedGloveDisplay.src}
            alt="pinned glove"
            style={{ height: '60px', width: 'auto', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => setModalImage(pinnedGloveDisplay.src)}
          />
          <span className="text-xs text-gray-300">{pinnedGloveDisplay.label}</span>
        </div>
      );
    }
    return null;
  };

  const killSwitch = process.env.NEXT_PUBLIC_KILL_SWITCH === 'true';

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">

      {/* 주문 결과 모달 */}
      {resultModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
        >
          <div
            style={{
              background: '#111827',
              border: `1px solid ${resultModal.type === 'success' ? '#facc15' : '#dc2626'}`,
              borderRadius: '14px',
              padding: '28px 24px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>
              {resultModal.type === 'success' ? '✅' : '⚠️'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: resultModal.type === 'success' ? '#facc15' : '#f87171', marginBottom: '12px' }}>
              {resultModal.title}
            </div>
            <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.7, whiteSpace: 'pre-line', textAlign: 'left' }}>
              {resultModal.body}
            </div>
            <button
              onClick={() => setResultModal(null)}
              style={{
                marginTop: '20px',
                width: '100%',
                background: '#facc15',
                color: '#111',
                fontWeight: 700,
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
              }}
            >
              {resultModal.okLabel}
            </button>
          </div>
        </div>
      )}

      {/* 이미지 모달 */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'pointer', padding: '20px' }}
        >
          <img
            src={modalImage}
            alt="full size"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setModalImage(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '18px', cursor: 'pointer' }}
          >✕</button>
        </div>
      )}

      {(step === 'email' || step === 'verify' || step === 'select') && <Nav />}

      {/* 이메일 입력 */}
      {step === 'email' && (
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
          {killSwitch ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">🧤</div>
              <h2 className="text-xl font-black text-yellow-400 mb-3">Currently At Full Capacity</h2>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                We're currently unable to guarantee our 30-day delivery promise due to high order volume. We'll be back soon!
              </p>
              <p className="text-gray-500 text-xs">Thank you for your patience. Please check back later.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-2">Korean Craft · Custom Order</div>
                <h1 className="text-3xl font-black text-white leading-tight mb-3">
                  Your Glove.<br />Your Way.<br /><span className="text-yellow-400">$169. 30 Days.</span>
                </h1>
                <p className="text-gray-400 text-sm">Everything custom. Nothing extra.</p>
              </div>
              <div className="border-t border-gray-700 pt-5">
                <p className="text-gray-500 text-xs mb-3">Enter your email to start. Your order summary will be sent here.</p>
                <input
                  className="w-full bg-gray-800 rounded-lg p-3 mb-4 outline-none text-white"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); emailRef.current = e.target.value; }}
                  onKeyDown={e => e.key === 'Enter' && sendCode()}
                />
                <button
                  onClick={sendCode}
                  disabled={loading}
                  className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-300"
                >
                  {loading ? 'Sending...' : 'Start Designing →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 코드 인증 */}
      {step === 'verify' && (
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">Check Your Email</h1>
          <p className="text-gray-400 mb-6">Enter the 6-digit code sent to {email}</p>
          <input
            className="w-full bg-gray-800 rounded-lg p-3 mb-4 outline-none text-center text-2xl tracking-widest"
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value)}
            maxLength={6}
          />
          <button
            onClick={verifyCode}
            disabled={loading}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-300"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      )}

      {/* 시작 방법 선택 */}
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
                sessionStorage.setItem('gnEmail', email);
                emailRef.current = email;
                setStep('chat');
                setMessages([{
                  role: 'assistant',
                  content: "🇺🇸 Welcome to GN Glove! I can chat in English, Korean, Japanese, Chinese, Spanish, French, German, and more.\n🇰🇷 GN Glove에 오신 걸 환영합니다! 한국어로도 대화 가능합니다.\n🇯🇵 GN Gloveへようこそ！日本語でも対応可能です。\n🇨🇳 欢迎来到GN Glove！也支持中文对话。\n🇪🇸 ¡Bienvenido a GN Glove! También hablamos español.\n🇫🇷 Bienvenue chez GN Glove ! Nous parlons aussi français.\n🇩🇪 Willkommen bei GN Glove! Wir sprechen auch Deutsch.\n\n👉 Just reply in your language and I'll continue in it!\n\nPlease upload 1 to 4 reference photos of the glove style you'd like — we'll make it exactly as shown, with any changes you tell us. If you have a specific embroidery design in mind, you're welcome to upload that too — just keep in mind gloves have a small embroidery area, so very large or detailed artwork (like a painting) can't be reproduced; simple designs that fit a small embroidery space work best.",
                }]);
              }}
              className="w-full bg-gray-700 text-white font-bold py-4 rounded-xl hover:bg-gray-600 text-lg"
            >
              📷 Upload My Photo
            </button>
          </div>
        </div>
      )}

      {/* 채팅 */}
      {step === 'chat' && (
        <div className="w-full max-w-2xl flex flex-col h-screen">
          <div className="bg-gray-900 p-3 text-center">
            <h1 className="text-xl font-bold text-yellow-400">GN GLOVE Custom Consultant</h1>
          </div>

          {(uploadedImagesDisplay.length > 0 || pinnedGloveDisplay) && (
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
                  <img
                    src={`data:${img.type};base64,${img.base64}`}
                    alt={`preview ${i + 1}`}
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                  <button
                    onClick={() => removeImage(i)}
                    style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' }}
                  >✕</button>
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
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-yellow-400 text-black font-bold px-6 rounded-lg hover:bg-yellow-300 flex-shrink-0"
              style={{ height: '44px' }}
            >Send</button>
          </div>
        </div>
      )}

      {/* 주문서 */}
      {step === 'order' && orderData && (
        <div className="w-full max-w-3xl py-8">
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div ref={orderSheetRef}>
              <OrderSheet orderData={orderData} onConfirm={handleOrderConfirm} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
'use client';

import { useState, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'verify' | 'chat'>('email');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<{ base64: string; type: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sendCode = async () => {
    setLoading(true);
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setStep('verify');
    setLoading(false);
  };

  const verifyCode = async () => {
    setLoading(true);
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
    const data = await res.json();
    if (data.success) {
      setStep('chat');
      setMessages([{ role: 'assistant', content: "Welcome to GN Glove! I'm your custom glove consultant. Let's design your perfect glove! Is this glove for baseball or softball?" }]);
    } else {
      alert(data.error);
    }
    setLoading(false);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImage({ base64, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if (!input.trim() && !image) return;
    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages, imageBase64: image?.base64, imageType: image?.type }),
    });
    const data = await res.json();
    setMessages([...newMessages, { role: 'assistant', content: data.message }]);
    setImage(null);
    setLoading(false);
  };

  const renderMessage = (content: string) => {
    const parts = content.split(/\[SHOW_IMAGE: ([^\]]+)\]/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <img key={i} src={`/gloves/${part}`} alt="glove" className="w-64 rounded-lg my-2" />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      {step === 'email' && (
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">GN GLOVE</h1>
          <p className="text-gray-400 mb-6">Enter your email to get started</p>
          <input className="w-full bg-gray-800 rounded-lg p-3 mb-4 outline-none" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          <button onClick={sendCode} disabled={loading} className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-300">
            {loading ? 'Sending...' : 'Send Code'}
          </button>
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

      {step === 'chat' && (
        <div className="w-full max-w-2xl flex flex-col h-screen">
          <div className="bg-gray-900 p-4 text-center">
            <h1 className="text-xl font-bold text-yellow-400">GN GLOVE Custom Consultant</h1>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-yellow-400 text-black' : 'bg-gray-800'}`}>
                  {renderMessage(msg.content)}
                </div>
              </div>
            ))}
            {loading && <div className="text-gray-400 text-sm">Typing...</div>}
          </div>
          {image && <div className="px-4 text-sm text-yellow-400">📎 Image attached</div>}
          <div className="p-4 bg-gray-900 flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="bg-gray-700 p-3 rounded-lg hover:bg-gray-600">📷</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            <input className="flex-1 bg-gray-800 rounded-lg p-3 outline-none" placeholder="Type a message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
            <button onClick={sendMessage} disabled={loading} className="bg-yellow-400 text-black font-bold px-6 rounded-lg hover:bg-yellow-300">Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
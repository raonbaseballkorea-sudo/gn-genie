'use client';

import { useState } from 'react';
import Nav from '../components/Nav';
import Link from 'next/link';

const languages = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'es', flag: '🇲🇽', label: 'Español' },
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
  { code: 'do', flag: '🇩🇴', label: 'Español (DO)' },
];

const content: Record<string, {
  title: string;
  subtitle: string;
  photoFirst: string;
  steps: { title: string; desc: string }[];
  questions: { num: number; text: string }[];
  cta: string;
}> = {
  en: {
    title: 'How to Order',
    subtitle: 'Just answer 10 questions. Your custom glove ships in 30 days.',
    photoFirst: '📸 We build from your photo — not clicks. Upload a reference photo or pick from our catalog. We follow the photo and only change what you ask.',
    steps: [
      { title: 'Step 1 — Enter Your Email', desc: 'No password needed. Just your email to start and receive your order summary.' },
      { title: 'Step 2 — Chat with Genie', desc: 'Our AI consultant Genie asks you 10 simple questions. Answer them and your order is set.' },
      { title: 'Step 3 — Confirm Your Order', desc: 'Review your order sheet and pay the flat $169 fee. No hidden charges.' },
      { title: 'Step 4 — Delivered in 30 Days', desc: 'Your custom glove ships from our Xiamen factory directly to your door.' },
    ],
    questions: [
      { num: 1, text: 'Baseball or softball?' },
      { num: 2, text: 'Adult or youth?' },
      { num: 3, text: 'Left or right hand throw?' },
      { num: 4, text: 'Size preference?' },
      { num: 5, text: 'Any color changes from the photo?' },
      { num: 6, text: 'Name embroidery? (text, color, position)' },
      { num: 7, text: 'Flag embroidery? (country or US state)' },
      { num: 8, text: 'Logo color preference?' },
      { num: 9, text: 'Your shipping information?' },
      { num: 10, text: 'Any message for your craftsman?' },
    ],
    cta: 'Start Designing →',
  },
  ko: {
    title: '주문 방법',
    subtitle: '10가지 질문에만 답하면 끝. 30일 안에 배송됩니다.',
    photoFirst: '📸 클릭으로 색을 바꾸는 방식이 아닙니다. 참고 사진 한 장이면 충분해요. Genie가 사진을 기준으로 제작하고, 바꾸고 싶은 부분만 말씀해 주세요.',
    steps: [
      { title: '1단계 — 이메일 입력', desc: '비밀번호 없이 이메일만 입력하면 시작됩니다. 주문 확인서도 이메일로 발송됩니다.' },
      { title: '2단계 — Genie와 채팅', desc: 'AI 컨설턴트 Genie가 10가지 질문을 드립니다. 답변하면 주문이 완성됩니다.' },
      { title: '3단계 — 주문 확인 및 결제', desc: '주문서를 확인하고 $169 정액 결제를 진행하세요. 추가 비용 없습니다.' },
      { title: '4단계 — 30일 내 배송', desc: '중국 샤먼 공장에서 직접 고객님 주소로 발송됩니다.' },
    ],
    questions: [
      { num: 1, text: '야구용인가요, 소프트볼용인가요?' },
      { num: 2, text: '성인용인가요, 유소년용인가요?' },
      { num: 3, text: '오른손 투구인가요, 왼손 투구인가요?' },
      { num: 4, text: '원하시는 사이즈는?' },
      { num: 5, text: '사진에서 바꾸고 싶은 색상이 있나요?' },
      { num: 6, text: '이름 자수는? (텍스트, 색상, 위치)' },
      { num: 7, text: '국기 자수는? (국가 또는 미국 주)' },
      { num: 8, text: '로고 색상 선택' },
      { num: 9, text: '배송지 정보를 알려주세요' },
      { num: 10, text: '장인에게 전하고 싶은 말이 있나요?' },
    ],
    cta: '주문 시작하기 →',
  },
  ja: {
    title: '注文方法',
    subtitle: '10の質問に答えるだけ。30日以内にお届けします。',
    photoFirst: '📸 クリックで色を変えるシステムではありません。参考写真1枚があれば十分です。Genieが写真をベースに製作し、変えたい部分だけお伝えください。',
    steps: [
      { title: 'ステップ1 — メール入力', desc: 'パスワード不要。メールアドレスだけで開始できます。' },
      { title: 'ステップ2 — Genieとチャット', desc: 'AIコンサルタントのGenieが10の質問をします。答えるだけで注文完了。' },
      { title: 'ステップ3 — 注文確認・お支払い', desc: '注文書を確認し、一律$169をお支払いください。追加料金なし。' },
      { title: 'ステップ4 — 30日以内にお届け', desc: '中国厦門工場から直接お客様のご住所へ発送します。' },
    ],
    questions: [
      { num: 1, text: '野球用ですか？ソフトボール用ですか？' },
      { num: 2, text: '大人用ですか？ユース用ですか？' },
      { num: 3, text: '右投げですか？左投げですか？' },
      { num: 4, text: 'ご希望のサイズは？' },
      { num: 5, text: '写真から変えたい色はありますか？' },
      { num: 6, text: '刺繍はありますか？（テキスト・色・位置）' },
      { num: 7, text: '国旗刺繍は？（国または米国の州）' },
      { num: 8, text: 'ロゴカラーの選択' },
      { num: 9, text: '配送先情報をお知らせください' },
      { num: 10, text: '職人へのメッセージはありますか？' },
    ],
    cta: '注文を始める →',
  },
  zh: {
    title: '如何下单',
    subtitle: '只需回答10个问题，30天内送达。',
    photoFirst: '📸 我们不是点击换色的系统。一张参考照片就够了。Genie根据照片制作，只记录您想更改的部分。',
    steps: [
      { title: '第一步 — 输入邮箱', desc: '无需密码，只需输入邮箱即可开始。订单确认也将发送到此邮箱。' },
      { title: '第二步 — 与Genie聊天', desc: 'AI顾问Genie会问您10个简单问题，回答完毕即完成订单。' },
      { title: '第三步 — 确认订单并付款', desc: '确认订单后支付统一价格$169，无任何隐藏费用。' },
      { title: '第四步 — 30天内送达', desc: '从厦门工厂直接发货至您的地址。' },
    ],
    questions: [
      { num: 1, text: '棒球手套还是垒球手套？' },
      { num: 2, text: '成人款还是青少年款？' },
      { num: 3, text: '右投还是左投？' },
      { num: 4, text: '您希望的尺寸是？' },
      { num: 5, text: '与照片相比，有什么颜色需要更改吗？' },
      { num: 6, text: '需要刺绣吗？（文字、颜色、位置）' },
      { num: 7, text: '需要国旗刺绣吗？（国家或美国州旗）' },
      { num: 8, text: 'Logo颜色选择' },
      { num: 9, text: '请提供配送地址' },
      { num: 10, text: '有什么想对工匠说的话吗？' },
    ],
    cta: '开始设计 →',
  },
  es: {
    title: 'Cómo Ordenar',
    subtitle: 'Solo responde 10 preguntas. Tu guante llega en 30 días.',
    photoFirst: '📸 No hacemos cambios de color con clics. Con una foto de referencia es suficiente. Genie fabrica según la foto y solo registra los cambios que pidas.',
    steps: [
      { title: 'Paso 1 — Ingresa tu email', desc: 'Sin contraseña. Solo tu email para empezar y recibir el resumen de tu pedido.' },
      { title: 'Paso 2 — Chatea con Genie', desc: 'Nuestro consultor AI Genie te hace 10 preguntas simples. Respóndelas y tu pedido está listo.' },
      { title: 'Paso 3 — Confirma y paga', desc: 'Revisa tu hoja de pedido y paga el precio fijo de $169. Sin cargos ocultos.' },
      { title: 'Paso 4 — Entrega en 30 días', desc: 'Tu guante sale de nuestra fábrica en Xiamen directo a tu puerta.' },
    ],
    questions: [
      { num: 1, text: '¿Béisbol o softbol?' },
      { num: 2, text: '¿Adulto o juvenil?' },
      { num: 3, text: '¿Lanza con la derecha o la izquierda?' },
      { num: 4, text: '¿Talla preferida?' },
      { num: 5, text: '¿Algún cambio de color respecto a la foto?' },
      { num: 6, text: '¿Bordado de nombre? (texto, color, posición)' },
      { num: 7, text: '¿Bordado de bandera? (país o estado de EE.UU.)' },
      { num: 8, text: 'Color del logo' },
      { num: 9, text: 'Información de envío' },
      { num: 10, text: '¿Mensaje para tu artesano?' },
    ],
    cta: 'Empezar a diseñar →',
  },
  pt: {
    title: 'Como Pedir',
    subtitle: 'Responda apenas 10 perguntas. Sua luva chega em 30 dias.',
    photoFirst: '📸 Não usamos cliques para mudar cores. Uma foto de referência é suficiente. O Genie fabrica com base na foto e registra apenas as mudanças que você pedir.',
    steps: [
      { title: 'Passo 1 — Digite seu email', desc: 'Sem senha. Só seu email para começar e receber o resumo do pedido.' },
      { title: 'Passo 2 — Converse com o Genie', desc: 'Nosso consultor AI Genie faz 10 perguntas simples. Responda e seu pedido estará pronto.' },
      { title: 'Passo 3 — Confirme e pague', desc: 'Revise sua ficha de pedido e pague o valor fixo de $169. Sem taxas ocultas.' },
      { title: 'Passo 4 — Entrega em 30 dias', desc: 'Sua luva sai da nossa fábrica em Xiamen direto para sua porta.' },
    ],
    questions: [
      { num: 1, text: 'Beisebol ou softbol?' },
      { num: 2, text: 'Adulto ou juvenil?' },
      { num: 3, text: 'Arremessa com a direita ou esquerda?' },
      { num: 4, text: 'Tamanho preferido?' },
      { num: 5, text: 'Alguma mudança de cor em relação à foto?' },
      { num: 6, text: 'Bordado com nome? (texto, cor, posição)' },
      { num: 7, text: 'Bordado de bandeira? (país ou estado dos EUA)' },
      { num: 8, text: 'Cor do logo' },
      { num: 9, text: 'Informações de entrega' },
      { num: 10, text: 'Mensagem para seu artesão?' },
    ],
    cta: 'Começar a criar →',
  },
  do: {
    title: 'Cómo Ordenar',
    subtitle: 'Solo responde 10 preguntas. Tu guante llega en 30 días.',
    photoFirst: '📸 No cambiamos colores con clics. Una foto de referencia es todo lo que necesitas. Genie fabrica según la foto y solo anota los cambios que solicites.',
    steps: [
      { title: 'Paso 1 — Ingresa tu email', desc: 'Sin contraseña. Solo tu email para comenzar y recibir el resumen de tu pedido.' },
      { title: 'Paso 2 — Chatea con Genie', desc: 'Nuestro consultor AI Genie te hace 10 preguntas sencillas. Respóndelas y tu pedido queda listo.' },
      { title: 'Paso 3 — Confirma y paga', desc: 'Revisa tu orden y paga el precio fijo de $169. Sin cobros adicionales.' },
      { title: 'Paso 4 — Entrega en 30 días', desc: 'Tu guante sale de nuestra fábrica en Xiamen directo a tu casa.' },
    ],
    questions: [
      { num: 1, text: '¿Béisbol o softbol?' },
      { num: 2, text: '¿Adulto o juvenil?' },
      { num: 3, text: '¿Lanza con la derecha o la izquierda?' },
      { num: 4, text: '¿Qué talla prefieres?' },
      { num: 5, text: '¿Quieres cambiar algún color de la foto?' },
      { num: 6, text: '¿Bordado de nombre? (texto, color, posición)' },
      { num: 7, text: '¿Bordado de bandera? (país o estado de EE.UU.)' },
      { num: 8, text: 'Color del logo' },
      { num: 9, text: 'Dirección de envío' },
      { num: 10, text: '¿Mensaje para tu artesano?' },
    ],
    cta: 'Comenzar a diseñar →',
  },
};

export default function HowToOrderPage() {
  const [lang, setLang] = useState('en');
  const c = content[lang];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Nav />

      {/* Language Selector */}
      <div className="flex justify-center gap-2 flex-wrap px-4 pt-8 pb-4">
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              lang === l.code
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-yellow-400'
            }`}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>

      {/* Title */}
      <section className="px-6 py-8 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-black mb-3">{c.title}</h1>
        <p className="text-gray-400 text-lg">{c.subtitle}</p>
      </section>

      {/* Photo First Notice */}
      <section className="px-6 pb-8 max-w-2xl mx-auto">
        <div className="bg-yellow-400 text-black rounded-2xl p-5 font-medium text-sm leading-relaxed">
          {c.photoFirst}
        </div>
      </section>

      {/* Steps */}
      <section className="px-6 pb-8 max-w-2xl mx-auto space-y-4">
        {c.steps.map((step, i) => (
          <div key={i} className="bg-gray-900 rounded-xl p-5 flex gap-4">
            <div className="bg-yellow-400 text-black font-black rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
              {i + 1}
            </div>
            <div>
              <div className="font-bold text-white mb-1">{step.title}</div>
              <div className="text-gray-400 text-sm">{step.desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* 10 Questions */}
      <section className="px-6 pb-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-black mb-4 text-yellow-400">10 Questions</h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {c.questions.map((q, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-4 ${i !== c.questions.length - 1 ? 'border-b border-gray-800' : ''}`}
            >
              <div className="text-yellow-400 font-black text-lg w-6 text-center">{q.num}</div>
              <div className="text-gray-300 text-sm">{q.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16 max-w-2xl mx-auto text-center">
        <Link
          href="/"
          className="bg-yellow-400 text-black font-bold px-10 py-4 rounded-xl hover:bg-yellow-300 inline-block text-lg"
        >
          {c.cta}
        </Link>
      </section>
    </div>
  );
}
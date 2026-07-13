'use client';

import { useState, useRef, useEffect } from 'react';
import OrderSheet, { GNLogo } from './components/OrderSheet';
import Nav from './components/Nav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageData?: { base64: string; type: string }[] | null;
}

export default function ChatPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'verify' | 'language' | 'intro' | 'select' | 'chat' | 'craftsman' | 'order'>('email');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // intro(주문방법 안내/Q&A) 스텝 전용 대화 — 실제 주문 messages와는 분리
  const [introMessages, setIntroMessages] = useState<Message[]>([]);
  const [introInput, setIntroInput] = useState('');
  const introMessagesEndRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<{ base64: string; type: string }[]>([]);
  const [orderData, setOrderData] = useState<any>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<{ type: 'success' | 'error'; title: string; body: string; okLabel: string } | null>(null);
  // "Start My Order" 버튼이 입력창 바로 위에 있어 오터치로 바로 주문이 시작되는 것을 막기 위한 확인 모달
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Lang | null>(null);
  const [orderProcessing, setOrderProcessing] = useState(false);
  const selectedLanguageRef = useRef<Lang | null>(null);
  // 장인 메시지 — AI가 아니라 앱이 결정론적 스텝으로 수집(ORDER_COMPLETE 직후, 주문서 직전)
  const [craftsmanMsg, setCraftsmanMsg] = useState('');
  const [craftsmanBusy, setCraftsmanBusy] = useState(false);
  // 로고 패치 색 — [LOGO_PICK] 마커가 오면 스와치 팔레트로 배경색→글자색을 고름(모호한 답 원천 차단).
  // 배경색을 먼저 고르면 여기에 저장하고, 글자색까지 고르면 AI에 정확한 이름+hex를 전송.
  const [logoBg, setLogoBg] = useState<{ name: string; hex: string } | null>(null);
  const [logoLetter, setLogoLetter] = useState<{ name: string; hex: string } | null>(null);
  // 변경 요청 루프 — 확정된 변경 횟수(최대 3)와, "변경할게요" 후 입력 유도 중인지 여부
  const [changeCount, setChangeCount] = useState(0);
  const [changeInputMode, setChangeInputMode] = useState(false);
  // 고객정보 폼 — [CUSTOMER_FORM] 마커가 오면 결정론적 폼으로 이름/전화/주소를 받고,
  // 제출 시 /api/validate-address로 우편번호↔주소를 검증한 뒤에만 AI로 전송.
  const [cf, setCf] = useState({ name: '', phone: '', country: '', countryOther: '', street: '', city: '', state: '', postal: '' });
  const [cfValidating, setCfValidating] = useState(false);
  const [cfError, setCfError] = useState<string | null>(null);

  // useRef — 렌더링과 무관하게 항상 최신값 유지
  const uploadedImagesRef = useRef<{ base64: string; type: string }[]>([]);
  const pinnedImageRef = useRef<{ base64: string; type: string } | null>(null);
  const pinnedGloveRef = useRef<{ src: string; label: string } | null>(null);
  const selectedGloveRawRef = useRef<{ id: string; category: string; label: string } | null>(null);
  // 사진을 모델에 다시 보낼지 여부 — AI가 [[PHOTO_DONE]] 마커를 보내면 false로 전환
  const photoNeededRef = useRef(true);
  const emailRef = useRef<string>('');

  // 화면 표시용 state (ref와 동기화)
  const [uploadedImagesDisplay, setUploadedImagesDisplay] = useState<{ base64: string; type: string }[]>([]);
  const [pinnedGloveDisplay, setPinnedGloveDisplay] = useState<{ src: string; label: string } | null>(null);

  // 스펙 위저드 — sport/player_type/hand/position/size를 API 호출 없이 버튼으로 수집
  type SpecField = 'sport' | 'player_type' | 'hand' | 'position' | 'palm_construction' | 'size';
  const [specStep, setSpecStep] = useState<SpecField | null>(null);
  const specAnswersRef = useRef<Record<SpecField, string>>({ sport: '', player_type: '', hand: '', position: '', palm_construction: '', size: '' });
  // 위저드 진행 중 손님이 타이핑으로 답하려 할 때(오랜만이라 무심코 텍스트를 입력하는 경우 등) 버튼 선택을 안내
  const [specNudge, setSpecNudge] = useState(false);
  // FLOW B(사진 업로드)는 첫 API 응답(경고+색상 코멘트)이 온 직후에 위저드를 시작해야 하므로 대기 플래그로 표시
  const specWizardPendingRef = useRef(false);
  // 사진 분석 첫 응답을 기다리는 동안, 위저드로 바로 넘어가지 않고 "시작할까요?" 확인 게이트를 거친다.
  // preWizardGateRef: 위저드 시작 전(게이트 활성) 구간 표시. awaitingStartConfirm: 게이트 UI 렌더 여부.
  const preWizardGateRef = useRef(false);
  const [awaitingStartConfirm, setAwaitingStartConfirm] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const orderSheetRef = useRef<HTMLDivElement>(null);
  const factorySheetRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ORDER_COMPLETE 텍스트가 시작되는 인덱스를 찾는 헬퍼
  const findOrderCompleteIndex = (text: string): number => {
    const idx = text.search(/ORDER_COMPLETE/);
    return idx !== -1 ? idx : text.length;
  };

  type Lang = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'it' | 'nl' | 'th' | 'tl' | 'pt';

  // 언어 선택 버튼 목록 — 채팅 진입 시 가장 먼저 보여줌
  const LANGUAGES: { code: Lang; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'zh', label: '中文' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'th', label: 'ภาษาไทย' },
    { code: 'tl', label: 'Filipino' },
    { code: 'pt', label: 'Português' },
  ];

  const LANGUAGE_NAMES: Record<Lang, string> = {
    en: 'English', ko: 'Korean', ja: 'Japanese', zh: 'Chinese', es: 'Spanish',
    fr: 'French', de: 'German', it: 'Italian', nl: 'Dutch', th: 'Thai', tl: 'Filipino', pt: 'Portuguese',
  };

  // 카탈로그 글러브를 미리 선택한 경우의 환영 메시지
  const CATALOG_WELCOME: Record<Lang, (label: string, category: string, imgTag: string) => string> = {
    en: (l, c, img) => `Welcome to GN Glove! I have selected this glove for you: ${l} (${c}). ${img} Would you like to order this exact glove, or customize it further?`,
    ko: (l, c, img) => `GN 글러브에 오신 것을 환영합니다! 선택하신 글러브입니다: ${l} (${c}). ${img} 이 글러브 그대로 주문하시겠어요, 아니면 커스터마이징하시겠어요?`,
    ja: (l, c, img) => `GN GLOVEへようこそ！お選びいただいたグラブです: ${l} (${c})。${img} このまま注文しますか、それともカスタマイズしますか？`,
    zh: (l, c, img) => `欢迎来到 GN GLOVE！这是您选择的手套：${l} (${c})。${img} 您想直接订购这款手套，还是想进一步定制？`,
    es: (l, c, img) => `¡Bienvenido a GN Glove! Has seleccionado este guante: ${l} (${c}). ${img} ¿Quieres pedir este guante tal cual, o personalizarlo más?`,
    fr: (l, c, img) => `Bienvenue chez GN Glove ! Vous avez sélectionné ce gant : ${l} (${c}). ${img} Voulez-vous commander ce gant tel quel, ou le personnaliser ?`,
    de: (l, c, img) => `Willkommen bei GN Glove! Du hast diesen Handschuh ausgewählt: ${l} (${c}). ${img} Möchtest du diesen Handschuh genau so bestellen oder weiter anpassen?`,
    it: (l, c, img) => `Benvenuto in GN Glove! Hai selezionato questo guanto: ${l} (${c}). ${img} Vuoi ordinare questo guanto così com'è, o personalizzarlo ulteriormente?`,
    nl: (l, c, img) => `Welkom bij GN Glove! Je hebt deze handschoen geselecteerd: ${l} (${c}). ${img} Wil je deze handschoen precies zo bestellen, of verder aanpassen?`,
    th: (l, c, img) => `ยินดีต้อนรับสู่ GN Glove! คุณได้เลือกถุงมือนี้: ${l} (${c}). ${img} ต้องการสั่งถุงมือนี้ตามเดิม หรือปรับแต่งเพิ่มเติม?`,
    tl: (l, c, img) => `Maligayang pagdating sa GN Glove! Napili mo ang glove na ito: ${l} (${c}). ${img} Gusto mo bang i-order ang glove na ito mismo, o gawing custom pa?`,
    pt: (l, c, img) => `Bem-vindo à GN Glove! Você selecionou esta luva: ${l} (${c}). ${img} Você gostaria de pedir esta luva exatamente assim, ou personalizá-la mais?`,
  };

  // 본인 사진으로 주문하는 경우의 업로드 안내
  const UPLOAD_PROMPT: Record<Lang, string> = {
    en: 'Great! Please upload 1 to 4 photos of the glove you\'d like to use as a reference.',
    ko: '좋습니다! 참고하고 싶은 글러브 사진을 1장에서 4장까지 업로드해주세요.',
    ja: 'かしこまりました！参考にしたいグラブの写真を1〜4枚アップロードしてください。',
    zh: '好的！请上传1到4张您想作为参考的手套照片。',
    es: '¡Perfecto! Sube de 1 a 4 fotos del guante que quieras usar como referencia.',
    fr: 'Parfait ! Veuillez télécharger 1 à 4 photos du gant que vous souhaitez utiliser comme référence.',
    de: 'Super! Bitte lade 1 bis 4 Fotos des Handschuhs hoch, den du als Referenz verwenden möchtest.',
    it: 'Perfetto! Carica da 1 a 4 foto del guanto che vuoi usare come riferimento.',
    nl: 'Geweldig! Upload 1 tot 4 foto\'s van de handschoen die je als referentie wilt gebruiken.',
    th: 'เยี่ยมเลย! กรุณาอัปโหลดรูปถุงมือ 1 ถึง 4 รูปที่คุณต้องการใช้เป็นข้อมูลอ้างอิง',
    tl: 'Maganda! Paki-upload ang 1 hanggang 4 na larawan ng glove na gusto mong gamiting reference.',
    pt: 'Ótimo! Por favor, envie de 1 a 4 fotos da luva que você gostaria de usar como referência.',
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
    it: {
      successTitle: 'Ordine confermato!',
      successBody: (id) => `Il tuo ordine ${id} è stato ricevuto. Controlla la tua email per il riepilogo dell'ordine.\n\nSe qualcosa non è chiaro ai nostri artigiani, potremmo inviarti un'email di follow-up per confermare i dettagli — rispondi appena possibile per non ritardare la produzione.`,
      errorTitle: 'Qualcosa è andato storto',
      errorBody: 'Per favore riprova.',
      okLabel: 'OK',
    },
    nl: {
      successTitle: 'Bestelling bevestigd!',
      successBody: (id) => `Je bestelling ${id} is ontvangen. Controleer je e-mail voor de bestelsamenvatting.\n\nAls iets in je bestelling onduidelijk is voor onze vakmensen, kunnen we je een vervolgmail sturen om details te bevestigen — reageer zo snel mogelijk zodat de productie niet vertraagd wordt.`,
      errorTitle: 'Er is iets misgegaan',
      errorBody: 'Probeer het opnieuw.',
      okLabel: 'OK',
    },
    th: {
      successTitle: 'ยืนยันคำสั่งซื้อแล้ว!',
      successBody: (id) => `ได้รับคำสั่งซื้อ ${id} ของคุณแล้ว กรุณาตรวจสอบอีเมลของคุณเพื่อดูสรุปคำสั่งซื้อ\n\nหากมีส่วนใดในคำสั่งซื้อที่ช่างฝีมือของเราไม่ชัดเจน เราอาจส่งอีเมลติดตามเพื่อยืนยันรายละเอียด — กรุณาตอบกลับโดยเร็วที่สุดเพื่อไม่ให้การผลิตล่าช้า`,
      errorTitle: 'มีบางอย่างผิดพลาด',
      errorBody: 'กรุณาลองอีกครั้ง',
      okLabel: 'ตกลง',
    },
    tl: {
      successTitle: 'Nakumpirma ang Order!',
      successBody: (id) => `Natanggap na ang order mo ${id}. Paki-check ang iyong email para sa buod ng order.\n\nKung may bahagi ng order na hindi malinaw sa aming mga craftsman, posibleng magpadala kami ng follow-up email para kumpirmahin ang detalye — paki-sagot agad para hindi maantala ang produksyon.`,
      errorTitle: 'May Naging Mali',
      errorBody: 'Pakisubukan ulit.',
      okLabel: 'OK',
    },
    pt: {
      successTitle: 'Pedido Confirmado!',
      successBody: (id) => `Seu pedido ${id} foi recebido. Por favor, verifique seu e-mail para o resumo do pedido.\n\nSe algo no seu pedido não estiver claro para nossos artesãos, podemos enviar um e-mail de acompanhamento para confirmar os detalhes — por favor, responda o mais rápido possível para não atrasar a produção.`,
      errorTitle: 'Algo deu errado',
      errorBody: 'Por favor, tente novamente.',
      okLabel: 'OK',
    },
  };

  const PROCESSING_TEXT: Record<Lang, string> = {
    en: 'Processing your order — please wait, this may take a moment...',
    ko: '주문을 처리 중입니다 — 잠시만 기다려주세요...',
    ja: 'ご注文を処理しています — しばらくお待ちください...',
    zh: '正在处理您的订单 — 请稍候...',
    es: 'Procesando tu pedido — por favor espera un momento...',
    fr: 'Traitement de votre commande en cours — veuillez patienter...',
    de: 'Ihre Bestellung wird verarbeitet — bitte warten Sie einen Moment...',
    it: 'Elaborazione del tuo ordine in corso — attendi un momento...',
    nl: 'Je bestelling wordt verwerkt — een moment geduld...',
    th: 'กำลังดำเนินการคำสั่งซื้อของคุณ — กรุณารอสักครู่...',
    tl: 'Pinoproseso ang iyong order — sandali lang...',
    pt: 'Processando seu pedido — aguarde um momento...',
  };

  // 언어 선택 이후 화면(intro/select/chat)에서 쓰이는 UI 문구 — 선택된 언어로 전환
  const UI_STRINGS: Record<Lang, {
    inputPlaceholder: string; sendButton: string; typing: string; introPlaceholder: string;
    startOrderButton: string; selectTitle: string; selectSubtitle: string; browseCatalogButton: string; uploadPhotoButton: string;
    confirmStartBody: string; confirmStartYes: string; confirmStartCancel: string;
  }> = {
    en: {
      inputPlaceholder: 'Type a message... (Shift+Enter for new line)', sendButton: 'Send', typing: 'Typing...',
      introPlaceholder: 'Ask a question... (Shift+Enter for new line)', startOrderButton: 'Start My Order →',
      selectTitle: 'How would you like to start?', selectSubtitle: 'Browse our collection or upload a reference photo',
      browseCatalogButton: '🧤 Browse Our Catalog', uploadPhotoButton: '📷 Upload My Photo',
      confirmStartBody: 'Start your order now? You can still ask questions after this.', confirmStartYes: 'Yes, Start', confirmStartCancel: 'Cancel',
    },
    ko: {
      inputPlaceholder: '메시지를 입력하세요... (Shift+Enter로 줄바꿈)', sendButton: '전송', typing: '입력 중...',
      introPlaceholder: '질문을 입력하세요... (Shift+Enter로 줄바꿈)', startOrderButton: '주문 시작하기 →',
      selectTitle: '어떻게 시작하시겠어요?', selectSubtitle: '카탈로그를 둘러보거나 참고 사진을 업로드하세요',
      browseCatalogButton: '🧤 카탈로그 보기', uploadPhotoButton: '📷 사진 업로드',
      confirmStartBody: '주문을 시작할까요? 이후에도 질문하실 수 있어요.', confirmStartYes: '네, 시작할게요', confirmStartCancel: '취소',
    },
    ja: {
      inputPlaceholder: 'メッセージを入力... (Shift+Enterで改行)', sendButton: '送信', typing: '入力中...',
      introPlaceholder: '質問を入力... (Shift+Enterで改行)', startOrderButton: '注文を始める →',
      selectTitle: 'どちらで始めますか？', selectSubtitle: 'カタログを見るか、参考写真をアップロードしてください',
      browseCatalogButton: '🧤 カタログを見る', uploadPhotoButton: '📷 写真をアップロード',
      confirmStartBody: '注文を始めますか？この後も質問できます。', confirmStartYes: 'はい、始めます', confirmStartCancel: 'キャンセル',
    },
    zh: {
      inputPlaceholder: '输入消息...（Shift+Enter换行）', sendButton: '发送', typing: '正在输入...',
      introPlaceholder: '输入您的问题...（Shift+Enter换行）', startOrderButton: '开始订购 →',
      selectTitle: '您想如何开始？', selectSubtitle: '浏览我们的目录或上传参考照片',
      browseCatalogButton: '🧤 浏览目录', uploadPhotoButton: '📷 上传照片',
      confirmStartBody: '要开始订购吗？之后仍然可以提问。', confirmStartYes: '是的，开始', confirmStartCancel: '取消',
    },
    es: {
      inputPlaceholder: 'Escribe un mensaje... (Shift+Enter para nueva línea)', sendButton: 'Enviar', typing: 'Escribiendo...',
      introPlaceholder: 'Haz una pregunta... (Shift+Enter para nueva línea)', startOrderButton: 'Comenzar mi pedido →',
      selectTitle: '¿Cómo te gustaría empezar?', selectSubtitle: 'Explora nuestro catálogo o sube una foto de referencia',
      browseCatalogButton: '🧤 Ver catálogo', uploadPhotoButton: '📷 Subir mi foto',
      confirmStartBody: '¿Deseas comenzar tu pedido? Aún puedes hacer preguntas después.', confirmStartYes: 'Sí, comenzar', confirmStartCancel: 'Cancelar',
    },
    fr: {
      inputPlaceholder: 'Écrivez un message... (Maj+Entrée pour un saut de ligne)', sendButton: 'Envoyer', typing: "En train d'écrire...",
      introPlaceholder: 'Posez une question... (Maj+Entrée pour un saut de ligne)', startOrderButton: 'Commencer ma commande →',
      selectTitle: 'Comment souhaitez-vous commencer ?', selectSubtitle: 'Parcourez notre catalogue ou téléchargez une photo de référence',
      browseCatalogButton: '🧤 Parcourir le catalogue', uploadPhotoButton: '📷 Télécharger ma photo',
      confirmStartBody: 'Voulez-vous commencer votre commande ? Vous pourrez encore poser des questions après.', confirmStartYes: 'Oui, commencer', confirmStartCancel: 'Annuler',
    },
    de: {
      inputPlaceholder: 'Nachricht eingeben... (Umschalt+Enter für neue Zeile)', sendButton: 'Senden', typing: 'Schreibt...',
      introPlaceholder: 'Stelle eine Frage... (Umschalt+Enter für neue Zeile)', startOrderButton: 'Bestellung starten →',
      selectTitle: 'Wie möchtest du starten?', selectSubtitle: 'Durchstöbere unseren Katalog oder lade ein Referenzfoto hoch',
      browseCatalogButton: '🧤 Katalog durchsuchen', uploadPhotoButton: '📷 Foto hochladen',
      confirmStartBody: 'Möchtest du deine Bestellung jetzt starten? Du kannst danach noch Fragen stellen.', confirmStartYes: 'Ja, starten', confirmStartCancel: 'Abbrechen',
    },
    it: {
      inputPlaceholder: 'Scrivi un messaggio... (Maiusc+Invio per andare a capo)', sendButton: 'Invia', typing: 'Sta scrivendo...',
      introPlaceholder: 'Fai una domanda... (Maiusc+Invio per andare a capo)', startOrderButton: 'Inizia il mio ordine →',
      selectTitle: 'Come vuoi iniziare?', selectSubtitle: 'Sfoglia il nostro catalogo o carica una foto di riferimento',
      browseCatalogButton: '🧤 Sfoglia il catalogo', uploadPhotoButton: '📷 Carica la mia foto',
      confirmStartBody: 'Vuoi iniziare il tuo ordine ora? Potrai comunque fare domande dopo.', confirmStartYes: 'Sì, inizia', confirmStartCancel: 'Annulla',
    },
    nl: {
      inputPlaceholder: 'Typ een bericht... (Shift+Enter voor nieuwe regel)', sendButton: 'Verzenden', typing: 'Aan het typen...',
      introPlaceholder: 'Stel een vraag... (Shift+Enter voor nieuwe regel)', startOrderButton: 'Start mijn bestelling →',
      selectTitle: 'Hoe wil je beginnen?', selectSubtitle: 'Blader door onze catalogus of upload een referentiefoto',
      browseCatalogButton: '🧤 Bekijk catalogus', uploadPhotoButton: '📷 Foto uploaden',
      confirmStartBody: 'Wil je nu je bestelling starten? Je kunt daarna nog vragen stellen.', confirmStartYes: 'Ja, starten', confirmStartCancel: 'Annuleren',
    },
    th: {
      inputPlaceholder: 'พิมพ์ข้อความ... (Shift+Enter เพื่อขึ้นบรรทัดใหม่)', sendButton: 'ส่ง', typing: 'กำลังพิมพ์...',
      introPlaceholder: 'พิมพ์คำถามของคุณ... (Shift+Enter เพื่อขึ้นบรรทัดใหม่)', startOrderButton: 'เริ่มสั่งซื้อ →',
      selectTitle: 'คุณต้องการเริ่มต้นอย่างไร?', selectSubtitle: 'เลือกดูแคตตาล็อกของเราหรืออัปโหลดรูปภาพอ้างอิง',
      browseCatalogButton: '🧤 ดูแคตตาล็อก', uploadPhotoButton: '📷 อัปโหลดรูปภาพ',
      confirmStartBody: 'ต้องการเริ่มสั่งซื้อตอนนี้ไหม? คุณยังถามคำถามได้หลังจากนี้', confirmStartYes: 'ใช่ เริ่มเลย', confirmStartCancel: 'ยกเลิก',
    },
    tl: {
      inputPlaceholder: 'Mag-type ng mensahe... (Shift+Enter para sa bagong linya)', sendButton: 'Ipadala', typing: 'Nagta-type...',
      introPlaceholder: 'Magtanong... (Shift+Enter para sa bagong linya)', startOrderButton: 'Simulan ang Order Ko →',
      selectTitle: 'Paano mo gustong magsimula?', selectSubtitle: 'Tingnan ang aming katalogo o mag-upload ng reference photo',
      browseCatalogButton: '🧤 Tingnan ang Katalogo', uploadPhotoButton: '📷 I-upload ang Larawan Ko',
      confirmStartBody: 'Simulan na ba ang order mo? Puwede ka pa ring magtanong pagkatapos nito.', confirmStartYes: 'Oo, simulan', confirmStartCancel: 'Kanselahin',
    },
    pt: {
      inputPlaceholder: 'Digite uma mensagem... (Shift+Enter para nova linha)', sendButton: 'Enviar', typing: 'Digitando...',
      introPlaceholder: 'Faça uma pergunta... (Shift+Enter para nova linha)', startOrderButton: 'Iniciar Meu Pedido →',
      selectTitle: 'Como você gostaria de começar?', selectSubtitle: 'Explore nosso catálogo ou envie uma foto de referência',
      browseCatalogButton: '🧤 Ver Catálogo', uploadPhotoButton: '📷 Enviar Minha Foto',
      confirmStartBody: 'Deseja iniciar seu pedido agora? Você ainda pode fazer perguntas depois.', confirmStartYes: 'Sim, iniciar', confirmStartCancel: 'Cancelar',
    },
  };

  // 로그인 직후 목적지 스텝 결정 — 카탈로그에서 돌아온 경우(글러브+언어 복원) vs 새로 시작하는 경우 공통 처리
  const resolvePostLoginStep = () => {
    const saved = sessionStorage.getItem('selectedGlove');
    const selected = saved ? JSON.parse(saved) : null;
    const savedLang = sessionStorage.getItem('gnLang') as Lang | null;
    if (savedLang) {
      setSelectedLanguage(savedLang);
      selectedLanguageRef.current = savedLang;
    }
    if (selected) {
      sessionStorage.removeItem('selectedGlove');
      const glove = { src: `/gloves/${selected.category}/${selected.id}.jpg`, label: selected.label };
      pinnedGloveRef.current = glove;
      selectedGloveRawRef.current = selected;
      setPinnedGloveDisplay(glove);
      if (savedLang) {
        chooseLanguage(savedLang);
        setStep('chat');
      } else {
        setStep('language');
      }
    } else if (savedLang) {
      setStep('select');
    } else {
      setStep('language');
    }
  };

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('gnEmail');
    if (!savedEmail) return;
    setEmail(savedEmail);
    emailRef.current = savedEmail;
    resolvePostLoginStep();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    introMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [introMessages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

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
      resolvePostLoginStep();
    } else {
      alert(data.error);
    }
    setLoading(false);
  };

  // 첫 인사말 — 내용이 항상 고정이라 AI가 아니라 코드가 즉시 띄운다(진입 지연·문구 드리프트 제거).
  // 후속 Q&A만 AI(mode:'faq')가 담당. intro는 마크다운을 렌더하지 않으므로 순수 텍스트로 작성.
  const INTRO_GREETING: Record<Lang, string> = {
    en: 'Hello! 👋 Welcome to GN Glove!\n\nWe make custom baseball/softball gloves, and every glove is a flat $169 — with no extra charges at all. Color changes, embroidery, logos… everything is included.\n\nOrdering is simple:\n1. Upload 1–4 reference photos, or pick a glove from our catalog.\n2. Answer about 10 quick questions to build your glove.\n3. It ships within 30 days of payment.\n\nHave any questions? Feel free to ask — or just tap the button below to get started! 😊',
    ko: '안녕하세요! 👋 GN Glove에 오신 것을 환영합니다!\n\n저희는 맞춤형 야구/소프트볼 글러브를 만들며, 모든 글러브가 $169 — 추가 비용이 전혀 없습니다. 색상 변경, 자수, 로고까지 모두 포함이에요.\n\n주문 방식은 간단합니다:\n1. 원하는 글러브 사진(1~4장)을 올리거나 카탈로그에서 선택하고\n2. 약 10개의 간단한 질문에 답하면 끝이에요.\n3. 결제 후 30일 안에 배송됩니다.\n\n궁금한 점이 있으면 편하게 물어보세요. 바로 시작하시려면 아래 버튼을 눌러주세요! 😊',
    ja: 'こんにちは！👋 GN Glove へようこそ！\n\n当店はカスタム野球・ソフトボールグラブを制作しており、どのグラブも一律 $169 — 追加料金は一切ありません。カラー変更・刺繍・ロゴまですべて込みです。\n\nご注文はかんたん：\n1. お好きなグラブの写真（1〜4枚）をアップロード、またはカタログから選択\n2. 約10問のかんたんな質問に答えるだけ\n3. お支払いから30日以内に発送します。\n\nご質問があればお気軽にどうぞ。すぐ始めるには下のボタンを押してください！😊',
    zh: '您好！👋 欢迎来到 GN Glove！\n\n我们制作定制棒球/垒球手套，每副手套统一 $169 — 完全没有额外费用。改色、刺绣、徽标……全部包含在内。\n\n下单很简单：\n1. 上传1~4张参考照片，或从目录中选择一副手套\n2. 回答约10个简单问题来定制您的手套\n3. 付款后30天内发货。\n\n有任何问题都可以问我，或直接点击下方按钮开始吧！😊',
    es: '¡Hola! 👋 ¡Bienvenido a GN Glove!\n\nHacemos guantes de béisbol/softbol a medida, y cada guante cuesta $169 — sin cargos adicionales. Cambios de color, bordados, logos… todo está incluido.\n\nPedir es sencillo:\n1. Sube de 1 a 4 fotos de referencia, o elige un guante de nuestro catálogo.\n2. Responde unas 10 preguntas rápidas para crear tu guante.\n3. Se envía dentro de los 30 días tras el pago.\n\n¿Tienes preguntas? Pregúntame — o simplemente toca el botón de abajo para empezar. 😊',
    fr: 'Bonjour ! 👋 Bienvenue chez GN Glove !\n\nNous fabriquons des gants de baseball/softball sur mesure, et chaque gant est à $169 — sans aucun frais supplémentaire. Changements de couleur, broderies, logos… tout est inclus.\n\nCommander est simple :\n1. Téléchargez 1 à 4 photos de référence, ou choisissez un gant dans notre catalogue.\n2. Répondez à une dizaine de questions rapides pour créer votre gant.\n3. Livraison sous 30 jours après paiement.\n\nDes questions ? N’hésitez pas — ou appuyez sur le bouton ci-dessous pour commencer ! 😊',
    de: 'Hallo! 👋 Willkommen bei GN Glove!\n\nWir fertigen individuelle Baseball-/Softball-Handschuhe, und jeder Handschuh kostet pauschal $169 — ganz ohne Aufpreis. Farbänderungen, Stickereien, Logos… alles ist inklusive.\n\nBestellen ist einfach:\n1. Lade 1–4 Referenzfotos hoch oder wähle einen Handschuh aus unserem Katalog.\n2. Beantworte rund 10 kurze Fragen, um deinen Handschuh zu gestalten.\n3. Versand innerhalb von 30 Tagen nach Zahlung.\n\nFragen? Frag einfach — oder tippe unten auf den Button, um zu starten! 😊',
    it: 'Ciao! 👋 Benvenuto in GN Glove!\n\nRealizziamo guanti da baseball/softball su misura, e ogni guanto costa $169 — senza costi aggiuntivi. Cambi colore, ricami, loghi… è tutto incluso.\n\nOrdinare è semplice:\n1. Carica da 1 a 4 foto di riferimento, o scegli un guanto dal catalogo.\n2. Rispondi a circa 10 domande veloci per creare il tuo guanto.\n3. Spedizione entro 30 giorni dal pagamento.\n\nHai domande? Chiedi pure — oppure tocca il pulsante qui sotto per iniziare! 😊',
    nl: 'Hallo! 👋 Welkom bij GN Glove!\n\nWij maken op maat gemaakte honkbal-/softbalhandschoenen, en elke handschoen kost $169 — zonder extra kosten. Kleurwijzigingen, borduurwerk, logo’s… alles is inbegrepen.\n\nBestellen is eenvoudig:\n1. Upload 1–4 referentiefoto’s, of kies een handschoen uit onze catalogus.\n2. Beantwoord ongeveer 10 korte vragen om je handschoen samen te stellen.\n3. Verzending binnen 30 dagen na betaling.\n\nVragen? Stel ze gerust — of tik op de knop hieronder om te beginnen! 😊',
    th: 'สวัสดี! 👋 ยินดีต้อนรับสู่ GN Glove!\n\nเราทำถุงมือเบสบอล/ซอฟต์บอลแบบสั่งทำ ทุกใบราคาเดียว $169 — ไม่มีค่าใช้จ่ายเพิ่มเลย เปลี่ยนสี ปักชื่อ โลโก้… รวมทั้งหมดแล้ว\n\nสั่งซื้อง่ายมาก:\n1. อัปโหลดรูปอ้างอิง 1–4 รูป หรือเลือกถุงมือจากแคตตาล็อก\n2. ตอบคำถามสั้นๆ ประมาณ 10 ข้อเพื่อสร้างถุงมือของคุณ\n3. จัดส่งภายใน 30 วันหลังชำระเงิน\n\nมีคำถามไหม? ถามได้เลย หรือกดปุ่มด้านล่างเพื่อเริ่มได้เลย! 😊',
    tl: 'Kumusta! 👋 Maligayang pagdating sa GN Glove!\n\nGumagawa kami ng custom na baseball/softball gloves, at bawat glove ay $169 — walang anumang dagdag na bayad. Pagbabago ng kulay, burda, logo… kasama na lahat.\n\nMadali lang mag-order:\n1. Mag-upload ng 1–4 na reference photo, o pumili ng glove sa aming catalog.\n2. Sagutin ang mga 10 mabilis na tanong para buuin ang iyong glove.\n3. Ipapadala sa loob ng 30 araw pagkatapos magbayad.\n\nMay tanong? Magtanong lang — o pindutin ang button sa ibaba para magsimula! 😊',
    pt: 'Olá! 👋 Bem-vindo à GN Glove!\n\nFazemos luvas de beisebol/softbol personalizadas, e cada luva custa $169 — sem nenhuma taxa extra. Mudanças de cor, bordados, logos… está tudo incluído.\n\nFazer o pedido é simples:\n1. Envie de 1 a 4 fotos de referência, ou escolha uma luva no nosso catálogo.\n2. Responda a cerca de 10 perguntas rápidas para criar a sua luva.\n3. Enviamos em até 30 dias após o pagamento.\n\nTem dúvidas? É só perguntar — ou toque no botão abaixo para começar! 😊',
  };

  // 언어 스텝에서 언어 버튼 클릭 시 — 언어를 확정하고 intro(주문방법 안내/Q&A) 스텝으로 이동.
  // 인사말은 AI 호출 없이 정적 문구를 즉시 시드(후속 질문만 AI가 답변).
  const pickLanguage = (lang: Lang) => {
    setSelectedLanguage(lang);
    selectedLanguageRef.current = lang;
    sessionStorage.setItem('gnLang', lang);
    setIntroMessages([{ role: 'assistant', content: INTRO_GREETING[lang] }]);
    setStep('intro');
  };

  // 실제 주문 채팅 진입 시 — 선택 언어로 환영 메시지(카탈로그) 또는 업로드 안내(직접 사진) 표시하고 스펙 위저드 시작
  const chooseLanguage = (lang: Lang) => {
    setSelectedLanguage(lang);
    selectedLanguageRef.current = lang;
    sessionStorage.setItem('gnLang', lang);
    specAnswersRef.current = { sport: '', player_type: '', hand: '', position: '', palm_construction: '', size: '' };
    const selected = selectedGloveRawRef.current;
    if (selected) {
      const imgTag = `[SHOW_IMAGE: ${selected.category}/${selected.id}.jpg]`;
      setMessages([{
        role: 'assistant',
        content: CATALOG_WELCOME[lang](selected.label, selected.category, imgTag),
      }]);
      // FLOW A: 카탈로그 글러브가 이미 선택된 경우 API 호출 없이 스펙 위저드를 바로 시작
      setSpecStep('sport');
    } else {
      // FLOW B: 사진 업로드는 첫 API 응답(경고+색상 코멘트) 직후에 위저드를 시작
      specWizardPendingRef.current = true;
      setMessages([{ role: 'assistant', content: UPLOAD_PROMPT[lang] }]);
    }
  };

  // intro(주문방법 안내/Q&A) 스텝 전용 API 호출 — mode: 'faq'로 /api/chat을 호출, ORDER_COMPLETE 로직은 전혀 타지 않음
  const sendIntroMessage = async (overrideText?: string) => {
    const isFirstTurn = introMessages.length === 0;
    const text = overrideText !== undefined ? overrideText : introInput;
    if (!isFirstTurn && !text.trim()) return;

    const newIntroMessages = isFirstTurn ? introMessages : [...introMessages, { role: 'user' as const, content: text }];
    if (!isFirstTurn) setIntroMessages(newIntroMessages);
    if (overrideText === undefined) setIntroInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newIntroMessages.map(m => ({ role: m.role, content: m.content })),
          mode: 'faq',
          language: selectedLanguageRef.current || 'en',
        }),
      });
      const data = await res.json();
      setIntroMessages([...newIntroMessages, { role: 'assistant', content: data.message }]);
    } catch (err) {
      setIntroMessages([...newIntroMessages, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  const handleIntroKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return;
      if ((e.nativeEvent as any).isComposing) return;
      e.preventDefault();
      sendIntroMessage();
    }
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
    photoNeededRef.current = true;
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // /api/chat 호출 + 응답 처리 — sendMessage와 스펙 위저드(마지막 답변 시점) 둘 다에서 재사용
  const callChatAPI = async (newMessages: Message[]) => {
    setLoading(true);

    // 5단계(사진에서 바꿀 거 있는지)까지는 매 턴 사진을 다시 보내고,
    // AI가 [[PHOTO_DONE]] 마커로 6단계(자수) 진입을 알려오면 이후로는 전송 중단.
    const firstImage = photoNeededRef.current
      ? (uploadedImagesRef.current[0] || pinnedImageRef.current)
      : null;
    const currentEmail = emailRef.current || email || sessionStorage.getItem('gnEmail') || '';

    console.log('[DEBUG] callChatAPI — email:', currentEmail);

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
          language: selectedLanguageRef.current || 'en',
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
        setCraftsmanMsg('');
        // 장인 메시지를 결정론적 스텝에서 먼저 받고, 그 다음 주문서로 진입
        setStep('craftsman');
      } else {
        let replyText: string = data.message;
        if (replyText.includes('[[PHOTO_DONE]]')) {
          photoNeededRef.current = false;
          replyText = replyText.replace('[[PHOTO_DONE]]', '');
        }
        setMessages([...newMessages, { role: 'assistant', content: replyText }]);

        // FLOW B: 사진 업로드 후 첫 응답(경고+색상 코멘트)을 받으면 곧바로 위저드로 넘어가지 않고
        // "시작할까요?" 확인 게이트를 먼저 보여준다. 손님이 다른 질문을 타이핑해도(게이트 유지 중)
        // 답변을 받을 때마다 게이트를 다시 띄운다.
        if (specWizardPendingRef.current) {
          specWizardPendingRef.current = false;
          preWizardGateRef.current = true;
        }
        if (preWizardGateRef.current) {
          setAwaitingStartConfirm(true);
        }
      }
    } catch (err) {
      console.error('[DEBUG] fetch error:', err);
      setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    }

    setImages([]);
    setLoading(false);
  };

  const sendMessage = async (overrideText?: string) => {
    const text = overrideText !== undefined ? overrideText : input;
    if (!text.trim() && images.length === 0) return;

    // 버튼 위저드 진행 중에는 타이핑된 답을 API로 보내지 않고 버튼 선택을 안내 (프로그램 방식 전송(overrideText)은 예외)
    if (overrideText === undefined && specStep) {
      setSpecNudge(true);
      setInput('');
      return;
    }

    // 손님이 게이트를 무시하고 다른 질문을 타이핑하는 경우 — 답변이 올 때까지 게이트는 숨긴다(응답 후 재노출).
    if (awaitingStartConfirm) setAwaitingStartConfirm(false);
    // 변경 내용을 타이핑해 보내면 "무엇을 변경?" 안내는 닫는다(AI가 재확인 질문으로 이어받음).
    if (changeInputMode) setChangeInputMode(false);

    const userMessage: Message = {
      role: 'user',
      content: text || '[USER_IMAGE]',
      imageData: images.length > 0 ? [...images] : null,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (overrideText === undefined) setInput('');

    await callChatAPI(newMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return;
      if ((e.nativeEvent as any).isComposing) return;
      e.preventDefault();
      sendMessage();
    }
  };

  const captureOrderSheet = async (container: HTMLDivElement | null): Promise<string | null> => {
    if (!container) return null;
    try {
      const btn = container.querySelector<HTMLDivElement>('#confirm-btn-area');
      if (btn) btn.style.display = 'none';
      // 자수 글꼴(구글 폰트)이 로딩 완료된 후에 캡처해야 깨지지 않음
      if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }
      const html2canvas = (await import('html2canvas')).default;
      // 부모가 overflow-x: auto로 가로 스크롤되는 경우, 보이는 영역만 캡처되어
      // 우측이 잘리는 문제가 있었음 — 실제 전체 크기를 명시해서 강제로 전체 캡처
      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
      });
      if (btn) btn.style.display = '';
      // 첨부 이메일 용량을 줄이려 품질을 낮춤(0.92→0.75). 주문서/작업지시서 가독성은 유지되는 수준.
      return canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
    } catch (e) {
      console.error('Capture failed:', e);
      return null;
    }
  };

  // 장인 메시지 스텝 문구 — 12개 언어 (OrderSheet의 messageToCraftsman와 동일 톤)
  const CRAFTSMAN_STEP_TEXT: Record<Lang, { title: string; subtitle: string; placeholder: string; skip: string; next: string; sending: string }> = {
    en: { title: '✍️ A message for your craftsman?', subtitle: "Optional — this goes straight to the workbench of the maker who will craft your glove.", placeholder: 'Write your message (optional)', skip: 'Skip', next: 'Continue →', sending: 'Please wait...' },
    ko: { title: '✍️ 장인에게 남길 말씀이 있나요?', subtitle: '선택 사항이에요. 글러브를 직접 만드는 장인에게 그대로 전달됩니다.', placeholder: '메시지를 입력하세요 (선택)', skip: '건너뛰기', next: '다음 →', sending: '처리 중...' },
    ja: { title: '✍️ 職人へのメッセージはありますか？', subtitle: '任意です。グラブを作る職人の作業台へ直接届きます。', placeholder: 'メッセージを入力（任意）', skip: 'スキップ', next: '次へ →', sending: '処理中...' },
    zh: { title: '✍️ 想给工匠留言吗？', subtitle: '选填。将直接送到制作您手套的工匠工作台。', placeholder: '输入留言（选填）', skip: '跳过', next: '继续 →', sending: '处理中...' },
    es: { title: '✍️ ¿Un mensaje para tu artesano?', subtitle: 'Opcional. Llega directo al taller de quien hará tu guante.', placeholder: 'Escribe tu mensaje (opcional)', skip: 'Omitir', next: 'Continuar →', sending: 'Espera...' },
    fr: { title: '✍️ Un message pour votre artisan ?', subtitle: "Facultatif. Il arrive directement à l'atelier de celui qui fabriquera votre gant.", placeholder: 'Écrivez votre message (facultatif)', skip: 'Passer', next: 'Continuer →', sending: 'Veuillez patienter...' },
    de: { title: '✍️ Eine Nachricht an deinen Handwerker?', subtitle: 'Optional. Sie geht direkt an die Werkbank des Herstellers deines Handschuhs.', placeholder: 'Nachricht eingeben (optional)', skip: 'Überspringen', next: 'Weiter →', sending: 'Bitte warten...' },
    it: { title: '✍️ Un messaggio per il tuo artigiano?', subtitle: 'Facoltativo. Arriva direttamente al banco di chi realizzerà il tuo guanto.', placeholder: 'Scrivi il tuo messaggio (facoltativo)', skip: 'Salta', next: 'Continua →', sending: 'Attendere...' },
    nl: { title: '✍️ Een bericht voor je vakman?', subtitle: 'Optioneel. Het gaat direct naar de werkbank van de maker van je handschoen.', placeholder: 'Schrijf je bericht (optioneel)', skip: 'Overslaan', next: 'Doorgaan →', sending: 'Even geduld...' },
    th: { title: '✍️ มีข้อความถึงช่างฝีมือไหม?', subtitle: 'ไม่บังคับ ข้อความจะส่งตรงถึงโต๊ะทำงานของช่างที่ทำถุงมือของคุณ', placeholder: 'เขียนข้อความ (ไม่บังคับ)', skip: 'ข้าม', next: 'ต่อไป →', sending: 'กรุณารอ...' },
    tl: { title: '✍️ May mensahe ka ba para sa manggagawa?', subtitle: 'Opsyonal. Direktang mapupunta ito sa gagawa ng iyong glove.', placeholder: 'Isulat ang mensahe (opsyonal)', skip: 'Laktawan', next: 'Magpatuloy →', sending: 'Sandali lang...' },
    pt: { title: '✍️ Uma mensagem para o seu artesão?', subtitle: 'Opcional. Vai direto para a bancada de quem fará a sua luva.', placeholder: 'Escreva sua mensagem (opcional)', skip: 'Pular', next: 'Continuar →', sending: 'Aguarde...' },
  };

  // 장인 메시지 수집 완료 → (필요 시 공장용 zh 번역) → 주문서로 진입
  const proceedWithCraftsman = async (rawMsg: string) => {
    const msg = rawMsg.trim();
    const lang = selectedLanguageRef.current || 'en';
    if (!msg) {
      setOrderData((prev: any) => (prev ? { ...prev, special_requests: '', special_requests_zh: '' } : prev));
      setStep('order');
      return;
    }
    setCraftsmanBusy(true);
    let zh = msg; // 고객 언어가 중국어면 그대로, 번역 실패 시 원문 유지(내용은 최소한 전달)
    if (lang !== 'zh') {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'translate', text: msg }),
        });
        const data = await res.json();
        if (data && typeof data.zh === 'string' && data.zh.trim()) zh = data.zh.trim();
      } catch (e) {
        console.error('[craftsman] translate failed:', e);
      }
    }
    setOrderData((prev: any) => (prev ? { ...prev, special_requests: msg, special_requests_zh: zh } : prev));
    setCraftsmanBusy(false);
    setStep('order');
  };

  const handleOrderConfirm = async () => {
    setLoading(true);
    setOrderProcessing(true);
    const lang = selectedLanguageRef.current || 'en';
    const t = ORDER_RESULT_TEXT[lang];
    try {
      const [orderImageBase64, factoryImageBase64] = await Promise.all([
        captureOrderSheet(orderSheetRef.current),
        captureOrderSheet(factorySheetRef.current),
      ]);
      const chatMessages = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderData, orderImageBase64, factoryImageBase64, messages: chatMessages }),
      });
      const data = await res.json();
      if (data.success) {
        setResultModal({ type: 'success', title: t.successTitle, body: t.successBody(data.orderId), okLabel: t.okLabel });
        // 전체 초기화 — 언어도 리셋하므로 select(영어 기본값)가 아니라 언어 선택 화면으로 돌아간다
        setStep('language');
        setMessages([]);
        setOrderData(null);
        setImages([]);
        uploadedImagesRef.current = [];
        pinnedImageRef.current = null;
        pinnedGloveRef.current = null;
        selectedGloveRawRef.current = null;
        photoNeededRef.current = true;
        setChangeCount(0);
        setChangeInputMode(false);
        selectedLanguageRef.current = null;
        setSelectedLanguage(null);
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
    setOrderProcessing(false);
  };

  // 언어별 폰트 피커 샘플 이름
  const FONT_SAMPLE: Record<Lang, string> = {
    ko: '홍길동', ja: '鈴木一郎', zh: '王小明', th: 'สมชาย',
    en: 'John Smith', es: 'Carlos García', fr: 'Pierre Martin',
    de: 'Hans Müller', it: 'Marco Rossi', nl: 'Jan de Vries',
    tl: 'Juan dela Cruz', pt: 'João Silva',
  };

  // 언어별 폰트 정의 (OrderSheet.tsx의 EMBROIDERY_FONTS와 동기화)
  const FONT_OPTIONS: Record<string, { label: string; fontFamily: string; fontStyle?: string; fontWeight?: number }[]> = {
    latin: [
      { label: 'Script', fontFamily: "'Yellowtail', cursive" },
      { label: 'Block',  fontFamily: "'Arial Black', Impact, sans-serif", fontWeight: 900 },
      { label: 'Elegant', fontFamily: "'Times New Roman', Georgia, serif", fontStyle: 'italic' },
    ],
    ko: [
      { label: 'Script', fontFamily: "'Nanum Pen Script', cursive" },
      { label: 'Block',  fontFamily: "'Black Han Sans', sans-serif" },
      { label: 'Elegant', fontFamily: "'Nanum Myeongjo', serif", fontWeight: 700 },
    ],
    ja: [
      { label: 'Script', fontFamily: "'Yuji Syuku', serif" },
      { label: 'Block',  fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 },
      { label: 'Elegant', fontFamily: "'Noto Serif JP', serif", fontWeight: 700 },
    ],
    zh: [
      { label: 'Script', fontFamily: "'Ma Shan Zheng', cursive" },
      { label: 'Block',  fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900 },
      { label: 'Elegant', fontFamily: "'Noto Serif SC', serif", fontWeight: 700 },
    ],
    th: [
      { label: 'Script', fontFamily: "'Mali', cursive" },
      { label: 'Block',  fontFamily: "'Kanit', sans-serif", fontWeight: 700 },
      { label: 'Elegant', fontFamily: "'Charm', serif", fontWeight: 700 },
    ],
  };

  const detectScript = (text: string): string => {
    if (/[가-힣]/.test(text)) return 'ko';
    if (/[぀-ヿ一-鿿]/.test(text) && /[぀-ヿ]/.test(text)) return 'ja';
    if (/[一-鿿]/.test(text)) return 'zh';
    if (/[฀-๿]/.test(text)) return 'th';
    return 'latin';
  };

  const getFontOptions = (text: string) => {
    const script = detectScript(text);
    return FONT_OPTIONS[script] || FONT_OPTIONS.latin;
  };

  const sendFontChoice = (choice: 'script' | 'block' | 'elegant') => {
    const labelMap = { script: 'Script', block: 'Block', elegant: 'Elegant' };
    sendMessage(labelMap[choice]);
  };

  const renderFontPicker = (embroideryText: string) => {
    const sample = embroideryText || FONT_SAMPLE[selectedLanguage || 'en'];
    const options = getFontOptions(sample);
    const codes: ('script' | 'block' | 'elegant')[] = ['script', 'block', 'elegant'];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => sendFontChoice(codes[i])}
            style={{
              background: i === 0 ? '#b8922a' : '#374151',
              border: i === 0 ? '2px solid #facc15' : '2px solid #4b5563',
              borderRadius: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <span style={{ fontSize: '9px', color: i === 0 ? '#facc15' : '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {opt.label}{i === 0 ? ' — Default' : ''}
            </span>
            <span style={{
              fontFamily: opt.fontFamily,
              fontStyle: opt.fontStyle || 'normal',
              fontWeight: opt.fontWeight || 400,
              fontSize: '22px',
              color: '#fff',
              lineHeight: 1.3,
            }}>
              {sample}
            </span>
          </button>
        ))}
      </div>
    );
  };

  // 로고 패치 색 팔레트 — 스와치는 정확한 hex를 담고 있어 손님이 "모호하게" 고를 수 없다.
  // 이름은 영어(전송 메시지에 hex와 함께 실림) → AI가 고객 언어/중국어로 번역해 ORDER_COMPLETE에 기록.
  const LOGO_PALETTE: { name: string; hex: string }[] = [
    { name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#ffffff' },
    { name: 'Navy', hex: '#001f5b' }, { name: 'Red', hex: '#cc0000' },
    { name: 'Royal Blue', hex: '#4169e1' }, { name: 'Sky Blue', hex: '#87ceeb' },
    { name: 'Teal', hex: '#008080' }, { name: 'Green', hex: '#228b22' },
    { name: 'Mint', hex: '#98ff98' }, { name: 'Gold', hex: '#c9a84c' },
    { name: 'Yellow', hex: '#ffd21f' }, { name: 'Orange', hex: '#ff8c00' },
    { name: 'Coral', hex: '#ff7f50' }, { name: 'Pink', hex: '#ffb6c1' },
    { name: 'Purple', hex: '#800080' }, { name: 'Lavender', hex: '#e6e6fa' },
    { name: 'Maroon', hex: '#800000' }, { name: 'Burgundy', hex: '#800020' },
    { name: 'Brown', hex: '#8b4513' }, { name: 'Caramel', hex: '#c68642' },
    { name: 'Tan', hex: '#d2b48c' }, { name: 'Cream', hex: '#fffdd0' },
    { name: 'Silver', hex: '#c0c0c0' }, { name: 'Gray', hex: '#808080' },
  ];

  // 색 이름 12개 언어 — 모니터/기기 색재현 차이·색각이상(색맹)으로 인한 오선택을 줄이려
  // 스와치 밑에 색 이름을 함께 표기(표시는 고객 언어로, AI 전송 메시지는 영어 이름 유지).
  const COLOR_NAME_I18N: Record<Lang, Record<string, string>> = {
    en: { Black: 'Black', White: 'White', Navy: 'Navy', Red: 'Red', 'Royal Blue': 'Royal Blue', 'Sky Blue': 'Sky Blue', Teal: 'Teal', Green: 'Green', Mint: 'Mint', Gold: 'Gold', Yellow: 'Yellow', Orange: 'Orange', Coral: 'Coral', Pink: 'Pink', Purple: 'Purple', Lavender: 'Lavender', Maroon: 'Maroon', Burgundy: 'Burgundy', Brown: 'Brown', Caramel: 'Caramel', Tan: 'Tan', Cream: 'Cream', Silver: 'Silver', Gray: 'Gray' },
    ko: { Black: '검정', White: '흰색', Navy: '네이비', Red: '빨강', 'Royal Blue': '로열블루', 'Sky Blue': '하늘색', Teal: '청록', Green: '초록', Mint: '민트', Gold: '골드', Yellow: '노랑', Orange: '주황', Coral: '코랄', Pink: '분홍', Purple: '보라', Lavender: '라벤더', Maroon: '마룬', Burgundy: '버건디', Brown: '갈색', Caramel: '캐러멜', Tan: '탠', Cream: '크림', Silver: '실버', Gray: '회색' },
    ja: { Black: '黒', White: '白', Navy: 'ネイビー', Red: '赤', 'Royal Blue': 'ロイヤルブルー', 'Sky Blue': 'スカイブルー', Teal: 'ティール', Green: '緑', Mint: 'ミント', Gold: 'ゴールド', Yellow: '黄', Orange: 'オレンジ', Coral: 'コーラル', Pink: 'ピンク', Purple: '紫', Lavender: 'ラベンダー', Maroon: 'マルーン', Burgundy: 'バーガンディ', Brown: '茶', Caramel: 'キャラメル', Tan: 'タン', Cream: 'クリーム', Silver: 'シルバー', Gray: 'グレー' },
    zh: { Black: '黑色', White: '白色', Navy: '藏青', Red: '红色', 'Royal Blue': '宝蓝', 'Sky Blue': '天蓝', Teal: '蓝绿', Green: '绿色', Mint: '薄荷绿', Gold: '金色', Yellow: '黄色', Orange: '橙色', Coral: '珊瑚色', Pink: '粉色', Purple: '紫色', Lavender: '淡紫', Maroon: '栗色', Burgundy: '酒红', Brown: '棕色', Caramel: '焦糖色', Tan: '棕褐', Cream: '米色', Silver: '银色', Gray: '灰色' },
    es: { Black: 'Negro', White: 'Blanco', Navy: 'Azul marino', Red: 'Rojo', 'Royal Blue': 'Azul rey', 'Sky Blue': 'Celeste', Teal: 'Verde azulado', Green: 'Verde', Mint: 'Menta', Gold: 'Dorado', Yellow: 'Amarillo', Orange: 'Naranja', Coral: 'Coral', Pink: 'Rosa', Purple: 'Morado', Lavender: 'Lavanda', Maroon: 'Granate', Burgundy: 'Burdeos', Brown: 'Marrón', Caramel: 'Caramelo', Tan: 'Habano', Cream: 'Crema', Silver: 'Plata', Gray: 'Gris' },
    fr: { Black: 'Noir', White: 'Blanc', Navy: 'Bleu marine', Red: 'Rouge', 'Royal Blue': 'Bleu roi', 'Sky Blue': 'Bleu ciel', Teal: 'Sarcelle', Green: 'Vert', Mint: 'Menthe', Gold: 'Doré', Yellow: 'Jaune', Orange: 'Orange', Coral: 'Corail', Pink: 'Rose', Purple: 'Violet', Lavender: 'Lavande', Maroon: 'Marron', Burgundy: 'Bordeaux', Brown: 'Brun', Caramel: 'Caramel', Tan: 'Fauve', Cream: 'Crème', Silver: 'Argent', Gray: 'Gris' },
    de: { Black: 'Schwarz', White: 'Weiß', Navy: 'Marineblau', Red: 'Rot', 'Royal Blue': 'Königsblau', 'Sky Blue': 'Himmelblau', Teal: 'Blaugrün', Green: 'Grün', Mint: 'Mint', Gold: 'Gold', Yellow: 'Gelb', Orange: 'Orange', Coral: 'Koralle', Pink: 'Rosa', Purple: 'Lila', Lavender: 'Lavendel', Maroon: 'Kastanienbraun', Burgundy: 'Bordeaux', Brown: 'Braun', Caramel: 'Karamell', Tan: 'Hellbraun', Cream: 'Creme', Silver: 'Silber', Gray: 'Grau' },
    it: { Black: 'Nero', White: 'Bianco', Navy: 'Blu navy', Red: 'Rosso', 'Royal Blue': 'Blu reale', 'Sky Blue': 'Azzurro cielo', Teal: 'Verde acqua', Green: 'Verde', Mint: 'Menta', Gold: 'Oro', Yellow: 'Giallo', Orange: 'Arancione', Coral: 'Corallo', Pink: 'Rosa', Purple: 'Viola', Lavender: 'Lavanda', Maroon: 'Marrone rossiccio', Burgundy: 'Bordeaux', Brown: 'Marrone', Caramel: 'Caramello', Tan: 'Cuoio', Cream: 'Crema', Silver: 'Argento', Gray: 'Grigio' },
    nl: { Black: 'Zwart', White: 'Wit', Navy: 'Marineblauw', Red: 'Rood', 'Royal Blue': 'Koningsblauw', 'Sky Blue': 'Hemelsblauw', Teal: 'Blauwgroen', Green: 'Groen', Mint: 'Mint', Gold: 'Goud', Yellow: 'Geel', Orange: 'Oranje', Coral: 'Koraal', Pink: 'Roze', Purple: 'Paars', Lavender: 'Lavendel', Maroon: 'Kastanjebruin', Burgundy: 'Bordeauxrood', Brown: 'Bruin', Caramel: 'Karamel', Tan: 'Lichtbruin', Cream: 'Crème', Silver: 'Zilver', Gray: 'Grijs' },
    th: { Black: 'ดำ', White: 'ขาว', Navy: 'กรมท่า', Red: 'แดง', 'Royal Blue': 'น้ำเงินเข้ม', 'Sky Blue': 'ฟ้า', Teal: 'เขียวหัวเป็ด', Green: 'เขียว', Mint: 'มินต์', Gold: 'ทอง', Yellow: 'เหลือง', Orange: 'ส้ม', Coral: 'คอรัล', Pink: 'ชมพู', Purple: 'ม่วง', Lavender: 'ลาเวนเดอร์', Maroon: 'แดงเลือดหมู', Burgundy: 'เบอร์กันดี', Brown: 'น้ำตาล', Caramel: 'คาราเมล', Tan: 'น้ำตาลอ่อน', Cream: 'ครีม', Silver: 'เงิน', Gray: 'เทา' },
    tl: { Black: 'Itim', White: 'Puti', Navy: 'Navy', Red: 'Pula', 'Royal Blue': 'Royal Blue', 'Sky Blue': 'Bughaw', Teal: 'Teal', Green: 'Berde', Mint: 'Mint', Gold: 'Ginto', Yellow: 'Dilaw', Orange: 'Kahel', Coral: 'Coral', Pink: 'Rosas', Purple: 'Lila', Lavender: 'Lavender', Maroon: 'Maroon', Burgundy: 'Burgundy', Brown: 'Kayumanggi', Caramel: 'Caramel', Tan: 'Tan', Cream: 'Krema', Silver: 'Pilak', Gray: 'Abo' },
    pt: { Black: 'Preto', White: 'Branco', Navy: 'Azul-marinho', Red: 'Vermelho', 'Royal Blue': 'Azul-royal', 'Sky Blue': 'Azul-celeste', Teal: 'Verde-azulado', Green: 'Verde', Mint: 'Menta', Gold: 'Dourado', Yellow: 'Amarelo', Orange: 'Laranja', Coral: 'Coral', Pink: 'Rosa', Purple: 'Roxo', Lavender: 'Lavanda', Maroon: 'Grená', Burgundy: 'Bordô', Brown: 'Marrom', Caramel: 'Caramelo', Tan: 'Castanho-claro', Cream: 'Creme', Silver: 'Prata', Gray: 'Cinza' },
  };

  const colorLabel = (name: string) => COLOR_NAME_I18N[selectedLanguage || 'en']?.[name] ?? name;

  // 색 이름 라벨이 붙은 공통 스와치 버튼 — 로고/글자색/테두리 피커에서 공용.
  const colorSwatchButton = (c: { name: string; hex: string }, onClick: () => void) => (
    <button
      key={c.hex}
      onClick={onClick}
      title={c.name}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '58px' }}
    >
      <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: c.hex, border: '2px solid #4b5563', display: 'block' }} />
      <span style={{ fontSize: '9px', color: '#d1d5db', textAlign: 'center', lineHeight: 1.15, wordBreak: 'keep-all' }}>{colorLabel(c.name)}</span>
    </button>
  );

  // 로고색 스텝 안내 문구 — 12개 언어 (버튼 라벨은 색 스와치라 언어 무관, 안내 문구만 번역)
  const LOGO_PICKER_TEXT: Record<Lang, { bg: string; letters: string; back: string; backLetter: string; confirm: string; confirmYes: string }> = {
    en: { bg: 'Pick the background color', letters: 'Now pick the GN letter color', back: '← Change background', backLetter: '← Change letter color', confirm: 'Look good? Proceed with these colors?', confirmYes: 'Yes, looks good →' },
    ko: { bg: '배경색을 선택하세요', letters: 'GN 글자색을 선택하세요', back: '← 배경색 다시 선택', backLetter: '← 글자색 다시 선택', confirm: '이 색상으로 진행할까요?', confirmYes: '네, 이대로 진행할게요 →' },
    ja: { bg: '背景色を選んでください', letters: 'GN 文字色を選んでください', back: '← 背景色を選び直す', backLetter: '← 文字色を選び直す', confirm: 'この配色でよろしいですか？', confirmYes: 'はい、これで進めます →' },
    zh: { bg: '请选择底色', letters: '请选择 GN 字母颜色', back: '← 重新选择底色', backLetter: '← 重新选择字母颜色', confirm: '这个配色可以吗？', confirmYes: '可以，就这样吧 →' },
    es: { bg: 'Elige el color de fondo', letters: 'Ahora elige el color de las letras GN', back: '← Cambiar fondo', backLetter: '← Cambiar color de letras', confirm: '¿Te gusta? ¿Seguimos con estos colores?', confirmYes: 'Sí, se ve bien →' },
    fr: { bg: 'Choisissez la couleur de fond', letters: 'Choisissez la couleur des lettres GN', back: '← Changer le fond', backLetter: '← Changer la couleur des lettres', confirm: 'Ça vous plaît ? On continue avec ces couleurs ?', confirmYes: 'Oui, ça me va →' },
    de: { bg: 'Wähle die Hintergrundfarbe', letters: 'Wähle jetzt die GN-Buchstabenfarbe', back: '← Hintergrund ändern', backLetter: '← Buchstabenfarbe ändern', confirm: 'Gefällt es dir? Mit diesen Farben fortfahren?', confirmYes: 'Ja, passt so →' },
    it: { bg: 'Scegli il colore di sfondo', letters: 'Ora scegli il colore delle lettere GN', back: '← Cambia sfondo', backLetter: '← Cambia colore lettere', confirm: 'Ti piace? Procediamo con questi colori?', confirmYes: 'Sì, va bene →' },
    nl: { bg: 'Kies de achtergrondkleur', letters: 'Kies nu de GN-letterkleur', back: '← Achtergrond wijzigen', backLetter: '← Letterkleur wijzigen', confirm: 'Ziet het er goed uit? Doorgaan met deze kleuren?', confirmYes: 'Ja, ziet er goed uit →' },
    th: { bg: 'เลือกสีพื้นหลัง', letters: 'เลือกสีตัวอักษร GN', back: '← เปลี่ยนสีพื้นหลัง', backLetter: '← เปลี่ยนสีตัวอักษร', confirm: 'สีนี้โอเคไหม? ดำเนินการต่อด้วยสีนี้เลย?', confirmYes: 'ใช่ ใช้สีนี้เลย →' },
    tl: { bg: 'Pumili ng kulay ng background', letters: 'Pumili ng kulay ng letrang GN', back: '← Palitan ang background', backLetter: '← Palitan ang kulay ng letra', confirm: 'Maganda ba? Ituloy na ba ang mga kulay na ito?', confirmYes: 'Oo, ayos na →' },
    pt: { bg: 'Escolha a cor de fundo', letters: 'Agora escolha a cor das letras GN', back: '← Trocar o fundo', backLetter: '← Trocar cor das letras', confirm: 'Ficou bom? Seguir com essas cores?', confirmYes: 'Sim, ficou ótimo →' },
  };

  const sendLogoChoice = (bg: { name: string; hex: string }, letters: { name: string; hex: string }) => {
    setLogoBg(null);
    setLogoLetter(null);
    sendMessage(`GN logo patch — background: ${bg.name} (${bg.hex}), letters: ${letters.name} (${letters.hex})`);
  };

  const renderLogoPicker = () => {
    const lt = LOGO_PICKER_TEXT[selectedLanguage || 'en'];
    const swatch = colorSwatchButton;
    const previewLogoColor = logoLetter?.hex || '#9ca3af';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <GNLogo bgColor={logoBg?.hex || '#e5e7eb'} logoColor={previewLogoColor} width={80} height={49} />
          <span style={{ fontSize: '13px', color: '#facc15', fontWeight: 700 }}>
            {!logoBg ? lt.bg : !logoLetter ? lt.letters : lt.confirm}
          </span>
        </div>
        {!logoBg && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {LOGO_PALETTE.map(c => swatch(c, () => setLogoBg(c)))}
          </div>
        )}
        {logoBg && !logoLetter && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {LOGO_PALETTE.map(c => swatch(c, () => setLogoLetter(c)))}
            </div>
            <button
              onClick={() => setLogoBg(null)}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer', padding: 0 }}
            >{lt.back}</button>
          </>
        )}
        {logoBg && logoLetter && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => sendLogoChoice(logoBg, logoLetter)}
              style={{ background: '#facc15', color: '#111', fontWeight: 700, border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', alignSelf: 'flex-start' }}
            >{lt.confirmYes}</button>
            <button
              onClick={() => setLogoLetter(null)}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer', padding: 0 }}
            >{lt.backLetter}</button>
          </div>
        )}
      </div>
    );
  };

  // 이름 자수 글자(fill) 색 피커 — 스와치 팔레트. 텍스트만 타이핑, 색은 버튼으로.
  const NAME_COLOR_PICKER_TEXT: Record<Lang, string> = {
    en: 'Pick the letter color', ko: '글자 색을 선택하세요', ja: '文字の色を選んでください', zh: '请选择字体颜色',
    es: 'Elige el color de las letras', fr: 'Choisissez la couleur des lettres', de: 'Wähle die Buchstabenfarbe',
    it: 'Scegli il colore delle lettere', nl: 'Kies de letterkleur', th: 'เลือกสีตัวอักษร',
    tl: 'Pumili ng kulay ng letra', pt: 'Escolha a cor das letras',
  };

  const sendNameColorChoice = (c: { name: string; hex: string }) => sendMessage(`Name color: ${c.name} (${c.hex})`);

  const renderNameColorPicker = () => {
    const heading = NAME_COLOR_PICKER_TEXT[selectedLanguage || 'en'];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <span style={{ fontSize: '13px', color: '#facc15', fontWeight: 700 }}>{heading}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {LOGO_PALETTE.map(c => colorSwatchButton(c, () => sendNameColorChoice(c)))}
        </div>
      </div>
    );
  };

  // 이름 자수 테두리(아웃라인) 색 피커 — 로고와 동일하게 스와치 팔레트 + "단색(테두리 없음)" 버튼.
  const BORDER_PICKER_TEXT: Record<Lang, { heading: string; none: string }> = {
    en: { heading: 'Pick a border (outline) color, or keep it a single color', none: 'Single color (no border)' },
    ko: { heading: '테두리(아웃라인) 색을 고르거나, 단색으로 두세요', none: '단색 (테두리 없음)' },
    ja: { heading: '縁取り（アウトライン）色を選ぶか、単色のままにできます', none: '単色（縁取りなし）' },
    zh: { heading: '选择边框（描边）颜色，或保持单色', none: '单色（无边框）' },
    es: { heading: 'Elige un color de borde (contorno), o déjalo de un solo color', none: 'Un solo color (sin borde)' },
    fr: { heading: 'Choisissez une couleur de contour, ou gardez une seule couleur', none: 'Une seule couleur (sans contour)' },
    de: { heading: 'Wähle eine Randfarbe (Kontur) oder behalte eine einzige Farbe', none: 'Einfarbig (kein Rand)' },
    it: { heading: 'Scegli un colore del bordo (contorno), o tieni un solo colore', none: 'Un solo colore (senza bordo)' },
    nl: { heading: 'Kies een randkleur (omlijning), of houd het één kleur', none: 'Eén kleur (geen rand)' },
    th: { heading: 'เลือกสีขอบ (เส้นรอบ) หรือใช้สีเดียว', none: 'สีเดียว (ไม่มีขอบ)' },
    tl: { heading: 'Pumili ng kulay ng gilid (outline), o panatilihing isang kulay', none: 'Isang kulay (walang gilid)' },
    pt: { heading: 'Escolha uma cor de borda (contorno), ou mantenha uma cor só', none: 'Uma cor só (sem borda)' },
  };

  const sendBorderChoice = (c: { name: string; hex: string }) => sendMessage(`Name border: ${c.name} (${c.hex})`);
  const sendNoBorder = () => sendMessage('No border');

  const renderBorderPicker = () => {
    const bt = BORDER_PICKER_TEXT[selectedLanguage || 'en'];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <span style={{ fontSize: '13px', color: '#facc15', fontWeight: 700 }}>{bt.heading}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {LOGO_PALETTE.map(c => colorSwatchButton(c, () => sendBorderChoice(c)))}
        </div>
        <button
          onClick={sendNoBorder}
          style={{ alignSelf: 'flex-start', background: '#374151', color: '#d1d5db', fontWeight: 700, border: '2px solid #4b5563', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer' }}
        >{bt.none}</button>
      </div>
    );
  };

  // 손가락 위치 라벨 — 자수/국기 위치 피커 공용. 숫자(#1~#9)는 언어 무관, 라벨만 번역.
  // Web(#7)/Inner(#9)은 OrderSheet의 LABELS(webLabel/inner)와 동일 번역 사용.
  type FingerNum = '1' | '2' | '3' | '4' | '5' | '7' | '9';
  const FINGER_LABELS: Record<Lang, Record<FingerNum, string>> = {
    en: { '1': 'Thumb', '2': 'Index', '3': 'Middle', '4': 'Ring', '5': 'Pinky', '7': 'Web', '9': 'Inner' },
    ko: { '1': '엄지', '2': '검지', '3': '중지', '4': '약지', '5': '소지', '7': '웹', '9': '내측' },
    ja: { '1': '親指', '2': '人差し指', '3': '中指', '4': '薬指', '5': '小指', '7': 'ウェブ', '9': '内側' },
    zh: { '1': '拇指', '2': '食指', '3': '中指', '4': '无名指', '5': '小指', '7': '网兜', '9': '内侧' },
    es: { '1': 'Pulgar', '2': 'Índice', '3': 'Medio', '4': 'Anular', '5': 'Meñique', '7': 'Red', '9': 'Interior' },
    fr: { '1': 'Pouce', '2': 'Index', '3': 'Majeur', '4': 'Annulaire', '5': 'Auriculaire', '7': 'Toile', '9': 'Intérieur' },
    de: { '1': 'Daumen', '2': 'Zeigefinger', '3': 'Mittelfinger', '4': 'Ringfinger', '5': 'Kleiner Finger', '7': 'Netz', '9': 'Innen' },
    it: { '1': 'Pollice', '2': 'Indice', '3': 'Medio', '4': 'Anulare', '5': 'Mignolo', '7': 'Web', '9': 'Interno' },
    nl: { '1': 'Duim', '2': 'Wijsvinger', '3': 'Middelvinger', '4': 'Ringvinger', '5': 'Pink', '7': 'Web', '9': 'Binnen' },
    th: { '1': 'นิ้วโป้ง', '2': 'นิ้วชี้', '3': 'นิ้วกลาง', '4': 'นิ้วนาง', '5': 'นิ้วก้อย', '7': 'เว็บ', '9': 'ด้านใน' },
    tl: { '1': 'Hinlalaki', '2': 'Hintuturo', '3': 'Hinlalato', '4': 'Palasingsingan', '5': 'Hinliliit', '7': 'Web', '9': 'Loob' },
    pt: { '1': 'Polegar', '2': 'Indicador', '3': 'Médio', '4': 'Anelar', '5': 'Mínimo', '7': 'Rede', '9': 'Interno' },
  };

  const LOC_PICKER_TEXT: Record<Lang, { heading: string; webNameNote: string; webFlagNote: string }> = {
    en: { heading: 'Where would you like it?', webNameNote: 'The web fits only 2 characters — please choose another position.', webFlagNote: 'The web is too small for a flag — please choose another position.' },
    ko: { heading: '어느 위치에 자수할까요?', webNameNote: '웹에는 2자까지만 들어가요. 다른 위치를 선택해주세요.', webFlagNote: '웹은 국기를 넣기엔 너무 좁아요. 다른 위치를 선택해주세요.' },
    ja: { heading: 'どの位置に刺繍しますか？', webNameNote: 'ウェブには2文字までしか入りません。別の位置を選んでください。', webFlagNote: 'ウェブは国旗を入れるには狭すぎます。別の位置を選んでください。' },
    zh: { heading: '想绣在哪个位置？', webNameNote: '网兜只能容纳2个字符，请选择其他位置。', webFlagNote: '网兜太窄，放不下旗帜，请选择其他位置。' },
    es: { heading: '¿Dónde lo bordamos?', webNameNote: 'La red solo admite 2 caracteres — elige otra posición.', webFlagNote: 'La red es demasiado pequeña para una bandera — elige otra posición.' },
    fr: { heading: 'Où le broder ?', webNameNote: "La toile n'accepte que 2 caractères — choisissez un autre emplacement.", webFlagNote: 'La toile est trop petite pour un drapeau — choisissez un autre emplacement.' },
    de: { heading: 'Wo soll es hin?', webNameNote: 'Ins Netz passen nur 2 Zeichen — bitte wähle eine andere Position.', webFlagNote: 'Das Netz ist zu klein für eine Flagge — bitte wähle eine andere Position.' },
    it: { heading: 'Dove ricamarlo?', webNameNote: 'La web contiene solo 2 caratteri — scegli un\'altra posizione.', webFlagNote: 'La web è troppo piccola per una bandiera — scegli un\'altra posizione.' },
    nl: { heading: 'Waar wil je het?', webNameNote: 'In het web passen maar 2 tekens — kies een andere positie.', webFlagNote: 'Het web is te klein voor een vlag — kies een andere positie.' },
    th: { heading: 'ต้องการปักตรงไหน?', webNameNote: 'เว็บใส่ได้แค่ 2 ตัวอักษร กรุณาเลือกตำแหน่งอื่น', webFlagNote: 'เว็บเล็กเกินไปสำหรับธง กรุณาเลือกตำแหน่งอื่น' },
    tl: { heading: 'Saan mo gusto?', webNameNote: 'Dalawang karakter lang ang kasya sa web — pumili ng ibang posisyon.', webFlagNote: 'Masyadong maliit ang web para sa bandila — pumili ng ibang posisyon.' },
    pt: { heading: 'Onde bordar?', webNameNote: 'A rede comporta apenas 2 caracteres — escolha outra posição.', webFlagNote: 'A rede é pequena demais para uma bandeira — escolha outra posição.' },
  };

  const sendLocationChoice = (n: FingerNum, label: string) => {
    sendMessage(`${label} (#${n})`);
  };

  // 언어→기본 국기 1개. es(스페인어)는 중남미가 공유해 대표 국기를 정할 수 없어 null(타이핑만).
  // pt는 포르투갈 국기 파일이 없어 Brasil로. country는 /flags/<file>.png 파일명과 일치.
  const DEFAULT_FLAG: Record<Lang, { country: string; label: string } | null> = {
    en: { country: 'usa', label: 'USA' },
    ko: { country: 'korea', label: '한국' },
    ja: { country: 'japan', label: '日本' },
    zh: { country: 'china', label: '中国' },
    es: null,
    fr: { country: 'france', label: 'France' },
    de: { country: 'germany', label: 'Deutschland' },
    it: { country: 'italy', label: 'Italia' },
    nl: { country: 'netherlands', label: 'Nederland' },
    th: { country: 'thailand', label: 'ไทย' },
    tl: { country: 'philippines', label: 'Pilipinas' },
    pt: { country: 'brazil', label: 'Brasil' },
  };

  const FLAG_PICK_TEXT: Record<Lang, { none: string; typeHint: string }> = {
    en: { none: 'No flag', typeHint: 'Want a different flag? Type the country or US state name below.' },
    ko: { none: '국기 없음', typeHint: '다른 국기를 원하면 아래에 나라나 미국 주 이름을 입력하세요.' },
    ja: { none: '国旗なし', typeHint: '別の国旗をご希望なら、下に国名や米国の州名を入力してください。' },
    zh: { none: '不要旗帜', typeHint: '想要其他旗帜？请在下方输入国家或美国州名。' },
    es: { none: 'Sin bandera', typeHint: 'Escribe abajo el nombre del país o estado de EE. UU. para tu bandera.' },
    fr: { none: 'Pas de drapeau', typeHint: 'Un autre drapeau ? Tapez le nom du pays ou de l’État américain ci-dessous.' },
    de: { none: 'Keine Flagge', typeHint: 'Andere Flagge? Gib unten den Namen des Landes oder US-Bundesstaats ein.' },
    it: { none: 'Nessuna bandiera', typeHint: 'Un’altra bandiera? Scrivi qui sotto il nome del paese o stato USA.' },
    nl: { none: 'Geen vlag', typeHint: 'Andere vlag? Typ hieronder de naam van het land of de Amerikaanse staat.' },
    th: { none: 'ไม่เอาธง', typeHint: 'ต้องการธงอื่น? พิมพ์ชื่อประเทศหรือรัฐของสหรัฐฯ ด้านล่าง' },
    tl: { none: 'Walang bandila', typeHint: 'Ibang bandila? I-type sa ibaba ang bansa o estado ng US.' },
    pt: { none: 'Sem bandeira', typeHint: 'Outra bandeira? Digite abaixo o nome do país ou estado dos EUA.' },
  };

  const sendFlagChoice = (country: string) => sendMessage(`Flag: ${country}`);
  const sendNoFlag = () => sendMessage('No flag');

  const renderFlagPicker = () => {
    const lang = selectedLanguage || 'en';
    const def = DEFAULT_FLAG[lang];
    const ft = FLAG_PICK_TEXT[lang];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {def && (
            <button
              onClick={() => sendFlagChoice(def.country)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#374151', border: '2px solid #4b5563', borderRadius: '10px',
                padding: '8px 12px', cursor: 'pointer',
              }}
            >
              <img
                src={`/flags/${def.country}.png`}
                alt={def.label}
                style={{ width: '32px', height: '22px', objectFit: 'cover', borderRadius: '2px', border: '0.5px solid #6b7280' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{def.label}</span>
            </button>
          )}
          <button
            onClick={sendNoFlag}
            style={{
              background: '#1f2937', border: '2px solid #4b5563', borderRadius: '10px',
              padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#d1d5db',
            }}
          >{ft.none}</button>
        </div>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{ft.typeHint}</span>
      </div>
    );
  };

  // 진입 언어 → 기본 선택 국가(ISO2). es(스페인어)는 중남미 공유라 기본값 없음.
  const LANG_TO_ISO: Record<Lang, string> = {
    en: 'US', ko: 'KR', ja: 'JP', zh: 'CN', es: '', fr: 'FR',
    de: 'DE', it: 'IT', nl: 'NL', th: 'TH', tl: 'PH', pt: 'BR',
  };

  // 국가 드롭다운(영문명) — 검증 지원국 + 주요 배송국. 그 외는 'OTHER'(검증 스킵).
  const COUNTRY_OPTIONS: { code: string; name: string }[] = [
    { code: 'KR', name: 'South Korea' }, { code: 'US', name: 'United States' }, { code: 'JP', name: 'Japan' },
    { code: 'CN', name: 'China' }, { code: 'TW', name: 'Taiwan' }, { code: 'HK', name: 'Hong Kong' },
    { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' }, { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' }, { code: 'NL', name: 'Netherlands' }, { code: 'GB', name: 'United Kingdom' },
    { code: 'PT', name: 'Portugal' }, { code: 'PH', name: 'Philippines' }, { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' }, { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
    { code: 'CH', name: 'Switzerland' }, { code: 'AT', name: 'Austria' }, { code: 'BE', name: 'Belgium' },
    { code: 'SE', name: 'Sweden' }, { code: 'PL', name: 'Poland' }, { code: 'TH', name: 'Thailand' },
    { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' }, { code: 'VN', name: 'Vietnam' },
    { code: 'SG', name: 'Singapore' }, { code: 'MY', name: 'Malaysia' }, { code: 'NZ', name: 'New Zealand' },
    { code: 'DO', name: 'Dominican Republic' }, { code: 'VE', name: 'Venezuela' }, { code: 'CO', name: 'Colombia' },
    { code: 'PR', name: 'Puerto Rico' }, { code: 'CU', name: 'Cuba' }, { code: 'AR', name: 'Argentina' },
  ];
  const COUNTRY_NAME: Record<string, string> = Object.fromEntries(COUNTRY_OPTIONS.map(c => [c.code, c.name]));

  const CUSTOMER_FORM_TEXT: Record<Lang, {
    heading: string; name: string; phone: string; country: string; countryOther: string;
    street: string; city: string; state: string; postal: string; submit: string; checking: string;
    errRequired: string; errAddress: string; errCity: string; other: string;
  }> = {
    en: { heading: 'Shipping details', name: 'Full name', phone: 'Phone', country: 'Country', countryOther: 'Enter your country', street: 'Street address', city: 'City', state: 'State / Province (optional)', postal: 'Postal / ZIP code', submit: 'Continue →', checking: 'Checking address...', errRequired: 'Please fill in all required fields.', errAddress: "The postal code and address don't match. Please double-check.", errCity: 'The city for this postal code is "{X}". Please check the city.', other: 'Other' },
    ko: { heading: '배송 정보', name: '이름', phone: '전화번호', country: '국가', countryOther: '국가를 입력하세요', street: '상세 주소', city: '도시', state: '시/도 (선택)', postal: '우편번호', submit: '다음 →', checking: '주소 확인 중...', errRequired: '필수 항목을 모두 입력해주세요.', errAddress: '우편번호와 주소가 맞지 않습니다. 다시 확인해주세요.', errCity: '이 우편번호의 도시는 "{X}"입니다. 도시명을 확인해주세요.', other: '기타' },
    ja: { heading: '配送情報', name: 'お名前', phone: '電話番号', country: '国', countryOther: '国名を入力', street: '住所', city: '市区町村', state: '都道府県(任意)', postal: '郵便番号', submit: '次へ →', checking: '住所を確認中...', errRequired: '必須項目をすべて入力してください。', errAddress: '郵便番号と住所が一致しません。ご確認ください。', errCity: 'この郵便番号の市区町村は「{X}」です。ご確認ください。', other: 'その他' },
    zh: { heading: '配送信息', name: '姓名', phone: '电话', country: '国家', countryOther: '请输入国家', street: '详细地址', city: '城市', state: '省/州(选填)', postal: '邮政编码', submit: '继续 →', checking: '正在核对地址...', errRequired: '请填写所有必填项。', errAddress: '邮政编码与地址不匹配，请再次确认。', errCity: '该邮政编码对应的城市是"{X}"，请检查城市名。', other: '其他' },
    es: { heading: 'Datos de envío', name: 'Nombre completo', phone: 'Teléfono', country: 'País', countryOther: 'Escribe tu país', street: 'Dirección', city: 'Ciudad', state: 'Estado / Provincia (opcional)', postal: 'Código postal', submit: 'Continuar →', checking: 'Verificando dirección...', errRequired: 'Completa todos los campos obligatorios.', errAddress: 'El código postal y la dirección no coinciden. Verifícalos.', errCity: 'La ciudad de este código postal es "{X}". Revisa la ciudad.', other: 'Otro' },
    fr: { heading: 'Livraison', name: 'Nom complet', phone: 'Téléphone', country: 'Pays', countryOther: 'Saisissez votre pays', street: 'Adresse', city: 'Ville', state: 'Région (facultatif)', postal: 'Code postal', submit: 'Continuer →', checking: "Vérification de l'adresse...", errRequired: 'Veuillez remplir tous les champs obligatoires.', errAddress: 'Le code postal et l’adresse ne correspondent pas. Vérifiez.', errCity: 'La ville de ce code postal est « {X} ». Vérifiez la ville.', other: 'Autre' },
    de: { heading: 'Lieferdaten', name: 'Vollständiger Name', phone: 'Telefon', country: 'Land', countryOther: 'Land eingeben', street: 'Straße und Nr.', city: 'Stadt', state: 'Bundesland (optional)', postal: 'Postleitzahl', submit: 'Weiter →', checking: 'Adresse wird geprüft...', errRequired: 'Bitte fülle alle Pflichtfelder aus.', errAddress: 'PLZ und Adresse passen nicht zusammen. Bitte prüfen.', errCity: 'Die Stadt zu dieser PLZ ist „{X}“. Bitte prüfe die Stadt.', other: 'Andere' },
    it: { heading: 'Dati di spedizione', name: 'Nome completo', phone: 'Telefono', country: 'Paese', countryOther: 'Inserisci il paese', street: 'Indirizzo', city: 'Città', state: 'Provincia (facoltativo)', postal: 'CAP', submit: 'Continua →', checking: "Verifica dell'indirizzo...", errRequired: 'Compila tutti i campi obbligatori.', errAddress: 'CAP e indirizzo non corrispondono. Controlla.', errCity: 'La città di questo CAP è "{X}". Controlla la città.', other: 'Altro' },
    nl: { heading: 'Verzendgegevens', name: 'Volledige naam', phone: 'Telefoon', country: 'Land', countryOther: 'Voer je land in', street: 'Adres', city: 'Plaats', state: 'Provincie (optioneel)', postal: 'Postcode', submit: 'Doorgaan →', checking: 'Adres controleren...', errRequired: 'Vul alle verplichte velden in.', errAddress: 'Postcode en adres komen niet overeen. Controleer het.', errCity: 'De plaats bij deze postcode is "{X}". Controleer de plaats.', other: 'Anders' },
    th: { heading: 'ข้อมูลจัดส่ง', name: 'ชื่อ-นามสกุล', phone: 'โทรศัพท์', country: 'ประเทศ', countryOther: 'กรอกประเทศ', street: 'ที่อยู่', city: 'เมือง', state: 'รัฐ/จังหวัด (ไม่บังคับ)', postal: 'รหัสไปรษณีย์', submit: 'ต่อไป →', checking: 'กำลังตรวจสอบที่อยู่...', errRequired: 'กรุณากรอกข้อมูลที่จำเป็นทั้งหมด', errAddress: 'รหัสไปรษณีย์กับที่อยู่ไม่ตรงกัน กรุณาตรวจสอบ', errCity: 'เมืองของรหัสไปรษณีย์นี้คือ "{X}" กรุณาตรวจสอบ', other: 'อื่นๆ' },
    tl: { heading: 'Detalye ng padala', name: 'Buong pangalan', phone: 'Telepono', country: 'Bansa', countryOther: 'Ilagay ang bansa', street: 'Address', city: 'Lungsod', state: 'Estado / Probinsya (opsyonal)', postal: 'Postal / ZIP code', submit: 'Magpatuloy →', checking: 'Sinusuri ang address...', errRequired: 'Punan ang lahat ng kinakailangang field.', errAddress: 'Hindi tugma ang postal code at address. Pakisuri.', errCity: 'Ang lungsod para sa postal code na ito ay "{X}". Pakisuri.', other: 'Iba pa' },
    pt: { heading: 'Dados de envio', name: 'Nome completo', phone: 'Telefone', country: 'País', countryOther: 'Digite seu país', street: 'Endereço', city: 'Cidade', state: 'Estado (opcional)', postal: 'CEP / Código postal', submit: 'Continuar →', checking: 'Verificando endereço...', errRequired: 'Preencha todos os campos obrigatórios.', errAddress: 'O código postal e o endereço não coincidem. Verifique.', errCity: 'A cidade deste código postal é "{X}". Verifique a cidade.', other: 'Outro' },
  };

  const submitCustomerForm = async () => {
    const lang = selectedLanguage || 'en';
    const ct = CUSTOMER_FORM_TEXT[lang];
    setCfError(null);
    const country = cf.country || LANG_TO_ISO[lang] || '';
    const missing = !cf.name.trim() || !cf.phone.trim() || !cf.street.trim() || !cf.city.trim() || !cf.postal.trim()
      || !country || (country === 'OTHER' && !cf.countryOther.trim());
    if (missing) { setCfError(ct.errRequired); return; }

    const countryCode = country === 'OTHER' ? '' : country;
    const countryName = country === 'OTHER' ? cf.countryOther.trim() : (COUNTRY_NAME[country] || country);

    setCfValidating(true);
    try {
      const res = await fetch('/api/validate-address', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode, postal: cf.postal, city: cf.city, street: cf.street }),
      });
      const v = await res.json();
      if (v && v.ok === false) {
        if (v.reason === 'city_mismatch' && Array.isArray(v.expected) && v.expected.length) {
          setCfError(ct.errCity.replace('{X}', v.expected.join(', ')));
        } else {
          setCfError(ct.errAddress);
        }
        setCfValidating(false);
        return;
      }
    } catch {
      // 검증 API 자체가 실패하면 주문을 막지 않는다(최종 주문서 확인이 백스톱)
    }
    setCfValidating(false);
    const addr = [cf.street.trim(), cf.city.trim(), cf.state.trim(), cf.postal.trim()].filter(Boolean).join(', ');
    const msg = `[CUSTOMER_INFO]\nName: ${cf.name.trim()}\nPhone: ${cf.phone.trim()}\nCountry: ${countryName} (${countryCode || 'other'})\nAddress: ${addr}`;
    sendMessage(msg);
  };

  const renderCustomerForm = () => {
    const lang = selectedLanguage || 'en';
    const ct = CUSTOMER_FORM_TEXT[lang];
    const countryVal = cf.country || LANG_TO_ISO[lang] || '';
    const inputStyle: React.CSSProperties = {
      width: '100%', background: '#111827', border: '1px solid #4b5563', borderRadius: '8px',
      padding: '10px 12px', color: '#fff', fontSize: '14px',
    };
    const field = (label: string, node: React.ReactNode) => (
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{label}</span>
        {node}
      </label>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', maxWidth: '420px' }}>
        <span style={{ fontSize: '14px', color: '#facc15', fontWeight: 700 }}>{ct.heading}</span>
        {field(ct.name, <input style={inputStyle} value={cf.name} onChange={e => setCf({ ...cf, name: e.target.value })} />)}
        {field(ct.phone, <input style={inputStyle} value={cf.phone} onChange={e => setCf({ ...cf, phone: e.target.value })} inputMode="tel" />)}
        {field(ct.country, (
          <select style={inputStyle} value={countryVal} onChange={e => setCf({ ...cf, country: e.target.value })}>
            <option value="" disabled>—</option>
            {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            <option value="OTHER">{ct.other}</option>
          </select>
        ))}
        {countryVal === 'OTHER' && field(ct.countryOther, <input style={inputStyle} value={cf.countryOther} onChange={e => setCf({ ...cf, countryOther: e.target.value })} />)}
        {field(ct.street, <input style={inputStyle} value={cf.street} onChange={e => setCf({ ...cf, street: e.target.value })} />)}
        {field(ct.city, <input style={inputStyle} value={cf.city} onChange={e => setCf({ ...cf, city: e.target.value })} />)}
        {field(ct.state, <input style={inputStyle} value={cf.state} onChange={e => setCf({ ...cf, state: e.target.value })} />)}
        {field(ct.postal, <input style={inputStyle} value={cf.postal} onChange={e => setCf({ ...cf, postal: e.target.value })} />)}
        {cfError && <span style={{ fontSize: '13px', color: '#f87171' }}>{cfError}</span>}
        <button
          onClick={submitCustomerForm}
          disabled={cfValidating}
          style={{ background: '#facc15', color: '#111', fontWeight: 700, border: 'none', borderRadius: '10px', padding: '12px', cursor: cfValidating ? 'not-allowed' : 'pointer', opacity: cfValidating ? 0.6 : 1, marginTop: '4px' }}
        >{cfValidating ? ct.checking : ct.submit}</button>
      </div>
    );
  };

  // 자수/국기 위치 피커 — context('name'|'flag')와 텍스트 길이로 웹(#7) 가용성을 결정.
  // 웹은 투수 전용 + (이름) 2자 초과 시 비활성 + (국기) 항상 비활성.
  const renderLocationPicker = (context: 'name' | 'flag', text: string) => {
    const lang = selectedLanguage || 'en';
    const labels = FINGER_LABELS[lang];
    const lt = LOC_PICKER_TEXT[lang];
    const isPitcher = specAnswersRef.current.position === 'pitcher';
    const textLen = Array.from((text || '').trim()).length;
    const nums: FingerNum[] = isPitcher ? ['1', '2', '3', '4', '5', '7', '9'] : ['1', '2', '3', '4', '5', '9'];
    const webBlocked = context === 'flag' || (context === 'name' && textLen > 2);
    const isDisabled = (n: FingerNum) => n === '7' && webBlocked;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
        <span style={{ fontSize: '13px', color: '#facc15', fontWeight: 700 }}>{lt.heading}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {nums.map(n => {
            const disabled = isDisabled(n);
            return (
              <button
                key={n}
                onClick={() => { if (!disabled) sendLocationChoice(n, labels[n]); }}
                disabled={disabled}
                style={{
                  background: disabled ? '#1f2937' : '#374151',
                  border: disabled ? '2px solid #374151' : '2px solid #4b5563',
                  borderRadius: '10px', padding: '8px 12px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '56px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{labels[n]}</span>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>#{n}</span>
              </button>
            );
          })}
        </div>
        {nums.includes('7') && webBlocked && (
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{context === 'flag' ? lt.webFlagNote : lt.webNameNote}</span>
        )}
      </div>
    );
  };

  // 변경 여부 질문 — "그대로 진행"(결정론적) vs "바꿀 부분 있어요"(자유입력→AI 해석)
  // 변경 요청 루프 문구 — keep: 첫 질문의 "그대로 진행", keepMore: 이후 "더 없음", change: "변경할게요"
  const CHANGES_ASK_TEXT: Record<Lang, { keep: string; keepMore: string; change: string }> = {
    en: { keep: 'Proceed as-is', keepMore: 'No, that\'s all', change: 'I have changes' },
    ko: { keep: '그대로 진행', keepMore: '더 없어요', change: '변경할게요' },
    ja: { keep: 'このまま進める', keepMore: '他にはありません', change: '変更したい' },
    zh: { keep: '就这样进行', keepMore: '没有了', change: '我想修改' },
    es: { keep: 'Continuar así', keepMore: 'No, es todo', change: 'Quiero cambios' },
    fr: { keep: 'Continuer ainsi', keepMore: 'Non, c\'est tout', change: 'Je veux modifier' },
    de: { keep: 'So fortfahren', keepMore: 'Nein, das war\'s', change: 'Ich möchte ändern' },
    it: { keep: 'Procedi così', keepMore: 'No, è tutto', change: 'Voglio modifiche' },
    nl: { keep: 'Zo doorgaan', keepMore: 'Nee, dat is alles', change: 'Ik wil wijzigen' },
    th: { keep: 'ดำเนินการตามนี้', keepMore: 'ไม่มีแล้ว', change: 'ต้องการแก้ไข' },
    tl: { keep: 'Ituloy nang ganito', keepMore: 'Wala na', change: 'May babaguhin' },
    pt: { keep: 'Continuar assim', keepMore: 'Não, é tudo', change: 'Quero mudar' },
  };

  // 변경 재확인 문구 (맞음/다시 입력) 및 "무엇을 변경?" 안내
  const CHANGE_CONFIRM_TEXT: Record<Lang, { yes: string; reenter: string; prompt: string }> = {
    en: { yes: 'Correct', reenter: 'Re-enter', prompt: 'What would you like to change? Please type it below.' },
    ko: { yes: '맞아요', reenter: '다시 입력', prompt: '어떤 부분을 변경하고 싶으세요? 아래에 입력해주세요.' },
    ja: { yes: '合っています', reenter: '入力し直す', prompt: 'どこを変更したいですか？下に入力してください。' },
    zh: { yes: '正确', reenter: '重新输入', prompt: '您想修改哪里？请在下方输入。' },
    es: { yes: 'Correcto', reenter: 'Volver a escribir', prompt: '¿Qué te gustaría cambiar? Escríbelo abajo.' },
    fr: { yes: 'C\'est correct', reenter: 'Ressaisir', prompt: 'Que souhaitez-vous changer ? Écrivez-le ci-dessous.' },
    de: { yes: 'Richtig', reenter: 'Neu eingeben', prompt: 'Was möchtest du ändern? Bitte unten eingeben.' },
    it: { yes: 'Corretto', reenter: 'Reinserisci', prompt: 'Cosa vuoi cambiare? Scrivilo qui sotto.' },
    nl: { yes: 'Klopt', reenter: 'Opnieuw invoeren', prompt: 'Wat wil je veranderen? Typ het hieronder.' },
    th: { yes: 'ถูกต้อง', reenter: 'พิมพ์ใหม่', prompt: 'คุณต้องการเปลี่ยนอะไร? กรุณาพิมพ์ด้านล่าง' },
    tl: { yes: 'Tama', reenter: 'I-type ulit', prompt: 'Ano ang gusto mong baguhin? I-type sa ibaba.' },
    pt: { yes: 'Correto', reenter: 'Digitar de novo', prompt: 'O que você quer mudar? Digite abaixo.' },
  };

  // "변경할게요" → 코드가 "무엇을 변경?" 안내 후 입력 유도(AI 호출 없음)
  const startChangeInput = () => {
    setChangeInputMode(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const sendNoChanges = () => { setChangeInputMode(false); sendMessage('No changes'); };

  // 변경 확정(맞음) — 코드가 3회 한도를 세어 AI에게 더 물을지/넘어갈지 토큰으로 지시(표시 시 숨김)
  const confirmChangeYes = () => {
    const next = changeCount + 1;
    setChangeCount(next);
    sendMessage(next >= 3 ? 'Correct [[CHANGE_DONE]]' : 'Correct [[CHANGE_MORE]]');
  };

  const renderChangesAsk = () => {
    const t = CHANGES_ASK_TEXT[selectedLanguage || 'en'];
    return (
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={sendNoChanges}
          style={{ background: '#facc15', color: '#111', fontWeight: 700, border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer' }}
        >{changeCount > 0 ? t.keepMore : t.keep}</button>
        <button
          onClick={startChangeInput}
          style={{ background: '#2563eb', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer' }}
        >{t.change}</button>
      </div>
    );
  };

  const renderChangeConfirm = () => {
    const t = CHANGE_CONFIRM_TEXT[selectedLanguage || 'en'];
    return (
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={confirmChangeYes}
          style={{ background: '#facc15', color: '#111', fontWeight: 700, border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer' }}
        >{t.yes}</button>
        <button
          onClick={startChangeInput}
          style={{ background: '#374151', color: '#d1d5db', fontWeight: 700, border: '2px solid #4b5563', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer' }}
        >{t.reenter}</button>
      </div>
    );
  };

  // 사진 분석 대기 안내 — 업로드 사진의 첫 분석 응답을 기다리는 동안 일반 "입력 중..."보다
  // 구체적인 문구를 보여준다(분석에 시간이 좀 걸려 손님이 멈춘 줄 오해하지 않도록).
  const PHOTO_WAIT_TEXT: Record<Lang, string> = {
    en: 'Analyzing your photo, please wait a moment...', ko: '사진을 분석하고 있어요, 잠시만 기다려주세요...',
    ja: '写真を分析しています。少々お待ちください...', zh: '正在分析您的照片，请稍候...',
    es: 'Analizando tu foto, un momento por favor...', fr: 'Analyse de votre photo en cours, un instant...',
    de: 'Dein Foto wird analysiert, einen Moment bitte...', it: 'Sto analizzando la tua foto, un attimo...',
    nl: 'Je foto wordt geanalyseerd, een moment geduld...', th: 'กำลังวิเคราะห์รูปภาพของคุณ กรุณารอสักครู่...',
    tl: 'Sinusuri ang iyong larawan, sandali lang...', pt: 'Analisando sua foto, um momento...',
  };

  // 사진 분석(경고+색상 코멘트) 직후 곧바로 스펙 위저드로 넘어가지 않고 보여주는 확인 게이트.
  const START_GATE_TEXT: Record<Lang, { heading: string; yes: string; hint: string }> = {
    en: { heading: 'Great, thanks! Shall we start building your glove?', yes: 'Yes, let\'s start →', hint: 'Have a question first? Just type it below.' },
    ko: { heading: '좋아요! 그럼 주문을 시작할까요?', yes: '네, 시작할게요 →', hint: '먼저 궁금한 점이 있으면 아래에 입력해주세요.' },
    ja: { heading: 'ありがとうございます！それでは注文を始めましょうか？', yes: 'はい、始めます →', hint: '先に質問がある場合は下に入力してください。' },
    zh: { heading: '好的，谢谢！那我们开始定制手套吧？', yes: '好的，开始吧 →', hint: '有问题的话，请在下方输入。' },
    es: { heading: '¡Genial, gracias! ¿Empezamos a crear tu guante?', yes: 'Sí, empecemos →', hint: '¿Tienes alguna pregunta? Escríbela abajo.' },
    fr: { heading: 'Merci ! On commence la création de votre gant ?', yes: 'Oui, on commence →', hint: 'Une question avant ? Tapez-la ci-dessous.' },
    de: { heading: 'Danke! Sollen wir mit deinem Handschuh beginnen?', yes: 'Ja, los geht\'s →', hint: 'Erst eine Frage? Einfach unten eingeben.' },
    it: { heading: 'Grazie! Iniziamo a creare il tuo guanto?', yes: 'Sì, iniziamo →', hint: 'Hai una domanda prima? Scrivila qui sotto.' },
    nl: { heading: 'Bedankt! Zullen we je handschoen gaan samenstellen?', yes: 'Ja, laten we beginnen →', hint: 'Eerst een vraag? Typ hem hieronder.' },
    th: { heading: 'ขอบคุณค่ะ/ครับ! เริ่มสร้างถุงมือของคุณเลยไหม?', yes: 'ใช่ เริ่มเลย →', hint: 'มีคำถามก่อนไหม? พิมพ์ด้านล่างได้เลย' },
    tl: { heading: 'Salamat! Simulan na ba natin ang glove mo?', yes: 'Oo, simulan na →', hint: 'May tanong ka muna? I-type na lang sa ibaba.' },
    pt: { heading: 'Obrigado! Vamos começar a criar sua luva?', yes: 'Sim, vamos começar →', hint: 'Tem alguma pergunta antes? Digite abaixo.' },
  };

  const confirmStartWizard = () => {
    setAwaitingStartConfirm(false);
    preWizardGateRef.current = false;
    setSpecStep('sport');
  };

  const renderStartGate = () => {
    const sg = START_GATE_TEXT[selectedLanguage || 'en'];
    return (
      <div className="flex justify-start">
        <div className="max-w-xs lg:max-w-md p-3 rounded-2xl bg-gray-800">
          <div className="whitespace-pre-wrap">{sg.heading}</div>
          <button
            onClick={confirmStartWizard}
            style={{ background: '#facc15', color: '#111', fontWeight: 700, border: 'none', borderRadius: '10px', padding: '10px 16px', cursor: 'pointer', marginTop: '10px' }}
          >{sg.yes}</button>
          <div className="text-gray-400 text-xs mt-2">{sg.hint}</div>
        </div>
      </div>
    );
  };

  // 사이즈 가이드 — route.ts의 "Size guide by position"와 동기화 유지
  // extra: 정규 step 범위를 벗어난 추가 사이즈(범위 끝에 별도로 붙음)
  const SIZE_GUIDE: { key: string; label: string; min: number; max: number; step: number; extra?: number[] }[] = [
    { key: 'pitcher', label: 'Pitcher', min: 11.5, max: 12.25, step: 0.25 },
    { key: 'infield', label: 'Infield', min: 11.25, max: 12.0, step: 0.25 },
    // 14"는 공인 규격을 벗어나 공식 경기에서 사용 불가 — 특수 요청 대응용으로만 제공
    { key: 'outfield', label: 'Outfield', min: 12.5, max: 13.0, step: 0.25, extra: [14.0] },
    { key: 'first_base', label: 'First Base', min: 12.0, max: 13.0, step: 0.25 },
    { key: 'catcher', label: 'Catcher', min: 32, max: 34, step: 0.5 },
  ];

  type SpecQuestionSet = Record<Exclude<SpecField, 'size' | 'palm_construction'>, { question: string; options: { label: string; value: string }[] }>;

  // 스펙 위저드 질문/버튼 라벨 — 12개 언어 전체 번역 (value는 언어와 무관하게 고정된 내부 코드 유지)
  const SPEC_QUESTIONS_BY_LANG: Record<Lang, SpecQuestionSet> = {
    en: {
      sport: { question: 'Would you like a baseball or softball glove?', options: [{ label: '⚾ Baseball', value: 'baseball' }, { label: '🥎 Softball', value: 'softball' }] },
      player_type: { question: 'Is this glove for an adult or youth player?', options: [{ label: 'Adult', value: 'adult' }, { label: 'Youth', value: 'youth' }] },
      hand: { question: 'Which hand do you throw with?', options: [{ label: 'Right-Handed Throw (RHT)', value: 'RHT' }, { label: 'Left-Handed Throw (LHT)', value: 'LHT' }] },
      position: { question: 'What position will this glove be used for?', options: [{ label: 'Pitcher', value: 'pitcher' }, { label: 'Infield', value: 'infield' }, { label: 'Outfield', value: 'outfield' }, { label: 'First Base', value: 'first_base' }, { label: 'Catcher', value: 'catcher' }] },
    },
    ko: {
      sport: { question: '야구 글러브인가요, 소프트볼 글러브인가요?', options: [{ label: '⚾ 야구', value: 'baseball' }, { label: '🥎 소프트볼', value: 'softball' }] },
      player_type: { question: '성인용인가요, 유소년용인가요?', options: [{ label: '성인', value: 'adult' }, { label: '유소년', value: 'youth' }] },
      hand: { question: '어느 손으로 던지시나요?', options: [{ label: '오른손 (우투)', value: 'RHT' }, { label: '왼손 (좌투)', value: 'LHT' }] },
      position: { question: '어느 포지션에서 사용하실 글러브인가요?', options: [{ label: '투수', value: 'pitcher' }, { label: '내야수', value: 'infield' }, { label: '외야수', value: 'outfield' }, { label: '1루수', value: 'first_base' }, { label: '포수', value: 'catcher' }] },
    },
    ja: {
      sport: { question: '野球用ですか、ソフトボール用ですか？', options: [{ label: '⚾ 野球', value: 'baseball' }, { label: '🥎 ソフトボール', value: 'softball' }] },
      player_type: { question: '大人用ですか、子供用ですか？', options: [{ label: '大人', value: 'adult' }, { label: '子供', value: 'youth' }] },
      hand: { question: 'どちらの手で投げますか？', options: [{ label: '右投げ (RHT)', value: 'RHT' }, { label: '左投げ (LHT)', value: 'LHT' }] },
      position: { question: 'どのポジションで使用しますか？', options: [{ label: 'ピッチャー', value: 'pitcher' }, { label: '内野手', value: 'infield' }, { label: '外野手', value: 'outfield' }, { label: 'ファースト', value: 'first_base' }, { label: 'キャッチャー', value: 'catcher' }] },
    },
    zh: {
      sport: { question: '您想要棒球手套还是垒球手套？', options: [{ label: '⚾ 棒球', value: 'baseball' }, { label: '🥎 垒球', value: 'softball' }] },
      player_type: { question: '这是成人用还是青少年用的手套？', options: [{ label: '成人', value: 'adult' }, { label: '青少年', value: 'youth' }] },
      hand: { question: '您用哪只手投球？', options: [{ label: '右投 (RHT)', value: 'RHT' }, { label: '左投 (LHT)', value: 'LHT' }] },
      position: { question: '这副手套用于什么位置？', options: [{ label: '投手', value: 'pitcher' }, { label: '内野手', value: 'infield' }, { label: '外野手', value: 'outfield' }, { label: '一垒手', value: 'first_base' }, { label: '捕手', value: 'catcher' }] },
    },
    es: {
      sport: { question: '¿Quieres un guante de béisbol o de softbol?', options: [{ label: '⚾ Béisbol', value: 'baseball' }, { label: '🥎 Softbol', value: 'softball' }] },
      player_type: { question: '¿Es para un jugador adulto o juvenil?', options: [{ label: 'Adulto', value: 'adult' }, { label: 'Juvenil', value: 'youth' }] },
      hand: { question: '¿Con qué mano lanzas?', options: [{ label: 'Diestro (RHT)', value: 'RHT' }, { label: 'Zurdo (LHT)', value: 'LHT' }] },
      position: { question: '¿Para qué posición será este guante?', options: [{ label: 'Pitcher', value: 'pitcher' }, { label: 'Infield', value: 'infield' }, { label: 'Outfield', value: 'outfield' }, { label: 'Primera base', value: 'first_base' }, { label: 'Catcher', value: 'catcher' }] },
    },
    fr: {
      sport: { question: 'Voulez-vous un gant de baseball ou de softball ?', options: [{ label: '⚾ Baseball', value: 'baseball' }, { label: '🥎 Softball', value: 'softball' }] },
      player_type: { question: 'Ce gant est-il pour un joueur adulte ou junior ?', options: [{ label: 'Adulte', value: 'adult' }, { label: 'Junior', value: 'youth' }] },
      hand: { question: 'Avec quelle main lancez-vous ?', options: [{ label: 'Droitier (RHT)', value: 'RHT' }, { label: 'Gaucher (LHT)', value: 'LHT' }] },
      position: { question: 'Pour quel poste ce gant sera-t-il utilisé ?', options: [{ label: 'Lanceur', value: 'pitcher' }, { label: 'Infield', value: 'infield' }, { label: 'Outfield', value: 'outfield' }, { label: 'Premier but', value: 'first_base' }, { label: 'Receveur', value: 'catcher' }] },
    },
    de: {
      sport: { question: 'Möchtest du einen Baseball- oder Softball-Handschuh?', options: [{ label: '⚾ Baseball', value: 'baseball' }, { label: '🥎 Softball', value: 'softball' }] },
      player_type: { question: 'Ist der Handschuh für einen Erwachsenen oder ein Kind?', options: [{ label: 'Erwachsener', value: 'adult' }, { label: 'Jugend', value: 'youth' }] },
      hand: { question: 'Mit welcher Hand wirfst du?', options: [{ label: 'Rechtshänder (RHT)', value: 'RHT' }, { label: 'Linkshänder (LHT)', value: 'LHT' }] },
      position: { question: 'Für welche Position wird dieser Handschuh verwendet?', options: [{ label: 'Pitcher', value: 'pitcher' }, { label: 'Infield', value: 'infield' }, { label: 'Outfield', value: 'outfield' }, { label: 'Erste Base', value: 'first_base' }, { label: 'Catcher', value: 'catcher' }] },
    },
    it: {
      sport: { question: 'Vuoi un guanto da baseball o da softball?', options: [{ label: '⚾ Baseball', value: 'baseball' }, { label: '🥎 Softball', value: 'softball' }] },
      player_type: { question: 'Questo guanto è per un adulto o un giovane giocatore?', options: [{ label: 'Adulto', value: 'adult' }, { label: 'Giovanile', value: 'youth' }] },
      hand: { question: 'Con quale mano lanci?', options: [{ label: 'Destro (RHT)', value: 'RHT' }, { label: 'Mancino (LHT)', value: 'LHT' }] },
      position: { question: 'Per quale posizione sarà usato questo guanto?', options: [{ label: 'Lanciatore', value: 'pitcher' }, { label: 'Infield', value: 'infield' }, { label: 'Outfield', value: 'outfield' }, { label: 'Prima base', value: 'first_base' }, { label: 'Ricevitore', value: 'catcher' }] },
    },
    nl: {
      sport: { question: 'Wil je een honkbal- of softbalhandschoen?', options: [{ label: '⚾ Honkbal', value: 'baseball' }, { label: '🥎 Softbal', value: 'softball' }] },
      player_type: { question: 'Is deze handschoen voor een volwassene of jeugdspeler?', options: [{ label: 'Volwassene', value: 'adult' }, { label: 'Jeugd', value: 'youth' }] },
      hand: { question: 'Met welke hand gooi je?', options: [{ label: 'Rechtshandig (RHT)', value: 'RHT' }, { label: 'Linkshandig (LHT)', value: 'LHT' }] },
      position: { question: 'Voor welke positie wordt deze handschoen gebruikt?', options: [{ label: 'Pitcher', value: 'pitcher' }, { label: 'Infield', value: 'infield' }, { label: 'Outfield', value: 'outfield' }, { label: 'Eerste honk', value: 'first_base' }, { label: 'Catcher', value: 'catcher' }] },
    },
    th: {
      sport: { question: 'คุณต้องการถุงมือเบสบอลหรือซอฟต์บอล?', options: [{ label: '⚾ เบสบอล', value: 'baseball' }, { label: '🥎 ซอฟต์บอล', value: 'softball' }] },
      player_type: { question: 'ถุงมือนี้สำหรับผู้ใหญ่หรือเยาวชน?', options: [{ label: 'ผู้ใหญ่', value: 'adult' }, { label: 'เยาวชน', value: 'youth' }] },
      hand: { question: 'คุณขว้างด้วยมือข้างไหน?', options: [{ label: 'ขวา (RHT)', value: 'RHT' }, { label: 'ซ้าย (LHT)', value: 'LHT' }] },
      position: { question: 'ถุงมือนี้จะใช้ในตำแหน่งใด?', options: [{ label: 'พิทเชอร์', value: 'pitcher' }, { label: 'อินฟิลด์', value: 'infield' }, { label: 'เอาต์ฟิลด์', value: 'outfield' }, { label: 'เบสแรก', value: 'first_base' }, { label: 'แคชเชอร์', value: 'catcher' }] },
    },
    tl: {
      sport: { question: 'Gusto mo ba ng baseball o softball glove?', options: [{ label: '⚾ Baseball', value: 'baseball' }, { label: '🥎 Softball', value: 'softball' }] },
      player_type: { question: 'Para sa adult o youth player ang glove na ito?', options: [{ label: 'Adult', value: 'adult' }, { label: 'Youth', value: 'youth' }] },
      hand: { question: 'Aling kamay ang panghagis mo?', options: [{ label: 'Kanang kamay (RHT)', value: 'RHT' }, { label: 'Kaliwang kamay (LHT)', value: 'LHT' }] },
      position: { question: 'Anong posisyon ang gagamit ng glove na ito?', options: [{ label: 'Pitcher', value: 'pitcher' }, { label: 'Infield', value: 'infield' }, { label: 'Outfield', value: 'outfield' }, { label: 'Unang Base', value: 'first_base' }, { label: 'Catcher', value: 'catcher' }] },
    },
    pt: {
      sport: { question: 'Você quer uma luva de beisebol ou softbol?', options: [{ label: '⚾ Beisebol', value: 'baseball' }, { label: '🥎 Softbol', value: 'softball' }] },
      player_type: { question: 'Esta luva é para um jogador adulto ou infantil?', options: [{ label: 'Adulto', value: 'adult' }, { label: 'Infantil', value: 'youth' }] },
      hand: { question: 'Com qual mão você arremessa?', options: [{ label: 'Destro (RHT)', value: 'RHT' }, { label: 'Canhoto (LHT)', value: 'LHT' }] },
      position: { question: 'Para qual posição esta luva será usada?', options: [{ label: 'Arremessador', value: 'pitcher' }, { label: 'Interno', value: 'infield' }, { label: 'Externo', value: 'outfield' }, { label: 'Primeira Base', value: 'first_base' }, { label: 'Receptor', value: 'catcher' }] },
    },
  };

  const SPEC_SIZE_QUESTION: Record<Lang, string> = {
    en: 'What size would you like?', ko: '원하시는 사이즈를 선택해주세요', ja: '希望のサイズを選んでください',
    zh: '请选择您想要的尺寸', es: '¿Qué talla te gustaría?', fr: 'Quelle taille souhaitez-vous ?',
    de: 'Welche Größe möchtest du?', it: 'Che taglia desideri?', nl: 'Welke maat wil je?',
    th: 'คุณต้องการขนาดไหน?', tl: 'Anong size ang gusto mo?', pt: 'Qual tamanho você gostaria?',
  };

  // 팜 구조 위저드 질문 — 포수(catcher)는 아예 이 질문을 건너뜀(펠트팜이라 선택지가 없음).
  // value는 언어 무관 고정 코드('single'/'double'/'double_plus') 유지, 갤러리의 "팜 구조 가이드" 공지와 동일한 3단계 구조.
  // 팜 구조는 커스텀 글러브 업계에서도 생소한 선택지라, 손님이 묻기 전에 intro(팜이 뭔지+싱글/더블 차이)와
  // positionNote(방금 고른 포지션엔 왜 이게 맞는지)를 먼저 설명한 뒤 질문+버튼을 보여줌.
  type PalmValue = 'single' | 'double' | 'double_plus';
  type PalmPositionKey = 'pitcher' | 'infield' | 'outfield' | 'first_base';
  const PALM_QUESTIONS_BY_LANG: Record<Lang, {
    intro: string;
    positionNote: Record<PalmPositionKey, string>;
    question: string;
    options: { value: PalmValue; label: string }[];
  }> = {
    en: {
      intro: 'Quick note: the "palm" isn\'t the fingers or the web — it\'s the leather reinforcement at the base of the glove, the pocket where the ball actually lands. Single Palm (2 layers) is the base build: lightest, breaks in fastest. Double Palm (3 layers) adds one reinforcement layer for a sturdier catch. Double Palm Plus (4 layers) reinforces both sides for maximum durability. The ideal choice actually depends on your position — here\'s what fits yours:',
      positionNote: {
        pitcher: 'For pitchers: you grip the glove hard at release and take fast return throws from the catcher, so Double Palm Plus is the standard pick.',
        first_base: 'For first base: you catch a lot of hard throws, so Double Palm balances hand protection with a good catch.',
        infield: 'For infield: preferences vary a lot here, so all three are open — Double Palm is the safest default.',
        outfield: 'For outfield: it barely matters since you catch more with your range — pick whichever fits your style.',
      },
      question: 'Which palm construction would you like?', options: [
        { value: 'single', label: 'Single Palm (2 layers) — lightest, breaks in fast' },
        { value: 'double', label: 'Double Palm (3 layers) — balanced, most popular' },
        { value: 'double_plus', label: 'Double Palm Plus (4 layers) — most durable' },
      ],
    },
    ko: {
      intro: '잠깐! \'팜(palm)\'이란 손가락이나 웹이 아니라, 공이 실제로 박히는 바닥(포켓) 부분에 덧대는 가죽을 말합니다. 싱글팜(2겹)은 기본 구조로 가장 가볍고 빨리 길들여지고, 더블팜(3겹)은 보강 가죽을 한 겹 더 붙여 더 튼튼하며, 더블팜 플러스(4겹)는 양쪽 다 보강해 가장 오래갑니다. 이상적인 선택은 포지션마다 다른데, 고객님의 포지션엔 이게 맞습니다:',
      positionNote: {
        pitcher: '투수는 투구 순간 글러브 손을 꽉 쥐고 포수의 빠른 송구도 받아야 해서 더블팜 플러스가 기본입니다.',
        first_base: '1루수는 강한 송구를 자주 받기 때문에, 손 보호와 공 안착의 균형이 좋은 더블팜을 추천합니다.',
        infield: '내야수는 선수마다 선호가 크게 갈려서 세 가지 모두 선택 가능하며, 더블팜이 가장 무난합니다.',
        outfield: '외야수는 다리로 공을 잡는 포지션이라 팜 구조는 크게 상관없으니 취향대로 고르시면 됩니다.',
      },
      question: '팜(palm) 구조를 선택해주세요', options: [
        { value: 'single', label: '싱글팜 (2겹) — 가장 가볍고 빨리 길들여짐' },
        { value: 'double', label: '더블팜 (3겹) — 균형 잡힌 가장 무난한 선택' },
        { value: 'double_plus', label: '더블팜 플러스 (4겹) — 최고의 내구성' },
      ],
    },
    ja: {
      intro: 'ちょっとご案内：「パーム」とは指でもウェブでもなく、ボールが実際に収まるグラブ底部（ポケット）に貼る補強革のことです。シングルパーム（2枚）は基本構造で最も軽く型付けが早い、ダブルパーム（3枚）は補強を1枚追加してより丈夫、ダブルパームプラス（4枚）は両側を補強し最も耐久性が高いです。実は最適な選択はポジションによって異なります。あなたのポジションにはこちらがおすすめです：',
      positionNote: {
        pitcher: '投手：投球の瞬間にグラブを強く握り、捕手からの速い返球も受けるため、標準はダブルパームプラスです。',
        first_base: '一塁手：強い送球を受けることが多いため、手の保護と収まりのバランスが良いダブルパームがおすすめです。',
        infield: '内野手：好みが大きく分かれるため三種類すべて選択可能で、ダブルパームが最も無難です。',
        outfield: '外野手：足で追いつく守備が中心のためパーム構造はあまり影響せず、お好みで選んでください。',
      },
      question: 'パーム構造をお選びください', options: [
        { value: 'single', label: 'シングルパーム (2枚) — 最も軽く型付けが早い' },
        { value: 'double', label: 'ダブルパーム (3枚) — バランスの取れた定番' },
        { value: 'double_plus', label: 'ダブルパームプラス (4枚) — 最高の耐久性' },
      ],
    },
    zh: {
      intro: '小提示：「掌垫（palm）」不是手指也不是网套，而是手套底部（口袋）——球实际落入的部位——所垫的皮革。Single Palm（2层）是基础结构，最轻、磨合最快；Double Palm（3层）多加一层加固，接球更稳固；Double Palm Plus（4层）两侧都加固，最耐用。最适合的选择其实因位置而异，以下是适合您位置的建议：',
      positionNote: {
        pitcher: '投手：出手瞬间需要紧握手套、还要接住捕手的快速回传球，因此默认推荐 Double Palm Plus。',
        first_base: '一垒手：经常接强力回传球，Double Palm 能在保护手掌与球易落稳之间取得平衡。',
        infield: '内野手：偏好差异很大，三种都可选，Double Palm 是最保险的默认选项。',
        outfield: '外野手：主要靠双腿移动接球，掌垫结构影响不大，按个人喜好选择即可。',
      },
      question: '请选择掌垫结构', options: [
        { value: 'single', label: 'Single Palm 单层掌垫 (2层) — 最轻，磨合最快' },
        { value: 'double', label: 'Double Palm 双层掌垫 (3层) — 均衡，最受欢迎' },
        { value: 'double_plus', label: 'Double Palm Plus 加强双层掌垫 (4层) — 最耐用' },
      ],
    },
    es: {
      intro: 'Una aclaración rápida: la "palma" no son los dedos ni la red — es el refuerzo de cuero en la base del guante, el bolsillo donde cae la pelota. Single Palm (2 capas) es la base: la más ligera y rápida de ablandar. Double Palm (3 capas) añade una capa de refuerzo para un agarre más firme. Double Palm Plus (4 capas) refuerza ambos lados para la máxima durabilidad. La opción ideal depende de tu posición — esto es lo que te conviene:',
      positionNote: {
        pitcher: 'Lanzador: aprietas el guante al soltar la pelota y recibes lanzamientos fuertes del receptor, por eso Double Palm Plus es lo estándar.',
        first_base: 'Primera base: recibes muchos lanzamientos fuertes, así que Double Palm equilibra protección y buen agarre de la pelota.',
        infield: 'Cuadro interior: las preferencias varían mucho aquí, así que las tres opciones están disponibles — Double Palm es la opción más segura.',
        outfield: 'Jardín exterior: casi no importa porque atrapas más con las piernas — elige según tu gusto.',
      },
      question: '¿Qué construcción de palma prefieres?', options: [
        { value: 'single', label: 'Single Palm (2 capas) — la más ligera, se ablanda rápido' },
        { value: 'double', label: 'Double Palm (3 capas) — equilibrada, la más popular' },
        { value: 'double_plus', label: 'Double Palm Plus (4 capas) — la más duradera' },
      ],
    },
    fr: {
      intro: 'Petite précision : la « paume » n\'est ni les doigts ni le filet — c\'est le renfort en cuir à la base du gant, la poche où la balle atterrit. Single Palm (2 couches) est la construction de base : la plus légère et la plus rapide à assouplir. Double Palm (3 couches) ajoute une couche de renfort pour une prise plus solide. Double Palm Plus (4 couches) renforce les deux côtés pour une durabilité maximale. Le choix idéal dépend en fait de votre poste — voici ce qui convient au vôtre :',
      positionNote: {
        pitcher: 'Lanceur : vous serrez le gant au moment du lâcher et recevez des lancers rapides du receveur, donc Double Palm Plus est le standard.',
        first_base: 'Premier but : vous recevez beaucoup de lancers puissants, donc Double Palm équilibre protection et bonne prise de balle.',
        infield: 'Champ intérieur : les préférences varient beaucoup ici, donc les trois options sont disponibles — Double Palm reste le choix le plus sûr.',
        outfield: 'Champ extérieur : cela importe peu car vous attrapez surtout avec vos jambes — choisissez selon votre préférence.',
      },
      question: 'Quelle construction de paume préférez-vous ?', options: [
        { value: 'single', label: 'Single Palm (2 couches) — la plus légère, s\'assouplit vite' },
        { value: 'double', label: 'Double Palm (3 couches) — équilibrée, la plus populaire' },
        { value: 'double_plus', label: 'Double Palm Plus (4 couches) — la plus durable' },
      ],
    },
    de: {
      intro: 'Kurzer Hinweis: Die „Palm" sind nicht die Finger oder das Netz — es ist die Lederverstärkung an der Basis des Handschuhs, die Tasche, in der der Ball landet. Single Palm (2 Schichten) ist die Grundkonstruktion: am leichtesten und am schnellsten eingespielt. Double Palm (3 Schichten) fügt eine Verstärkungsschicht für einen festeren Griff hinzu. Double Palm Plus (4 Schichten) verstärkt beide Seiten für maximale Haltbarkeit. Die ideale Wahl hängt eigentlich von deiner Position ab — das passt zu deiner:',
      positionNote: {
        pitcher: 'Pitcher: Du drückst den Handschuh beim Loslassen fest zusammen und fängst harte Rückwürfe vom Catcher, daher ist Double Palm Plus der Standard.',
        first_base: 'Erste Base: Du empfängst viele harte Würfe, daher bietet Double Palm die beste Balance zwischen Schutz und gutem Ballsitz.',
        infield: 'Infield: Hier gehen die Vorlieben stark auseinander, daher stehen alle drei Optionen zur Verfügung — Double Palm ist die sicherste Standardwahl.',
        outfield: 'Outfield: Spielt kaum eine Rolle, da du den Ball eher mit den Beinen erreichst — wähle nach Geschmack.',
      },
      question: 'Welche Palm-Konstruktion möchten Sie?', options: [
        { value: 'single', label: 'Single Palm (2 Schichten) — am leichtesten, spielt sich schnell ein' },
        { value: 'double', label: 'Double Palm (3 Schichten) — ausgewogen, am beliebtesten' },
        { value: 'double_plus', label: 'Double Palm Plus (4 Schichten) — am haltbarsten' },
      ],
    },
    it: {
      intro: 'Una precisazione veloce: il "palmo" non sono le dita né la rete — è il rinforzo in pelle alla base del guanto, la tasca dove atterra la palla. Single Palm (2 strati) è la costruzione base: la più leggera e la più rapida da ammorbidire. Double Palm (3 strati) aggiunge uno strato di rinforzo per una presa più solida. Double Palm Plus (4 strati) rinforza entrambi i lati per la massima durabilità. La scelta ideale dipende in realtà dalla tua posizione — ecco cosa fa per te:',
      positionNote: {
        pitcher: 'Lanciatore: stringi il guanto al momento del rilascio e ricevi lanci veloci dal ricevitore, quindi Double Palm Plus è lo standard.',
        first_base: 'Prima base: ricevi molti lanci forti, quindi Double Palm bilancia protezione e buona presa della palla.',
        infield: 'Interno campo: qui le preferenze variano molto, quindi tutte e tre le opzioni sono disponibili — Double Palm resta la scelta più sicura.',
        outfield: 'Esterno campo: conta poco perché catturi di più con le gambe — scegli secondo il tuo gusto.',
      },
      question: 'Quale costruzione del palmo preferisci?', options: [
        { value: 'single', label: 'Single Palm (2 strati) — la più leggera, si ammorbidisce in fretta' },
        { value: 'double', label: 'Double Palm (3 strati) — equilibrata, la più popolare' },
        { value: 'double_plus', label: 'Double Palm Plus (4 strati) — la più durevole' },
      ],
    },
    nl: {
      intro: 'Even ter info: de "palm" is niet je vingers of het web — het is de leren versteviging aan de basis van de handschoen, de pocket waar de bal landt. Single Palm (2 lagen) is de basisconstructie: het lichtst en het snelst ingespeeld. Double Palm (3 lagen) voegt een verstevigingslaag toe voor een steviger vangst. Double Palm Plus (4 lagen) verstevigt beide kanten voor maximale duurzaamheid. De ideale keuze hangt eigenlijk af van je positie — dit past bij de jouwe:',
      positionNote: {
        pitcher: 'Pitcher: je knijpt de handschoen stevig dicht bij het loslaten en vangt harde terugworpen van de catcher, dus Double Palm Plus is standaard.',
        first_base: 'Eerste honk: je ontvangt veel harde worpen, dus Double Palm biedt de beste balans tussen bescherming en een goede vangst.',
        infield: 'Binnenveld: hier lopen de voorkeuren sterk uiteen, dus alle drie zijn beschikbaar — Double Palm blijft de veiligste standaardkeuze.',
        outfield: 'Buitenveld: maakt weinig uit, want je vangt vooral met je benen — kies wat bij jou past.',
      },
      question: 'Welke palmconstructie wil je?', options: [
        { value: 'single', label: 'Single Palm (2 lagen) — lichtst, speelt snel in' },
        { value: 'double', label: 'Double Palm (3 lagen) — evenwichtig, meest populair' },
        { value: 'double_plus', label: 'Double Palm Plus (4 lagen) — meest duurzaam' },
      ],
    },
    th: {
      intro: 'ขออธิบายสักนิด "ปาล์ม (palm)" ไม่ใช่นิ้วมือหรือเว็บ แต่เป็นแผ่นหนังเสริมที่ฐานถุงมือ ตรงกระเป๋าที่ลูกบอลตกลงมาจริง ๆ Single Palm (2 ชั้น) คือโครงสร้างพื้นฐาน เบาที่สุดและเข้ามือเร็วที่สุด Double Palm (3 ชั้น) เพิ่มชั้นเสริมอีกหนึ่งชั้นเพื่อการรับที่มั่นคงขึ้น Double Palm Plus (4 ชั้น) เสริมทั้งสองด้านเพื่อความทนทานสูงสุด จริง ๆ แล้วตัวเลือกที่เหมาะสมขึ้นอยู่กับตำแหน่งของคุณ นี่คือสิ่งที่เหมาะกับตำแหน่งของคุณ:',
      positionNote: {
        pitcher: 'พิตเชอร์: คุณต้องกำมือถุงมือแน่นตอนปล่อยลูก และรับลูกขว้างเร็วจากแคตเชอร์ ดังนั้นค่าเริ่มต้นคือ Double Palm Plus',
        first_base: 'เบสหนึ่ง: คุณรับลูกขว้างแรง ๆ บ่อย Double Palm จึงสมดุลระหว่างการปกป้องมือกับการรับลูกที่ดี',
        infield: 'อินฟิลด์: ความชอบตรงนี้แตกต่างกันมาก จึงเลือกได้ทั้ง 3 แบบ โดย Double Palm เป็นค่าเริ่มต้นที่ปลอดภัยที่สุด',
        outfield: 'เอาต์ฟิลด์: แทบไม่มีผลเพราะคุณรับลูกด้วยขาเป็นหลัก เลือกตามความชอบได้เลย',
      },
      question: 'คุณต้องการโครงสร้างปาล์มแบบไหน?', options: [
        { value: 'single', label: 'Single Palm (2 ชั้น) — เบาที่สุด เข้ามือเร็วที่สุด' },
        { value: 'double', label: 'Double Palm (3 ชั้น) — สมดุล ได้รับความนิยมมากที่สุด' },
        { value: 'double_plus', label: 'Double Palm Plus (4 ชั้น) — ทนทานที่สุด' },
      ],
    },
    tl: {
      intro: 'Isang mabilisang paliwanag: ang "palm" ay hindi ang mga daliri o ang web — ito ang reinforcement na katad sa base ng guwantes, ang bulsa kung saan talagang dumarapo ang bola. Ang Single Palm (2 layer) ang basic construction: pinakamagaan at pinakamabilis mag-break in. Ang Double Palm (3 layer) ay may dagdag na reinforcement layer para sa mas matibay na hawak. Ang Double Palm Plus (4 layer) ay pinalakas ang dalawang panig para sa pinakamataas na durability. Ang pinakaangkop na pagpipilian ay depende talaga sa posisyon mo — ito ang bagay sa iyo:',
      positionNote: {
        pitcher: 'Pitcher: pinipiga mo ang guwantes nang husto sa release at tumatanggap ka ng malakas na balik-hagis mula sa catcher, kaya Double Palm Plus ang standard.',
        first_base: 'First Base: madalas kang tumanggap ng malalakas na throw, kaya ang Double Palm ang balanse sa pagitan ng proteksyon at magandang pagdapo ng bola.',
        infield: 'Infield: talagang magkaiba ang kagustuhan dito, kaya bukas ang tatlong opsyon — ang Double Palm pa rin ang pinakaligtas na default.',
        outfield: 'Outfield: halos hindi mahalaga dahil mas gamit mo ang binti sa pagsalo — piliin ayon sa gusto mo.',
      },
      question: 'Anong palm construction ang gusto mo?', options: [
        { value: 'single', label: 'Single Palm (2 layer) — pinakamagaan, mabilis mag-break in' },
        { value: 'double', label: 'Double Palm (3 layer) — balanse, pinakasikat' },
        { value: 'double_plus', label: 'Double Palm Plus (4 layer) — pinakamatibay' },
      ],
    },
    pt: {
      intro: 'Uma explicação rápida: a "palma" não são os dedos nem a rede — é o reforço de couro na base da luva, o bolso onde a bola realmente cai. Single Palm (2 camadas) é a construção base: a mais leve e a mais rápida de amaciar. Double Palm (3 camadas) adiciona uma camada de reforço para uma pegada mais firme. Double Palm Plus (4 camadas) reforça os dois lados para durabilidade máxima. A escolha ideal depende, na verdade, da sua posição — veja o que combina com a sua:',
      positionNote: {
        pitcher: 'Arremessador: você aperta a luva na soltura e recebe arremessos fortes do receptor, por isso Double Palm Plus é o padrão.',
        first_base: 'Primeira base: você recebe muitos arremessos fortes, então Double Palm equilibra proteção e boa acomodação da bola.',
        infield: 'Quadro interno: as preferências variam muito aqui, então as três opções ficam disponíveis — Double Palm continua a escolha mais segura.',
        outfield: 'Campo externo: quase não importa, pois você pega mais com as pernas — escolha conforme seu gosto.',
      },
      question: 'Qual construção de palma você prefere?', options: [
        { value: 'single', label: 'Single Palm (2 camadas) — a mais leve, amacia rápido' },
        { value: 'double', label: 'Double Palm (3 camadas) — equilibrada, a mais popular' },
        { value: 'double_plus', label: 'Double Palm Plus (4 camadas) — a mais durável' },
      ],
    },
  };

  const RECOMMENDED_LABEL: Record<Lang, string> = {
    en: 'Recommended for this position', ko: '이 포지션에 추천', ja: 'このポジションにおすすめ',
    zh: '推荐用于此位置', es: 'Recomendado para esta posición', fr: 'Recommandé pour ce poste',
    de: 'Empfohlen für diese Position', it: 'Consigliato per questa posizione', nl: 'Aanbevolen voor deze positie',
    th: 'แนะนำสำหรับตำแหน่งนี้', tl: 'Rekomendado para sa posisyong ito', pt: 'Recomendado para esta posição',
  };

  // 포지션별 기본 추천 팜 구조 — 갤러리 "팜 구조 가이드" 공지와 동일한 기준 (투수=더블팜플러스, 1루/내야/외야=더블팜, 포수=질문 자체를 건너뜀)
  const recommendedPalmForPosition = (positionKey: string): PalmValue =>
    positionKey === 'pitcher' ? 'double_plus' : 'double';

  // 위저드 진행 중 텍스트로 답하려 할 때 보여주는 안내 문구 — 아래 버튼에서 골라달라고 친절하게 안내
  const SPEC_NUDGE_TEXT: Record<Lang, string> = {
    en: 'Please choose one of the options below 👇', ko: '아래 보기에서 선택해 주세요 👇', ja: '下の選択肢からお選びください 👇',
    zh: '请从下方选项中选择 👇', es: 'Por favor, elige una de las opciones de abajo 👇', fr: 'Merci de choisir une option ci-dessous 👇',
    de: 'Bitte wähle eine der Optionen unten 👇', it: 'Scegli una delle opzioni qui sotto 👇', nl: 'Kies een van de opties hieronder 👇',
    th: 'กรุณาเลือกจากตัวเลือกด้านล่าง 👇', tl: 'Pumili ng isa sa mga opsyon sa ibaba 👇', pt: 'Escolha uma das opções abaixo 👇',
  };

  const SPEC_QUESTIONS = SPEC_QUESTIONS_BY_LANG[selectedLanguage || 'en'];
  const PALM_QUESTION = PALM_QUESTIONS_BY_LANG[selectedLanguage || 'en'];

  // position에서 고른 값의 범위/단위로 사이즈 버튼 목록 생성 (extra는 정규 step 범위 뒤에 그대로 추가)
  const sizeOptionsForPosition = (positionKey: string): { label: string; value: string }[] => {
    const guide = SIZE_GUIDE.find(p => p.key === positionKey);
    if (!guide) return [];
    const values: number[] = [];
    for (let v = guide.min; v <= guide.max + 1e-6; v += guide.step) values.push(Math.round(v * 100) / 100);
    if (guide.extra) values.push(...guide.extra);
    return values.map(v => ({ label: `${v}"`, value: String(v) }));
  };

  // 스펙 위저드 질문 텍스트 — 버튼을 보여줄 때와 답변 후 대화 기록에 남길 때 동일하게 사용
  // palm_construction은 손님 대부분이 처음 접하는 개념이라, 질문 전에 intro(팜 정의+싱글/더블 차이)와
  // positionNote(방금 고른 포지션엔 왜 이게 맞는지)를 먼저 보여준 뒤 질문을 붙임
  const specQuestionText = (step: SpecField): string =>
    step === 'size' ? SPEC_SIZE_QUESTION[selectedLanguage || 'en']
    : step === 'palm_construction' ? [
        PALM_QUESTION.intro,
        PALM_QUESTION.positionNote[specAnswersRef.current.position as PalmPositionKey],
        PALM_QUESTION.question,
      ].filter(Boolean).join('\n\n')
    : SPEC_QUESTIONS[step].question;

  // position 다음 단계 결정 — 포수(catcher)는 팜 구조 선택지가 없으므로(펠트팜) palm_construction을 건너뜀
  const nextSpecStep = (step: SpecField): SpecField | null => {
    switch (step) {
      case 'sport': return 'player_type';
      case 'player_type': return 'hand';
      case 'hand': return 'position';
      case 'position': return specAnswersRef.current.position === 'catcher' ? 'size' : 'palm_construction';
      case 'palm_construction': return 'size';
      case 'size': return null;
    }
  };

  // 스펙 위저드 답변 처리 — 매 답변은 로컬에서 대화 기록에만 추가하고, 마지막(size) 답변에서만 실제 API 호출
  const answerSpec = (value: string, label: string) => {
    const step = specStep;
    if (!step) return;
    const question = specQuestionText(step);
    specAnswersRef.current[step] = value;
    setSpecNudge(false);

    const newMessages = [...messages, { role: 'assistant' as const, content: question }, { role: 'user' as const, content: label }];
    setMessages(newMessages);

    const nextStep = nextSpecStep(step);
    if (nextStep) {
      setSpecStep(nextStep);
    } else {
      setSpecStep(null);
      callChatAPI(newMessages);
    }
  };

  const renderSpecPicker = () => {
    if (!specStep) return null;

    if (specStep === 'palm_construction') {
      const recommended = recommendedPalmForPosition(specAnswersRef.current.position);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          {PALM_QUESTION.options.map((opt) => {
            const isRecommended = opt.value === recommended;
            return (
              <button
                key={opt.value}
                onClick={() => answerSpec(opt.value, opt.label)}
                style={{
                  background: isRecommended ? '#b8922a' : '#374151',
                  border: isRecommended ? '2px solid #facc15' : '2px solid #4b5563',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {isRecommended && (
                  <span style={{ fontSize: '9px', color: '#facc15', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    ★ {RECOMMENDED_LABEL[selectedLanguage || 'en']}
                  </span>
                )}
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: 500 }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    const options = specStep === 'size' ? sizeOptionsForPosition(specAnswersRef.current.position) : SPEC_QUESTIONS[specStep].options;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => answerSpec(opt.value, opt.label)}
            style={{
              background: '#374151',
              border: '2px solid #4b5563',
              borderRadius: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
              textAlign: 'left',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 500,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
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
    let cleanContent = content.substring(0, cutIndex).trim();

    // [FONT_PICK:name] 태그 감지
    const fontPickMatch = cleanContent.match(/\[FONT_PICK:([^\]]*)\]/);
    const fontPickText = fontPickMatch ? fontPickMatch[1].trim() : '';
    const hasFontPick = !!fontPickMatch || cleanContent.includes('[FONT_PICK]');
    cleanContent = cleanContent.replace(/\[FONT_PICK:[^\]]*\]/g, '').replace(/\[FONT_PICK\]/g, '').trim();

    // [LOGO_PICK] 태그 감지 — GN 로고 배경/글자색 스와치 피커
    const hasLogoPick = cleanContent.includes('[LOGO_PICK]');
    cleanContent = cleanContent.replace(/\[LOGO_PICK\]/g, '').trim();

    // [NAME_COLOR_PICK] 태그 감지 — 이름 자수 글자색 스와치 피커
    const hasNameColorPick = cleanContent.includes('[NAME_COLOR_PICK]');
    cleanContent = cleanContent.replace(/\[NAME_COLOR_PICK\]/g, '').trim();

    // [BORDER_PICK] 태그 감지 — 이름 자수 테두리 색 스와치 피커
    const hasBorderPick = cleanContent.includes('[BORDER_PICK]');
    cleanContent = cleanContent.replace(/\[BORDER_PICK\]/g, '').trim();

    // [NAME_LOC:text] / [FLAG_LOC] 태그 감지 — 손가락 위치 피커
    const nameLocMatch = cleanContent.match(/\[NAME_LOC:([^\]]*)\]/);
    const nameLocText = nameLocMatch ? nameLocMatch[1].trim() : '';
    const hasNameLoc = !!nameLocMatch || cleanContent.includes('[NAME_LOC]');
    cleanContent = cleanContent.replace(/\[NAME_LOC:[^\]]*\]/g, '').replace(/\[NAME_LOC\]/g, '').trim();
    const hasFlagLoc = cleanContent.includes('[FLAG_LOC]');
    cleanContent = cleanContent.replace(/\[FLAG_LOC\]/g, '').trim();

    // [FLAG_PICK] 태그 감지 — 국기 나라 선택(기본 국기 1개 + 없음 + 타이핑)
    const hasFlagPick = cleanContent.includes('[FLAG_PICK]');
    cleanContent = cleanContent.replace(/\[FLAG_PICK\]/g, '').trim();

    // [CUSTOMER_FORM] 태그 감지 — 이름/전화/주소 폼 + 주소 검증
    const hasCustomerForm = cleanContent.includes('[CUSTOMER_FORM]');
    cleanContent = cleanContent.replace(/\[CUSTOMER_FORM\]/g, '').trim();

    // [CHANGES_ASK] 태그 감지 — "그대로 진행 / 변경할게요" 버튼
    const hasChangesAsk = cleanContent.includes('[CHANGES_ASK]');
    cleanContent = cleanContent.replace(/\[CHANGES_ASK\]/g, '').trim();

    // [CHANGE_CONFIRM] 태그 감지 — AI가 변경 내용을 재확인("...맞나요?") → 맞음/다시 입력 버튼
    const hasChangeConfirm = cleanContent.includes('[CHANGE_CONFIRM]');
    cleanContent = cleanContent.replace(/\[CHANGE_CONFIRM\]/g, '').trim();

    // 사용자 메시지에 실린 숨김 토큰(맞음 시 코드가 붙임)은 화면에서 제거
    cleanContent = cleanContent.replace(/\[\[CHANGE_(MORE|DONE)\]\]/g, '').trim();

    // 마크다운 미렌더 — AI가 넣은 **굵게** 마커가 그대로 노출되므로 제거
    cleanContent = cleanContent.replace(/\*\*/g, '');

    // [SHOW_IMAGE: ...] 파싱
    const parts = cleanContent.split(/\[SHOW_IMAGE: ([^\]]+)\]/g);
    return (
      <>
        {parts.map((part, i) => {
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
        })}
        {hasFontPick && renderFontPicker(fontPickText)}
        {hasLogoPick && renderLogoPicker()}
        {hasNameColorPick && renderNameColorPicker()}
        {hasBorderPick && renderBorderPicker()}
        {hasNameLoc && renderLocationPicker('name', nameLocText)}
        {hasFlagPick && renderFlagPicker()}
        {hasFlagLoc && renderLocationPicker('flag', '')}
        {hasCustomerForm && renderCustomerForm()}
        {hasChangesAsk && renderChangesAsk()}
        {hasChangeConfirm && renderChangeConfirm()}
      </>
    );
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
  const ui = UI_STRINGS[selectedLanguage || 'en'];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">

      {/* 주문 처리 중 오버레이 — 캡처+이메일 발송에 시간이 걸려서, 에러로 오해하고 페이지를 이탈하지 않도록 표시 */}
      {orderProcessing && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '40px', height: '40px', margin: '0 auto 16px',
                border: '4px solid #374151', borderTopColor: '#facc15',
                borderRadius: '50%', animation: 'gn-spin 0.8s linear infinite',
              }}
            />
            <div style={{ color: '#facc15', fontSize: '14px', fontWeight: 600, maxWidth: '320px' }}>
              {PROCESSING_TEXT[selectedLanguage || 'en']}
            </div>
          </div>
          <style>{`@keyframes gn-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* "Start My Order" 확인 모달 — 입력창 바로 위 버튼 오터치로 인한 실수 시작 방지 */}
      {showStartConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #facc15',
              borderRadius: '14px',
              padding: '28px 24px',
              maxWidth: '380px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '14px', color: '#d1d5db', lineHeight: 1.6, marginBottom: '20px' }}>
              {ui.confirmStartBody}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowStartConfirm(false)}
                style={{ flex: 1, background: '#374151', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '8px', padding: '12px', cursor: 'pointer' }}
              >
                {ui.confirmStartCancel}
              </button>
              <button
                onClick={() => { setShowStartConfirm(false); setStep('select'); }}
                style={{ flex: 1, background: '#facc15', color: '#111', fontWeight: 700, border: 'none', borderRadius: '8px', padding: '12px', cursor: 'pointer' }}
              >
                {ui.confirmStartYes}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {(step === 'email' || step === 'verify' || step === 'language' || step === 'select') && <Nav />}

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
          <h1 className="text-2xl font-bold text-yellow-400 mb-2">{ui.selectTitle}</h1>
          <p className="text-gray-400 mb-8">{ui.selectSubtitle}</p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => window.location.href = '/catalog'}
              className="w-full bg-yellow-400 text-black font-bold py-4 rounded-xl hover:bg-yellow-300 text-lg"
            >
              {ui.browseCatalogButton}
            </button>
            <button
              onClick={() => {
                sessionStorage.setItem('gnEmail', email);
                emailRef.current = email;
                setStep('chat');
                chooseLanguage(selectedLanguageRef.current || 'en');
              }}
              className="w-full bg-gray-700 text-white font-bold py-4 rounded-xl hover:bg-gray-600 text-lg"
            >
              {ui.uploadPhotoButton}
            </button>
          </div>
        </div>
      )}

      {/* 언어 선택 — 로그인 직후 가장 먼저 표시 */}
      {step === 'language' && (
        <div className="w-full max-w-2xl flex flex-col h-screen items-center justify-center p-6">
          <h1 className="text-xl font-bold text-yellow-400 mb-2">GN GLOVE</h1>
          <p className="text-gray-400 mb-6">Please choose your language / 언어를 선택해주세요</p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => pickLanguage(l.code)}
                className="bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-medium"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* intro — 언어 선택 직후, 주문방법 안내 + Q&A. "Start My Order"를 누르면 select 스텝으로 이동 */}
      {step === 'intro' && (
        <div className="w-full max-w-2xl flex flex-col h-screen">
          <div className="bg-gray-900 p-3 text-center">
            <h1 className="text-xl font-bold text-yellow-400">GN GLOVE</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {introMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl whitespace-pre-wrap ${msg.role === 'user' ? 'bg-yellow-400 text-black' : 'bg-gray-800'}`}>
                  {msg.content.replace(/\*\*/g, '')}
                </div>
              </div>
            ))}
            {loading && <div className="text-gray-400 text-sm">{ui.typing}</div>}
            <div ref={introMessagesEndRef} />
          </div>

          <div className="px-4 pb-2">
            <button
              onClick={() => setShowStartConfirm(true)}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-300"
            >
              {ui.startOrderButton}
            </button>
          </div>

          <div className="p-4 bg-gray-900 flex gap-2 items-end">
            <textarea
              className="flex-1 bg-gray-800 rounded-lg p-3 outline-none resize-none leading-relaxed"
              placeholder={ui.introPlaceholder}
              value={introInput}
              onChange={e => setIntroInput(e.target.value)}
              onKeyDown={handleIntroKeyDown}
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px', overflowY: 'auto' }}
            />
            <button
              onClick={() => sendIntroMessage()}
              disabled={loading}
              className="bg-yellow-400 text-black font-bold px-6 rounded-lg hover:bg-yellow-300 flex-shrink-0"
              style={{ height: '44px' }}
            >{ui.sendButton}</button>
          </div>
        </div>
      )}

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
            {!specStep && awaitingStartConfirm && !loading && renderStartGate()}
            {changeInputMode && !loading && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md p-3 rounded-2xl bg-gray-800 whitespace-pre-wrap">
                  {CHANGE_CONFIRM_TEXT[selectedLanguage || 'en'].prompt}
                </div>
              </div>
            )}
            {specStep && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md p-3 rounded-2xl bg-gray-800">
                  <div className="whitespace-pre-wrap">{specQuestionText(specStep)}</div>
                  {renderSpecPicker()}
                  {specNudge && (
                    <div className="text-yellow-400 text-xs mt-2">{SPEC_NUDGE_TEXT[selectedLanguage || 'en']}</div>
                  )}
                </div>
              </div>
            )}
            {loading && (
              <div className="text-gray-400 text-sm">
                {specWizardPendingRef.current ? PHOTO_WAIT_TEXT[selectedLanguage || 'en'] : ui.typing}
              </div>
            )}
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
              placeholder={ui.inputPlaceholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px', overflowY: 'auto' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading}
              className="bg-yellow-400 text-black font-bold px-6 rounded-lg hover:bg-yellow-300 flex-shrink-0"
              style={{ height: '44px' }}
            >{ui.sendButton}</button>
          </div>
        </div>
      )}

      {/* 장인 메시지 — AI가 아니라 앱이 결정론적으로 수집하는 고정 스텝 */}
      {step === 'craftsman' && orderData && (() => {
        const ct = CRAFTSMAN_STEP_TEXT[selectedLanguage || 'en'];
        return (
          <div className="w-full max-w-lg">
            <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '16px', padding: '28px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{ct.title}</div>
              <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '16px', lineHeight: 1.6 }}>{ct.subtitle}</div>
              <textarea
                value={craftsmanMsg}
                onChange={e => setCraftsmanMsg(e.target.value)}
                placeholder={ct.placeholder}
                rows={4}
                disabled={craftsmanBusy}
                className="w-full bg-gray-800 rounded-lg p-3 outline-none resize-none leading-relaxed"
                style={{ border: '1px solid #4b5563', color: '#fff' }}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={() => proceedWithCraftsman('')}
                  disabled={craftsmanBusy}
                  style={{ flex: 1, background: '#374151', color: '#d1d5db', fontWeight: 700, border: '1px solid #4b5563', borderRadius: '10px', padding: '12px', cursor: craftsmanBusy ? 'not-allowed' : 'pointer' }}
                >{ct.skip}</button>
                <button
                  onClick={() => proceedWithCraftsman(craftsmanMsg)}
                  disabled={craftsmanBusy}
                  style={{ flex: 2, background: '#facc15', color: '#111', fontWeight: 700, border: 'none', borderRadius: '10px', padding: '12px', cursor: craftsmanBusy ? 'not-allowed' : 'pointer', opacity: craftsmanBusy ? 0.6 : 1 }}
                >{craftsmanBusy ? ct.sending : ct.next}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 주문서 */}
      {step === 'order' && orderData && (
        <div className="w-full max-w-3xl py-8">
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div ref={orderSheetRef}>
              <OrderSheet orderData={orderData} onConfirm={handleOrderConfirm} variant="customer" />
            </div>
          </div>
          <div ref={factorySheetRef} style={{ position: 'absolute', top: 0, left: '-9999px' }}>
            <OrderSheet orderData={orderData} onConfirm={() => {}} variant="factory" />
          </div>
        </div>
      )}

    </div>
  );
}
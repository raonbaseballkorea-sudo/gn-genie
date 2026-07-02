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
  const [step, setStep] = useState<'email' | 'verify' | 'language' | 'intro' | 'select' | 'chat' | 'order'>('email');
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
  type SpecField = 'sport' | 'player_type' | 'hand' | 'position' | 'size';
  const [specStep, setSpecStep] = useState<SpecField | null>(null);
  const specAnswersRef = useRef<Record<SpecField, string>>({ sport: '', player_type: '', hand: '', position: '', size: '' });
  // FLOW B(사진 업로드)는 첫 API 응답(경고+색상 코멘트)이 온 직후에 위저드를 시작해야 하므로 대기 플래그로 표시
  const specWizardPendingRef = useRef(false);

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

  // 언어 스텝에서 언어 버튼 클릭 시 — 언어를 확정하고 intro(주문방법 안내/Q&A) 스텝으로 이동
  const pickLanguage = (lang: Lang) => {
    setSelectedLanguage(lang);
    selectedLanguageRef.current = lang;
    sessionStorage.setItem('gnLang', lang);
    setStep('intro');
    sendIntroMessage();
  };

  // 실제 주문 채팅 진입 시 — 선택 언어로 환영 메시지(카탈로그) 또는 업로드 안내(직접 사진) 표시하고 스펙 위저드 시작
  const chooseLanguage = (lang: Lang) => {
    setSelectedLanguage(lang);
    selectedLanguageRef.current = lang;
    sessionStorage.setItem('gnLang', lang);
    specAnswersRef.current = { sport: '', player_type: '', hand: '', position: '', size: '' };
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
        setStep('order');
      } else {
        let replyText: string = data.message;
        if (replyText.includes('[[PHOTO_DONE]]')) {
          photoNeededRef.current = false;
          replyText = replyText.replace('[[PHOTO_DONE]]', '');
        }
        setMessages([...newMessages, { role: 'assistant', content: replyText }]);

        // FLOW B: 사진 업로드 후 첫 응답(경고+색상 코멘트)을 받은 직후 스펙 위저드 시작
        if (specWizardPendingRef.current) {
          specWizardPendingRef.current = false;
          setSpecStep('sport');
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
      return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    } catch (e) {
      console.error('Capture failed:', e);
      return null;
    }
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
        // 전체 초기화
        setStep('select');
        setMessages([]);
        setOrderData(null);
        setImages([]);
        uploadedImagesRef.current = [];
        pinnedImageRef.current = null;
        pinnedGloveRef.current = null;
        selectedGloveRawRef.current = null;
        photoNeededRef.current = true;
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
      { label: 'Script', fontFamily: "'Brush Script MT', cursive", fontStyle: 'italic' },
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
    const labelMap = { script: 'Script (Brush Script MT)', block: 'Block', elegant: 'Elegant' };
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

  // 사이즈 가이드 — route.ts의 "Size guide by position"와 동기화 유지
  const SIZE_GUIDE: { key: string; label: string; min: number; max: number; step: number }[] = [
    { key: 'pitcher', label: 'Pitcher', min: 11.5, max: 12.0, step: 0.25 },
    { key: 'infield', label: 'Infield', min: 11.25, max: 11.75, step: 0.25 },
    { key: 'outfield', label: 'Outfield', min: 12.5, max: 13.0, step: 0.25 },
    { key: 'first_base', label: 'First Base', min: 12.0, max: 13.0, step: 0.25 },
    { key: 'catcher', label: 'Catcher', min: 32, max: 34, step: 1 },
  ];

  const SPEC_ORDER: SpecField[] = ['sport', 'player_type', 'hand', 'position', 'size'];

  type SpecQuestionSet = Record<Exclude<SpecField, 'size'>, { question: string; options: { label: string; value: string }[] }>;

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

  const SPEC_QUESTIONS = SPEC_QUESTIONS_BY_LANG[selectedLanguage || 'en'];

  // position에서 고른 값의 범위/단위로 사이즈 버튼 목록 생성
  const sizeOptionsForPosition = (positionKey: string): { label: string; value: string }[] => {
    const guide = SIZE_GUIDE.find(p => p.key === positionKey);
    if (!guide) return [];
    const values: number[] = [];
    for (let v = guide.min; v <= guide.max + 1e-6; v += guide.step) values.push(Math.round(v * 100) / 100);
    return values.map(v => ({ label: `${v}"`, value: String(v) }));
  };

  // 스펙 위저드 질문 텍스트 — 버튼을 보여줄 때와 답변 후 대화 기록에 남길 때 동일하게 사용
  const specQuestionText = (step: SpecField): string =>
    step === 'size' ? SPEC_SIZE_QUESTION[selectedLanguage || 'en'] : SPEC_QUESTIONS[step].question;

  // 스펙 위저드 답변 처리 — 매 답변은 로컬에서 대화 기록에만 추가하고, 마지막(size) 답변에서만 실제 API 호출
  const answerSpec = (value: string, label: string) => {
    const step = specStep;
    if (!step) return;
    const question = specQuestionText(step);
    specAnswersRef.current[step] = value;

    const newMessages = [...messages, { role: 'assistant' as const, content: question }, { role: 'user' as const, content: label }];
    setMessages(newMessages);

    const nextStep = SPEC_ORDER[SPEC_ORDER.indexOf(step) + 1] || null;
    if (nextStep) {
      setSpecStep(nextStep);
    } else {
      setSpecStep(null);
      callChatAPI(newMessages);
    }
  };

  const renderSpecPicker = () => {
    if (!specStep) return null;
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
                  {msg.content}
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
            {specStep && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md p-3 rounded-2xl bg-gray-800">
                  <div className="whitespace-pre-wrap">{specQuestionText(specStep)}</div>
                  {renderSpecPicker()}
                </div>
              </div>
            )}
            {loading && <div className="text-gray-400 text-sm">{ui.typing}</div>}
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
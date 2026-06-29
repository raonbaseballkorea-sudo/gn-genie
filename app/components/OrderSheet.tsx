'use client';
import React from 'react';

interface OrderData {
  sport: string;
  player_type: string;
  hand: string;
  size: string;
  position: string;
  web_type: string;
  colors: {
    wrist?: string; wrist_hex?: string; wrist_zh?: string;
    welting?: string; welting_hex?: string; welting_zh?: string;
    lace?: string; lace_hex?: string; lace_zh?: string;
    bridge?: string; bridge_hex?: string; bridge_zh?: string;
    web?: string; web_hex?: string; web_zh?: string;
    palm_shell?: string; palm_shell_hex?: string; palm_shell_zh?: string;
    piping?: string; piping_hex?: string; piping_zh?: string;
    shell?: string; palm?: string;
  };
  color_changes?: { part: string; color: string; hex?: string; swatch?: string; part_zh?: string; color_zh?: string }[];
  embroidery: {
    name: { text: string; color: string; color_hex?: string; color_zh?: string; location: string; font_style?: 'script' | 'block' | 'elegant' };
    flag: { country: string; location: string };
  };
  logo: {
    background: string; background_hex?: string; background_zh?: string;
    logo_color: string; logo_color_hex?: string; logo_color_zh?: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  special_requests: string;
  special_requests_zh?: string;
  web_type_zh?: string;
  customer_language?: string;
  reference_photo: string;
  reference_photos?: { base64: string; type: string }[];
  order_id?: string;
  selected_glove?: string;
}

const COLOR_MAP: { [key: string]: string } = {
  black: '#1a1a1a', white: '#ffffff', navy: '#001f5b', red: '#cc0000',
  tan: '#d2b48c', brown: '#8b4513', caramel: '#c68642', gold: '#c9a84c',
  yellow: '#ffff00', orange: '#ff8c00', green: '#228b22', pink: '#ffb6c1',
  mint: '#98ff98', lavender: '#e6e6fa', cream: '#fffdd0', peach: '#ffcba4',
  gray: '#808080', silver: '#c0c0c0', purple: '#800080', royal: '#4169e1',
  blue: '#1a6fdb', skyblue: '#87ceeb', lightblue: '#add8e6',
  turquoise: '#40e0d0', teal: '#008080', maroon: '#800000',
  beige: '#f5f5dc', ivory: '#fffff0', coral: '#ff7f50', burgundy: '#800020',
};

const resolveColor = (hex?: string, name?: string): string => {
  if (hex && hex.startsWith('#')) return hex;
  if (name) {
    const lower = name.toLowerCase().trim();
    if (COLOR_MAP[lower]) return COLOR_MAP[lower];
    // 혹시 hex처럼 생긴 값이 name에 들어온 경우도 처리
    if (/^#[0-9a-fA-F]{3,6}$/.test(lower)) return lower;
  }
  return '#888888';
};

const POSITION_LABELS: { [key: string]: string } = {
  '1': 'Thumb', '2': 'Index', '3': 'Middle', '4': 'Ring',
  '5': 'Pinky', '7': 'Web', '9': 'Inner',
};

const POSITION_LABELS_ZH: { [key: string]: string } = {
  '1': '拇指', '2': '食指', '3': '中指', '4': '无名指',
  '5': '小指', '7': '网兜', '9': '内侧',
};

const STANDARD_PART_LABELS_ZH: { [key: string]: string } = {
  'Wrist': '腕带', 'Welting': '边条', 'Lace': '皮绳', 'Bridge': '网兜桥',
  'Web': '网兜', 'Palm Shell': '掌心皮', 'Piping': '滚边',
};

type UILabels = {
  orderSheet: string; colorChanges: string; additionalRequests: string; allAsPerPhoto: string;
  logoPatch: string; bg: string; logo: string; gloveRefPhotos: string; noPhoto: string;
  fingerMap: string; gloveSpecs: string; sportLabel: string; handLabel: string; sizeLabel: string;
  positionLabel: string; webLabel: string; embroidery: string; nameLabel: string; flagLabel: string;
  noNameEmb: string; noFlagEmb: string; shipTo: string; messageToCraftsman: string; noMessage: string;
  confirmOrder: string; confirmed: string; pad: string; hood: string; inner: string;
};

const LABELS: { [lang: string]: UILabels } = {
  en: {
    orderSheet: 'ORDER SHEET', colorChanges: 'Color Changes', additionalRequests: 'Additional Requests',
    allAsPerPhoto: 'All As Per Reference Photo', logoPatch: 'Logo Patch', bg: 'BG', logo: 'Logo',
    gloveRefPhotos: 'Glove Reference Photos', noPhoto: 'No photo provided',
    fingerMap: 'Finger Add-ons & Embroidery Position Map', gloveSpecs: 'Glove Specs',
    sportLabel: 'Sport', handLabel: 'Hand', sizeLabel: 'Size', positionLabel: 'Position', webLabel: 'Web',
    embroidery: 'Embroidery', nameLabel: 'Name', flagLabel: 'Flag',
    noNameEmb: 'No name embroidery', noFlagEmb: 'No flag embroidery', shipTo: 'Ship To',
    messageToCraftsman: '✍️ Message to the Craftsman', noMessage: 'No message',
    confirmOrder: '✅ CONFIRM ORDER', confirmed: '✅ CONFIRMED', pad: 'PAD', hood: 'HOOD', inner: 'Inner',
  },
  zh: {
    orderSheet: '工作指示单', colorChanges: '颜色变更', additionalRequests: '其他要求',
    allAsPerPhoto: '完全按照参考照片', logoPatch: '徽标贴片', bg: '底色', logo: '徽标',
    gloveRefPhotos: '手套参考照片', noPhoto: '未提供照片',
    fingerMap: '手指附加件 & 刺绣位置图', gloveSpecs: '手套规格',
    sportLabel: '运动', handLabel: '惯用手', sizeLabel: '尺寸', positionLabel: '位置', webLabel: '网兜',
    embroidery: '刺绣', nameLabel: '姓名', flagLabel: '旗帜',
    noNameEmb: '无姓名刺绣', noFlagEmb: '无旗帜刺绣', shipTo: '收货地址',
    messageToCraftsman: '✍️ 给工匠的留言', noMessage: '无留言',
    confirmOrder: '✅ 确认订单', confirmed: '✅ 已确认', pad: '加垫', hood: '护罩', inner: '内侧',
  },
  ko: {
    orderSheet: '주문서', colorChanges: '컬러 변경', additionalRequests: '추가 요청사항',
    allAsPerPhoto: '참고 사진과 동일하게', logoPatch: '로고 패치', bg: '배경색', logo: '로고',
    gloveRefPhotos: '글러브 참고 사진', noPhoto: '제공된 사진 없음',
    fingerMap: '손가락 옵션 & 자수 위치도', gloveSpecs: '글러브 사양',
    sportLabel: '종목', handLabel: '사용손', sizeLabel: '사이즈', positionLabel: '포지션', webLabel: '웹',
    embroidery: '자수', nameLabel: '이름', flagLabel: '국기',
    noNameEmb: '이름 자수 없음', noFlagEmb: '국기 자수 없음', shipTo: '배송지',
    messageToCraftsman: '✍️ 장인에게 남기는 메시지', noMessage: '메시지 없음',
    confirmOrder: '✅ 주문 확정', confirmed: '✅ 확정 완료', pad: '패드', hood: '후드', inner: '내측',
  },
  ja: {
    orderSheet: '注文書', colorChanges: 'カラー変更', additionalRequests: 'その他のリクエスト',
    allAsPerPhoto: '参考写真の通り', logoPatch: 'ロゴパッチ', bg: '背景色', logo: 'ロゴ',
    gloveRefPhotos: 'グラブ参考写真', noPhoto: '写真未提供',
    fingerMap: '指オプション & 刺繍位置図', gloveSpecs: 'グラブ仕様',
    sportLabel: '種目', handLabel: '利き手', sizeLabel: 'サイズ', positionLabel: 'ポジション', webLabel: 'ウェブ',
    embroidery: '刺繍', nameLabel: '名前', flagLabel: '国旗',
    noNameEmb: '名前刺繍なし', noFlagEmb: '国旗刺繍なし', shipTo: '配送先',
    messageToCraftsman: '✍️ 職人へのメッセージ', noMessage: 'メッセージなし',
    confirmOrder: '✅ 注文を確定', confirmed: '✅ 確定済み', pad: 'パッド', hood: 'フード', inner: '内側',
  },
  es: {
    orderSheet: 'HOJA DE PEDIDO', colorChanges: 'Cambios de Color', additionalRequests: 'Solicitudes Adicionales',
    allAsPerPhoto: 'Igual a la foto de referencia', logoPatch: 'Parche de Logo', bg: 'Fondo', logo: 'Logo',
    gloveRefPhotos: 'Fotos de Referencia', noPhoto: 'Sin foto',
    fingerMap: 'Complementos y Mapa de Bordado', gloveSpecs: 'Especificaciones',
    sportLabel: 'Deporte', handLabel: 'Mano', sizeLabel: 'Talla', positionLabel: 'Posición', webLabel: 'Red',
    embroidery: 'Bordado', nameLabel: 'Nombre', flagLabel: 'Bandera',
    noNameEmb: 'Sin bordado de nombre', noFlagEmb: 'Sin bordado de bandera', shipTo: 'Enviar a',
    messageToCraftsman: '✍️ Mensaje para el Artesano', noMessage: 'Sin mensaje',
    confirmOrder: '✅ CONFIRMAR PEDIDO', confirmed: '✅ CONFIRMADO', pad: 'ALMOHADILLA', hood: 'CAPUCHA', inner: 'Interior',
  },
  fr: {
    orderSheet: 'BON DE COMMANDE', colorChanges: 'Changements de Couleur', additionalRequests: 'Demandes Additionnelles',
    allAsPerPhoto: 'Comme la photo de référence', logoPatch: 'Écusson Logo', bg: 'Fond', logo: 'Logo',
    gloveRefPhotos: 'Photos de Référence', noPhoto: 'Aucune photo',
    fingerMap: 'Options Doigts & Plan de Broderie', gloveSpecs: 'Caractéristiques',
    sportLabel: 'Sport', handLabel: 'Main', sizeLabel: 'Taille', positionLabel: 'Poste', webLabel: 'Toile',
    embroidery: 'Broderie', nameLabel: 'Nom', flagLabel: 'Drapeau',
    noNameEmb: 'Pas de broderie de nom', noFlagEmb: 'Pas de broderie de drapeau', shipTo: 'Livraison',
    messageToCraftsman: "✍️ Message à l'Artisan", noMessage: 'Aucun message',
    confirmOrder: '✅ CONFIRMER LA COMMANDE', confirmed: '✅ CONFIRMÉ', pad: 'COUSSINET', hood: 'CAPUCHE', inner: 'Intérieur',
  },
  de: {
    orderSheet: 'BESTELLBLATT', colorChanges: 'Farbänderungen', additionalRequests: 'Zusätzliche Wünsche',
    allAsPerPhoto: 'Wie auf dem Referenzfoto', logoPatch: 'Logo-Patch', bg: 'Hintergrund', logo: 'Logo',
    gloveRefPhotos: 'Referenzfotos', noPhoto: 'Kein Foto',
    fingerMap: 'Finger-Optionen & Stickposition', gloveSpecs: 'Spezifikationen',
    sportLabel: 'Sportart', handLabel: 'Hand', sizeLabel: 'Größe', positionLabel: 'Position', webLabel: 'Netz',
    embroidery: 'Stickerei', nameLabel: 'Name', flagLabel: 'Flagge',
    noNameEmb: 'Keine Namensstickerei', noFlagEmb: 'Keine Flaggenstickerei', shipTo: 'Lieferadresse',
    messageToCraftsman: '✍️ Nachricht an den Handwerker', noMessage: 'Keine Nachricht',
    confirmOrder: '✅ BESTELLUNG BESTÄTIGEN', confirmed: '✅ BESTÄTIGT', pad: 'POLSTER', hood: 'HAUBE', inner: 'Innen',
  },
  it: {
    orderSheet: 'FOGLIO ORDINE', colorChanges: 'Cambi Colore', additionalRequests: 'Richieste Aggiuntive',
    allAsPerPhoto: 'Come nella foto di riferimento', logoPatch: 'Patch Logo', bg: 'Sfondo', logo: 'Logo',
    gloveRefPhotos: 'Foto di Riferimento', noPhoto: 'Nessuna foto',
    fingerMap: 'Opzioni Dita & Mappa Ricamo', gloveSpecs: 'Specifiche',
    sportLabel: 'Sport', handLabel: 'Mano', sizeLabel: 'Misura', positionLabel: 'Posizione', webLabel: 'Web',
    embroidery: 'Ricamo', nameLabel: 'Nome', flagLabel: 'Bandiera',
    noNameEmb: 'Nessun ricamo del nome', noFlagEmb: 'Nessun ricamo della bandiera', shipTo: 'Spedizione',
    messageToCraftsman: "✍️ Messaggio all'Artigiano", noMessage: 'Nessun messaggio',
    confirmOrder: '✅ CONFERMA ORDINE', confirmed: '✅ CONFERMATO', pad: 'IMBOTTITURA', hood: 'CAPPUCCIO', inner: 'Interno',
  },
  nl: {
    orderSheet: 'BESTELFORMULIER', colorChanges: 'Kleurwijzigingen', additionalRequests: 'Extra Verzoeken',
    allAsPerPhoto: 'Volgens referentiefoto', logoPatch: 'Logo Patch', bg: 'Achtergrond', logo: 'Logo',
    gloveRefPhotos: "Referentiefoto's", noPhoto: 'Geen foto',
    fingerMap: 'Vingeropties & Borduurpositie', gloveSpecs: 'Specificaties',
    sportLabel: 'Sport', handLabel: 'Hand', sizeLabel: 'Maat', positionLabel: 'Positie', webLabel: 'Web',
    embroidery: 'Borduurwerk', nameLabel: 'Naam', flagLabel: 'Vlag',
    noNameEmb: 'Geen naamborduring', noFlagEmb: 'Geen vlagborduring', shipTo: 'Verzendadres',
    messageToCraftsman: '✍️ Bericht aan de Vakman', noMessage: 'Geen bericht',
    confirmOrder: '✅ BESTELLING BEVESTIGEN', confirmed: '✅ BEVESTIGD', pad: 'KUSSENTJE', hood: 'KAP', inner: 'Binnen',
  },
  th: {
    orderSheet: 'ใบสั่งซื้อ', colorChanges: 'การเปลี่ยนสี', additionalRequests: 'คำขอเพิ่มเติม',
    allAsPerPhoto: 'ตามภาพอ้างอิงทั้งหมด', logoPatch: 'แผ่นโลโก้', bg: 'พื้นหลัง', logo: 'โลโก้',
    gloveRefPhotos: 'ภาพอ้างอิงถุงมือ', noPhoto: 'ไม่มีภาพ',
    fingerMap: 'ตัวเลือกนิ้ว & แผนผังตำแหน่งปัก', gloveSpecs: 'สเปคถุงมือ',
    sportLabel: 'กีฬา', handLabel: 'มือที่ใช้', sizeLabel: 'ขนาด', positionLabel: 'ตำแหน่ง', webLabel: 'เว็บ',
    embroidery: 'ปักชื่อ', nameLabel: 'ชื่อ', flagLabel: 'ธง',
    noNameEmb: 'ไม่มีการปักชื่อ', noFlagEmb: 'ไม่มีการปักธง', shipTo: 'จัดส่งไปที่',
    messageToCraftsman: '✍️ ข้อความถึงช่างฝีมือ', noMessage: 'ไม่มีข้อความ',
    confirmOrder: '✅ ยืนยันคำสั่งซื้อ', confirmed: '✅ ยืนยันแล้ว', pad: 'แผ่นรอง', hood: 'ฮูด', inner: 'ด้านใน',
  },
  tl: {
    orderSheet: 'ORDER SHEET', colorChanges: 'Pagbabago ng Kulay', additionalRequests: 'Karagdagang Kahilingan',
    allAsPerPhoto: 'Ayon sa larawang sanggunian', logoPatch: 'Logo Patch', bg: 'Background', logo: 'Logo',
    gloveRefPhotos: 'Mga Larawang Sanggunian', noPhoto: 'Walang larawan',
    fingerMap: 'Mga Opsyon sa Daliri & Mapa ng Burda', gloveSpecs: 'Mga Detalye',
    sportLabel: 'Isports', handLabel: 'Kamay', sizeLabel: 'Sukat', positionLabel: 'Posisyon', webLabel: 'Web',
    embroidery: 'Burda', nameLabel: 'Pangalan', flagLabel: 'Bandila',
    noNameEmb: 'Walang burda ng pangalan', noFlagEmb: 'Walang burda ng bandila', shipTo: 'Ipadala sa',
    messageToCraftsman: '✍️ Mensahe para sa Manggagawa', noMessage: 'Walang mensahe',
    confirmOrder: '✅ KUMPIRMAHIN ANG ORDER', confirmed: '✅ NAKUMPIRMA', pad: 'PAD', hood: 'HOOD', inner: 'Loob',
  },
  pt: {
    orderSheet: 'FOLHA DE PEDIDO', colorChanges: 'Alterações de Cor', additionalRequests: 'Pedidos Adicionais',
    allAsPerPhoto: 'Tudo conforme a foto de referência', logoPatch: 'Emblema do Logo', bg: 'Fundo', logo: 'Logo',
    gloveRefPhotos: 'Fotos de Referência da Luva', noPhoto: 'Nenhuma foto fornecida',
    fingerMap: 'Acessórios de Dedo & Mapa de Bordado', gloveSpecs: 'Especificações da Luva',
    sportLabel: 'Esporte', handLabel: 'Mão', sizeLabel: 'Tamanho', positionLabel: 'Posição', webLabel: 'Rede',
    embroidery: 'Bordado', nameLabel: 'Nome', flagLabel: 'Bandeira',
    noNameEmb: 'Sem bordado de nome', noFlagEmb: 'Sem bordado de bandeira', shipTo: 'Enviar para',
    messageToCraftsman: '✍️ Mensagem para o Artesão', noMessage: 'Sem mensagem',
    confirmOrder: '✅ CONFIRMAR PEDIDO', confirmed: '✅ CONFIRMADO', pad: 'ALMOFADA', hood: 'CAPUZ', inner: 'Interno',
  },
};

function getLabels(lang?: string): UILabels {
  return LABELS[(lang || 'en').toLowerCase()] || LABELS.en;
}

// 국기 파일명 정규화: 소문자 + 공백 제거
function getFlagFile(country: string): string {
  return country.toLowerCase().replace(/\s+/g, '');
}

// 이름 자수 글자체 — 텍스트의 문자권(라틴/한글/일본어/중국어/태국어)과
// 고객이 선택한 스타일(필기체/블록체/우아한체)에 따라 폰트를 결정
type EmbroideryScript = 'latin' | 'ko' | 'ja' | 'zh' | 'th';
type EmbroideryStyle = 'script' | 'block' | 'elegant';

function detectEmbroideryScript(text: string): EmbroideryScript {
  if (/[가-힣]/.test(text)) return 'ko';
  if (/[぀-ヿ]/.test(text)) return 'ja';
  if (/[一-鿿]/.test(text)) return 'zh';
  if (/[ก-๿]/.test(text)) return 'th';
  return 'latin';
}

const EMBROIDERY_FONTS: Record<EmbroideryScript, Record<EmbroideryStyle, { fontFamily: string; fontWeight?: number; fontStyle?: string }>> = {
  latin: {
    script: { fontFamily: "'Brush Script MT', cursive", fontStyle: 'italic' },
    block: { fontFamily: "'Arial Black', Impact, sans-serif", fontWeight: 900 },
    elegant: { fontFamily: "'Times New Roman', Georgia, serif", fontStyle: 'italic' },
  },
  ko: {
    script: { fontFamily: "'Nanum Pen Script', cursive" },
    block: { fontFamily: "'Black Han Sans', sans-serif" },
    elegant: { fontFamily: "'Nanum Myeongjo', serif", fontWeight: 700 },
  },
  ja: {
    script: { fontFamily: "'Yuji Syuku', serif" },
    block: { fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 },
    elegant: { fontFamily: "'Noto Serif JP', serif", fontWeight: 700 },
  },
  zh: {
    script: { fontFamily: "'Ma Shan Zheng', cursive" },
    block: { fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900 },
    elegant: { fontFamily: "'Noto Serif SC', serif", fontWeight: 700 },
  },
  th: {
    script: { fontFamily: "'Mali', cursive" },
    block: { fontFamily: "'Kanit', sans-serif", fontWeight: 700 },
    elegant: { fontFamily: "'Charm', serif", fontWeight: 700 },
  },
};

function getEmbroideryFont(text: string, style?: EmbroideryStyle) {
  const script = detectEmbroideryScript(text);
  return EMBROIDERY_FONTS[script][style || 'script'];
}

function GNLogo({ bgColor, logoColor, width = 100, height = 61 }: {
  bgColor: string; logoColor: string; width?: number; height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="333 935 128 79"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block', overflow: 'visible' }}
    >
      <path
        d="M 0,0 V 35.572 H 95.38 V -0.006 L 47.598,-22.785 Z"
        fill={bgColor}
        transform="matrix(1.3333333,0,0,-1.3333333,333.26627,982.78693)"
      />
      <path
        d="m 0,0 h 6.684 l 21.591,-14.713 v 9.074 L 19.996,0 h 16.707 v -24.896 l -4.961,-2.36 -23.314,15.867 v -17.636 l 7.459,3.548 8.066,-5.496 L 0,-42.373 Z"
        fill={logoColor}
        transform="matrix(1.3333333,0,0,-1.3333333,402.80467,944.0708)"
      />
      <path
        d="m 0,0 v 24.885 h 36.498 v -8.43 H 8.426 V 5.313 l 19.648,-9.395 v 8.297 l -10.01,4.816 h 18.438 v -26.486 z"
        fill={logoColor}
        transform="matrix(1.3333333,0,0,-1.3333333,341.9564,977.26347)"
      />
    </svg>
  );
}

function ReferencePhotos({
  photos,
  fallback,
  selectedGlove,
  noPhotoLabel = 'No photo provided',
}: {
  photos?: { base64: string; type: string }[];
  fallback?: string;
  selectedGlove?: string;
  noPhotoLabel?: string;
}) {
  const imgs: React.ReactNode[] = [];

  if (photos && photos.length > 0) {
    photos.slice(0, 4).forEach((p, i) => {
      imgs.push(
        <img
          key={i}
          src={`data:${p.type};base64,${p.base64}`}
          alt={`ref ${i + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      );
    });
  } else if (fallback && fallback.trim() !== '') {
    // fallback: data URL, 절대경로(/gloves/...), 또는 상대경로
    const src = fallback.startsWith('data:') || fallback.startsWith('/')
      ? fallback
      : `/gloves/${fallback}`;
    imgs.push(
      <img
        key={0}
        src={src}
        alt="Glove"
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    );
  } else if (selectedGlove) {
    imgs.push(
      <img
        key={0}
        src={`/gloves/${selectedGlove}.jpg`}
        alt="Selected Glove"
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    );
  }

  const n = imgs.length;

  const containerBase: React.CSSProperties = {
    width: '100%',
    minHeight: '300px',
    display: 'grid',
    gridAutoRows: '1fr',
    gap: '3px',
    padding: '3px',
    background: '#f8f8f8',
    border: '0.5px solid #ddd',
    borderRadius: '4px',
    overflow: 'hidden',
  };

  if (n === 0) {
    return (
      <div style={{ ...containerBase, minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#ccc', fontSize: '12px' }}>
          <div style={{ fontSize: '32px', marginBottom: '6px' }}>🧤</div>
          {noPhotoLabel}
        </div>
      </div>
    );
  }
  if (n === 1) return <div style={{ ...containerBase, gridTemplateColumns: '1fr' }}>{imgs[0]}</div>;
  if (n === 2) return <div style={{ ...containerBase, gridTemplateColumns: '1fr 1fr' }}>{imgs}</div>;
  if (n === 3) {
    return (
      <div style={{ ...containerBase, gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ gridColumn: '1 / -1', overflow: 'hidden', borderRadius: '2px' }}>{imgs[0]}</div>
        <div style={{ overflow: 'hidden', borderRadius: '2px' }}>{imgs[1]}</div>
        <div style={{ overflow: 'hidden', borderRadius: '2px' }}>{imgs[2]}</div>
      </div>
    );
  }
  return (
    <div style={{ ...containerBase, gridTemplateColumns: '1fr 1fr' }}>
      {imgs.map((img, i) => (
        <div key={i} style={{ overflow: 'hidden', borderRadius: '2px' }}>{img}</div>
      ))}
    </div>
  );
}

export default function OrderSheet({
  orderData,
  onConfirm,
  variant = 'customer',
}: {
  orderData: OrderData;
  onConfirm: () => void;
  variant?: 'customer' | 'factory';
}) {
  const [confirmed, setConfirmed] = React.useState(false);
  const isFactory = variant === 'factory';
  const t = getLabels(isFactory ? 'zh' : orderData.customer_language);
  const posLabels = isFactory ? POSITION_LABELS_ZH : POSITION_LABELS;
  const pick = (val?: string, valZh?: string) => (isFactory && valZh ? valZh : (val || ''));
  const partLabel = (en: string) => (isFactory ? (STANDARD_PART_LABELS_ZH[en] || en) : en);

  const handleConfirm = () => {
    if (confirmed) return;
    setConfirmed(true);
    onConfirm();
  };

  const bgColor = resolveColor(orderData.logo?.background_hex, orderData.logo?.background);
  const logoColor = resolveColor(orderData.logo?.logo_color_hex, orderData.logo?.logo_color);

  // order_id: 서버에서 오거나, 없으면 프론트에서 임시 생성
  const orderId = orderData.order_id || `GN-${Date.now().toString().slice(-6)}`;

  const flagCountry = orderData.embroidery?.flag?.country || '';
  const flagFile = getFlagFile(flagCountry);

  // ── color_changes 분류 ──────────────────────────────────────────
  const STANDARD_PARTS = ['wrist', 'shell', 'welting', 'lace', 'bridge', 'web', 'palm shell', 'palm_shell', 'piping'];

  const allColorChanges = orderData.color_changes?.filter(c => c.part || c.color) || [];

  const fingerPadIndex  = allColorChanges.find(c => c.part?.toLowerCase().includes('finger pad') && c.part?.toLowerCase().includes('index'));
  const fingerPadMiddle = allColorChanges.find(c => c.part?.toLowerCase().includes('finger pad') && c.part?.toLowerCase().includes('middle'));
  const fingerHood      = allColorChanges.find(c => c.part?.toLowerCase().includes('finger hood'));

  const isStructuredChange = (c: { part: string }) => {
    const p = c.part.toLowerCase();
    return STANDARD_PARTS.some(sp => p === sp || p.includes(sp))
      || p.includes('finger pad')
      || p.includes('finger hood');
  };

  const structuredChanges = allColorChanges.filter(isStructuredChange);
  const freeformChanges   = allColorChanges.filter(c => !isStructuredChange(c));

  // ── colors 객체에서 유효한 항목만 추출 ──────────────────────────
  const colorParts = [
    { part: 'Wrist',      value: pick(orderData.colors?.wrist || orderData.colors?.shell, orderData.colors?.wrist_zh), hex: orderData.colors?.wrist_hex },
    { part: 'Welting',    value: pick(orderData.colors?.welting, orderData.colors?.welting_zh),       hex: orderData.colors?.welting_hex },
    { part: 'Lace',       value: pick(orderData.colors?.lace, orderData.colors?.lace_zh),             hex: orderData.colors?.lace_hex },
    { part: 'Bridge',     value: pick(orderData.colors?.bridge, orderData.colors?.bridge_zh),         hex: orderData.colors?.bridge_hex },
    { part: 'Web',        value: pick(orderData.colors?.web, orderData.colors?.web_zh),               hex: orderData.colors?.web_hex },
    { part: 'Palm Shell', value: pick(orderData.colors?.palm_shell, orderData.colors?.palm_shell_zh), hex: orderData.colors?.palm_shell_hex },
    { part: 'Piping',     value: pick(orderData.colors?.piping, orderData.colors?.piping_zh),         hex: orderData.colors?.piping_hex },
  ].filter(({ value }) => value && value.trim() !== '');

  const hasStructured = colorParts.length > 0 || structuredChanges.length > 0;
  const hasFreeform   = freeformChanges.length > 0;

  const specs = [
    [t.sportLabel,    `${orderData.sport || '-'} · ${orderData.player_type || '-'}`],
    [t.handLabel,     orderData.hand || '-'],
    [t.sizeLabel,     orderData.size ? `${orderData.size}"` : '-'],
    [t.positionLabel, orderData.position || '-'],
    [t.webLabel,      pick(orderData.web_type, orderData.web_type_zh) || '-'],
  ];

  const shellColor = resolveColor(orderData.colors?.wrist_hex, orderData.colors?.wrist || orderData.colors?.shell);

  const fingerPositions = [
    { n: '1', label: 'Thumb',  cx: 35,  cy: 36 },
    { n: '2', label: 'Index',  cx: 95,  cy: 22 },
    { n: '3', label: 'Middle', cx: 158, cy: 16 },
    { n: '4', label: 'Ring',   cx: 220, cy: 22 },
    { n: '5', label: 'Pinky',  cx: 280, cy: 34 },
    { n: '7', label: 'Web',    cx: 340, cy: 34 },
  ];

  return (
    <div
      className="gn-order-sheet print:p-2"
      style={{
        background: 'white',
        color: '#111',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        maxWidth: '760px',
        minWidth: '760px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '10px',
        borderBottom: '2px solid #111',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <GNLogo bgColor={bgColor} logoColor={logoColor} width={100} height={61} />
          <div>
            <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '4px', whiteSpace: 'nowrap' }}>GN GLOVE</div>
            <div style={{ fontSize: '9px', color: '#888', letterSpacing: '2px', whiteSpace: 'nowrap' }}>KOREAN CRAFT · CUSTOM ORDER</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '2px', whiteSpace: 'nowrap' }}>{t.orderSheet}</div>
          <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '3px', color: '#b8922a', whiteSpace: 'nowrap' }}>{orderId}</div>
          <div style={{ fontSize: '9px', color: '#aaa', marginTop: '2px', whiteSpace: 'nowrap' }}>
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── COLOR CHANGES + LOGO PATCH ─────────────────────────── */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '12px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
            {t.colorChanges}
          </div>

          {!hasStructured && !hasFreeform ? (
            <div style={{ fontSize: '11px', color: '#aaa', fontStyle: 'italic' }}>{t.allAsPerPhoto}</div>
          ) : (
            <div style={{ display: 'flex', gap: '16px' }}>
              {hasStructured && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {colorParts.map(({ part, value, hex }) => (
                    <div key={part} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '3px',
                        border: '0.5px solid #ccc',
                        background: resolveColor(hex, value),
                      }} />
                      <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '3px', textTransform: 'capitalize' }}>{value}</div>
                      <div style={{ fontSize: '8px', color: '#aaa' }}>{partLabel(part)}</div>
                    </div>
                  ))}
                  {structuredChanges.map((change, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '3px',
                        border: '0.5px solid #ccc',
                        background: resolveColor(change.hex || change.swatch, change.color),
                      }} />
                      <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '3px', textTransform: 'capitalize' }}>{pick(change.color, change.color_zh)}</div>
                      <div style={{ fontSize: '8px', color: '#aaa', maxWidth: '60px', wordBreak: 'break-word' }}>{pick(change.part, change.part_zh)}</div>
                    </div>
                  ))}
                </div>
              )}

              {hasStructured && hasFreeform && (
                <div style={{ width: '0.5px', background: '#e0e0e0', alignSelf: 'stretch', flexShrink: 0 }} />
              )}

              {hasFreeform && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '4px', fontWeight: 700 }}>{t.additionalRequests}</div>
                  {freeformChanges.map((change, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '6px',
                      marginBottom: '4px', fontSize: '10px', color: '#333',
                    }}>
                      <span style={{ color: '#b8922a', fontWeight: 700, flexShrink: 0 }}>→</span>
                      <span>
                        <span style={{ fontWeight: 700 }}>{pick(change.part, change.part_zh)}</span>
                        {change.color && <span style={{ color: '#555' }}> : {pick(change.color, change.color_zh)}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
            {t.logoPatch}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GNLogo bgColor={bgColor} logoColor={logoColor} width={65} height={40} />
            <div style={{ fontSize: '10px', lineHeight: 1.9 }}>
              <div>{t.bg}: <strong style={{ textTransform: 'capitalize' }}>{pick(orderData.logo?.background, orderData.logo?.background_zh) || '-'}</strong></div>
              <div>{t.logo}: <strong style={{ color: logoColor, textTransform: 'capitalize' }}>{pick(orderData.logo?.logo_color, orderData.logo?.logo_color_zh) || '-'}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid #ddd', marginBottom: '12px' }} />

      {/* ── MAIN BODY ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '16px' }}>

        {/* LEFT */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>

          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
              {t.gloveRefPhotos}
            </div>
            <ReferencePhotos
              photos={orderData.reference_photos}
              fallback={orderData.reference_photo}
              selectedGlove={orderData.selected_glove}
              noPhotoLabel={t.noPhoto}
            />
          </div>

          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
              {t.fingerMap}
            </div>
            <svg
              width="100%"
              height="110"
              viewBox="0 0 420 110"
              xmlns="http://www.w3.org/2000/svg"
              style={{ border: '0.5px solid #eee', borderRadius: '3px', background: '#fafafa' }}
            >
              {fingerPositions.map((p) => {
                const nameLocation = orderData.embroidery?.name?.location;
                const flagLocation = orderData.embroidery?.flag?.location;
                const isNameEmb = nameLocation === p.n;
                const isFlagEmb = flagLocation === p.n;
                const isEmb = isNameEmb || isFlagEmb;

                let padColor: string | null = null;
                if (p.n === '2' && fingerPadIndex)  padColor = resolveColor(fingerPadIndex.hex, fingerPadIndex.color);
                if (p.n === '3' && fingerPadMiddle) padColor = resolveColor(fingerPadMiddle.hex, fingerPadMiddle.color);
                const hasHood = p.n === '2' && !!fingerHood;

                return (
                  <g key={p.n}>
                    <circle
                      cx={p.cx} cy={p.cy} r={17}
                      fill={padColor || (isEmb ? '#fef9c3' : '#f0f0f0')}
                      stroke={padColor ? '#555' : isEmb ? '#f0c040' : '#bbb'}
                      strokeWidth={padColor || isEmb ? 1.5 : 1}
                    />
                    <text x={p.cx} y={p.cy - 2} textAnchor="middle" fontSize={10} fill={padColor ? '#fff' : '#333'} fontWeight={700}>{p.n}</text>
                    <text x={p.cx} y={p.cy + 9}  textAnchor="middle" fontSize={7}  fill={padColor ? '#eee' : '#666'}>{posLabels[p.n] || p.label}</text>
                    {isNameEmb && <text x={p.cx} y={p.cy - 20} textAnchor="middle" fontSize={8} fill="#b8922a" fontWeight={700}>✍</text>}
                    {isFlagEmb && <text x={p.cx} y={p.cy - 20} textAnchor="middle" fontSize={8} fill="#b8922a" fontWeight={700}>🏁</text>}
                    {padColor  && <text x={p.cx} y={p.cy - 20} textAnchor="middle" fontSize={7} fill="#555"   fontWeight={700}>{t.pad}</text>}
                    {hasHood && (
                      <g>
                        <path
                          d={`M ${p.cx - 10},${p.cy - 17} A 10,10 0 0,1 ${p.cx + 10},${p.cy - 17}`}
                          fill={shellColor} stroke="#555" strokeWidth={1}
                        />
                        <text x={p.cx} y={p.cy - 22} textAnchor="middle" fontSize={6} fill="#555" fontWeight={700}>{t.hood}</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 9번 Inner 바 */}
              {(() => {
                const nameAt9 = orderData.embroidery?.name?.location === '9';
                const flagAt9 = orderData.embroidery?.flag?.location === '9';
                const highlight = nameAt9 || flagAt9;
                return (
                  <>
                    <rect x={2} y={90} width={414} height={18} rx={3}
                      fill={highlight ? '#fef9c3' : '#fff9e6'}
                      stroke={highlight ? '#f0c040' : '#e0e0e0'}
                      strokeWidth={0.5}
                    />
                    <text x={8} y={103} fontSize={9} fill="#555" fontWeight={700}>{`9 - ${t.inner}:`}</text>
                    {nameAt9 && (() => {
                      const f = getEmbroideryFont(orderData.embroidery.name.text, orderData.embroidery.name.font_style);
                      return (
                        <text x={72} y={103} fontSize={13}
                          fill={resolveColor(orderData.embroidery.name.color_hex, orderData.embroidery.name.color)}
                          fontStyle={f.fontStyle || 'normal'} fontWeight={f.fontWeight} fontFamily={f.fontFamily}
                        >
                          {orderData.embroidery.name.text}
                        </text>
                      );
                    })()}
                  </>
                );
              })()}

              {/* Finger add-on 요약 바 */}
              {(fingerPadIndex || fingerPadMiddle || fingerHood) && (
                <g>
                  <rect x={2} y={72} width={414} height={14} rx={2} fill="#f0f0f0" />
                  {fingerPadIndex  && <text x={8}   y={82} fontSize={7} fill="#333">{`${t.pad}(${posLabels['2']}): ${pick(fingerPadIndex.color, fingerPadIndex.color_zh)}`}</text>}
                  {fingerPadMiddle && <text x={fingerPadIndex ? 160 : 8} y={82} fontSize={7} fill="#333">{`${t.pad}(${posLabels['3']}): ${pick(fingerPadMiddle.color, fingerPadMiddle.color_zh)}`}</text>}
                  {fingerHood      && <text x={(fingerPadIndex || fingerPadMiddle) ? 320 : 8} y={82} fontSize={7} fill="#333">{`${t.hood}(shell)`}</text>}
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ width: '215px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
              {t.gloveSpecs}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {specs.map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                    <td style={{ color: '#999', padding: '4px 0', width: '60px', fontSize: '11px' }}>{label}</td>
                    <td style={{ fontWeight: 700, padding: '4px 0', fontSize: '11px', textTransform: 'capitalize' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
              {t.embroidery}
            </div>

            {/* 이름 자수 */}
            {orderData.embroidery?.name?.text ? (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '4px' }}>① {t.nameLabel}</div>
                <div style={{
                  ...getEmbroideryFont(orderData.embroidery.name.text, orderData.embroidery.name.font_style),
                  fontSize: '28px',
                  color: resolveColor(orderData.embroidery.name.color_hex, orderData.embroidery.name.color),
                  background: '#f5f5f5', padding: '4px 12px', borderRadius: '3px',
                  display: 'inline-block', letterSpacing: '1px',
                }}>
                  {orderData.embroidery.name.text}
                </div>
                <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px', textTransform: 'capitalize' }}>
                  {pick(orderData.embroidery.name.color, orderData.embroidery.name.color_zh)} · #{orderData.embroidery.name.location} {posLabels[orderData.embroidery.name.location] || ''}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#ccc', fontStyle: 'italic', marginBottom: '8px' }}>{t.noNameEmb}</div>
            )}

            {/* 국기 자수 */}
            {flagCountry ? (
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '6px' }}>② {t.flagLabel}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={`/flags/${flagFile}.png`}
                    alt={flagCountry}
                    style={{ width: '64px', height: '43px', objectFit: 'cover', border: '0.5px solid #ccc', borderRadius: '2px' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'capitalize' }}>{flagCountry}</div>
                    <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>
                      #{orderData.embroidery.flag.location} {posLabels[orderData.embroidery.flag.location] || ''}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#ccc', fontStyle: 'italic' }}>{t.noFlagEmb}</div>
            )}
          </div>

          {/* 배송지 */}
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
              {t.shipTo}
            </div>
            <div style={{ fontSize: '11px', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{orderData.customer?.name || '-'}</div>
              <div style={{ color: '#555', whiteSpace: 'pre-line' }}>{orderData.customer?.address || '-'}</div>
              {orderData.customer?.phone && <div style={{ color: '#555', marginTop: '4px' }}>{orderData.customer.phone}</div>}
              {orderData.customer?.email && <div style={{ color: '#555' }}>{orderData.customer.email}</div>}
            </div>
          </div>

          {/* 장인 메시지 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
              {t.messageToCraftsman}
            </div>
            <div style={{
              background: '#fffdf0', border: '0.5px solid #f0e08a',
              borderRadius: '4px', padding: '8px', fontSize: '11px',
              color: '#555', lineHeight: 1.7, flex: 1,
            }}>
              {pick(orderData.special_requests, orderData.special_requests_zh)
                ? pick(orderData.special_requests, orderData.special_requests_zh)
                : <span style={{ color: '#ccc', fontStyle: 'italic' }}>{t.noMessage}</span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <div style={{
        marginTop: '12px', textAlign: 'center', fontSize: '9px',
        color: '#ccc', letterSpacing: '1px',
        borderTop: '0.5px solid #eee', paddingTop: '8px',
      }}>
        GN GLOVE · WE MAKE IT. YOU PLAY IT. · 30dayglove.com
      </div>

      {/* ── CONFIRM BUTTON ─────────────────────────────────────── */}
      <div id="confirm-btn-area" className="print:hidden">
        <button
          onClick={handleConfirm}
          disabled={confirmed}
          style={{
            width: '100%',
            background: confirmed ? '#555' : '#111',
            color: 'white',
            border: 'none',
            padding: '13px',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '3px',
            borderRadius: '6px',
            cursor: confirmed ? 'not-allowed' : 'pointer',
            marginTop: '14px',
            opacity: confirmed ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          {confirmed ? t.confirmed : t.confirmOrder}
        </button>
      </div>
    </div>
  );
}
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
    wrist?: string; wrist_hex?: string;
    welting?: string; welting_hex?: string;
    lace?: string; lace_hex?: string;
    bridge?: string; bridge_hex?: string;
    web?: string; web_hex?: string;
    palm_shell?: string; palm_shell_hex?: string;
    piping?: string; piping_hex?: string;
    shell?: string; palm?: string;
  };
  color_changes?: { part: string; color: string; hex?: string; swatch?: string }[];
  embroidery: {
    name: { text: string; color: string; color_hex?: string; location: string };
    flag: { country: string; location: string };
  };
  logo: {
    background: string; background_hex?: string;
    logo_color: string; logo_color_hex?: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  special_requests: string;
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

// 국기 파일명 정규화: 소문자 + 공백 제거
function getFlagFile(country: string): string {
  return country.toLowerCase().replace(/\s+/g, '');
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
}: {
  photos?: { base64: string; type: string }[];
  fallback?: string;
  selectedGlove?: string;
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
    display: 'grid',
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
          No photo provided
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
}: {
  orderData: OrderData;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = React.useState(false);

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
    { part: 'Wrist',      value: orderData.colors?.wrist || orderData.colors?.shell, hex: orderData.colors?.wrist_hex },
    { part: 'Welting',    value: orderData.colors?.welting,    hex: orderData.colors?.welting_hex },
    { part: 'Lace',       value: orderData.colors?.lace,       hex: orderData.colors?.lace_hex },
    { part: 'Bridge',     value: orderData.colors?.bridge,     hex: orderData.colors?.bridge_hex },
    { part: 'Web',        value: orderData.colors?.web,        hex: orderData.colors?.web_hex },
    { part: 'Palm Shell', value: orderData.colors?.palm_shell, hex: orderData.colors?.palm_shell_hex },
    { part: 'Piping',     value: orderData.colors?.piping,     hex: orderData.colors?.piping_hex },
  ].filter(({ value }) => value && value.trim() !== '');

  const hasStructured = colorParts.length > 0 || structuredChanges.length > 0;
  const hasFreeform   = freeformChanges.length > 0;

  const specs = [
    ['Sport',    `${orderData.sport || '-'} · ${orderData.player_type || '-'}`],
    ['Hand',     orderData.hand || '-'],
    ['Size',     orderData.size ? `${orderData.size}"` : '-'],
    ['Position', orderData.position || '-'],
    ['Web',      orderData.web_type || '-'],
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
      className="print:p-2"
      style={{
        background: 'white',
        color: '#111',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        maxWidth: '760px',
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
            <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '4px' }}>GN GLOVE</div>
            <div style={{ fontSize: '9px', color: '#888', letterSpacing: '2px' }}>KOREAN CRAFT · CUSTOM ORDER</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '2px' }}>ORDER SHEET</div>
          <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '3px', color: '#b8922a' }}>{orderId}</div>
          <div style={{ fontSize: '9px', color: '#aaa', marginTop: '2px' }}>
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── COLOR CHANGES + LOGO PATCH ─────────────────────────── */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '12px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
            Color Changes
          </div>

          {!hasStructured && !hasFreeform ? (
            <div style={{ fontSize: '11px', color: '#aaa', fontStyle: 'italic' }}>All As Per Reference Photo</div>
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
                      <div style={{ fontSize: '8px', color: '#aaa' }}>{part}</div>
                    </div>
                  ))}
                  {structuredChanges.map((change, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '3px',
                        border: '0.5px solid #ccc',
                        background: resolveColor(change.hex || change.swatch, change.color),
                      }} />
                      <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '3px', textTransform: 'capitalize' }}>{change.color}</div>
                      <div style={{ fontSize: '8px', color: '#aaa', maxWidth: '60px', wordBreak: 'break-word' }}>{change.part}</div>
                    </div>
                  ))}
                </div>
              )}

              {hasStructured && hasFreeform && (
                <div style={{ width: '0.5px', background: '#e0e0e0', alignSelf: 'stretch', flexShrink: 0 }} />
              )}

              {hasFreeform && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '4px', fontWeight: 700 }}>Additional Requests</div>
                  {freeformChanges.map((change, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '6px',
                      marginBottom: '4px', fontSize: '10px', color: '#333',
                    }}>
                      <span style={{ color: '#b8922a', fontWeight: 700, flexShrink: 0 }}>→</span>
                      <span>
                        <span style={{ fontWeight: 700 }}>{change.part}</span>
                        {change.color && <span style={{ color: '#555' }}> : {change.color}</span>}
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
            Logo Patch
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GNLogo bgColor={bgColor} logoColor={logoColor} width={65} height={40} />
            <div style={{ fontSize: '10px', lineHeight: 1.9 }}>
              <div>BG: <strong style={{ textTransform: 'capitalize' }}>{orderData.logo?.background || '-'}</strong></div>
              <div>Logo: <strong style={{ color: logoColor, textTransform: 'capitalize' }}>{orderData.logo?.logo_color || '-'}</strong></div>
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
              Glove Reference Photos
            </div>
            <ReferencePhotos
              photos={orderData.reference_photos}
              fallback={orderData.reference_photo}
              selectedGlove={orderData.selected_glove}
            />
          </div>

          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
              Finger Add-ons & Embroidery Position Map
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
                    <text x={p.cx} y={p.cy + 9}  textAnchor="middle" fontSize={7}  fill={padColor ? '#eee' : '#666'}>{p.label}</text>
                    {isNameEmb && <text x={p.cx} y={p.cy - 20} textAnchor="middle" fontSize={8} fill="#b8922a" fontWeight={700}>✍</text>}
                    {isFlagEmb && <text x={p.cx} y={p.cy - 20} textAnchor="middle" fontSize={8} fill="#b8922a" fontWeight={700}>🏁</text>}
                    {padColor  && <text x={p.cx} y={p.cy - 20} textAnchor="middle" fontSize={7} fill="#555"   fontWeight={700}>PAD</text>}
                    {hasHood && (
                      <g>
                        <path
                          d={`M ${p.cx - 10},${p.cy - 17} A 10,10 0 0,1 ${p.cx + 10},${p.cy - 17}`}
                          fill={shellColor} stroke="#555" strokeWidth={1}
                        />
                        <text x={p.cx} y={p.cy - 22} textAnchor="middle" fontSize={6} fill="#555" fontWeight={700}>HOOD</text>
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
                    <text x={8} y={103} fontSize={9} fill="#555" fontWeight={700}>9 - Inner:</text>
                    {nameAt9 && (
                      <text x={72} y={103} fontSize={13}
                        fill={resolveColor(orderData.embroidery.name.color_hex, orderData.embroidery.name.color)}
                        fontStyle="italic" fontFamily="Georgia, serif"
                      >
                        {orderData.embroidery.name.text}
                      </text>
                    )}
                  </>
                );
              })()}

              {/* Finger add-on 요약 바 */}
              {(fingerPadIndex || fingerPadMiddle || fingerHood) && (
                <g>
                  <rect x={2} y={72} width={414} height={14} rx={2} fill="#f0f0f0" />
                  {fingerPadIndex  && <text x={8}   y={82} fontSize={7} fill="#333">{`PAD(Index): ${fingerPadIndex.color}`}</text>}
                  {fingerPadMiddle && <text x={fingerPadIndex ? 160 : 8} y={82} fontSize={7} fill="#333">{`PAD(Middle): ${fingerPadMiddle.color}`}</text>}
                  {fingerHood      && <text x={(fingerPadIndex || fingerPadMiddle) ? 320 : 8} y={82} fontSize={7} fill="#333">HOOD(shell)</text>}
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ width: '215px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
              Glove Specs
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
              Embroidery
            </div>

            {/* 이름 자수 */}
            {orderData.embroidery?.name?.text ? (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '4px' }}>① Name</div>
                <div style={{
                  fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '28px',
                  color: resolveColor(orderData.embroidery.name.color_hex, orderData.embroidery.name.color),
                  background: '#f5f5f5', padding: '4px 12px', borderRadius: '3px',
                  display: 'inline-block', letterSpacing: '1px',
                }}>
                  {orderData.embroidery.name.text}
                </div>
                <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px', textTransform: 'capitalize' }}>
                  {orderData.embroidery.name.color} · #{orderData.embroidery.name.location} {POSITION_LABELS[orderData.embroidery.name.location] || ''}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#ccc', fontStyle: 'italic', marginBottom: '8px' }}>No name embroidery</div>
            )}

            {/* 국기 자수 */}
            {flagCountry ? (
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '6px' }}>② Flag</div>
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
                      #{orderData.embroidery.flag.location} {POSITION_LABELS[orderData.embroidery.flag.location] || ''}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#ccc', fontStyle: 'italic' }}>No flag embroidery</div>
            )}
          </div>

          {/* 배송지 */}
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '0.5px solid #e5e5e5', paddingBottom: '3px', marginBottom: '6px' }}>
              Ship To
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
              ✍️ Message to the Craftsman
            </div>
            <div style={{
              background: '#fffdf0', border: '0.5px solid #f0e08a',
              borderRadius: '4px', padding: '8px', fontSize: '11px',
              color: '#555', lineHeight: 1.7, flex: 1,
            }}>
              {orderData.special_requests
                ? orderData.special_requests
                : <span style={{ color: '#ccc', fontStyle: 'italic' }}>No message</span>
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
          {confirmed ? '✅ CONFIRMED' : '✅ CONFIRM ORDER'}
        </button>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';

type Category = 'classic' | 'gelato' | 'unique';

const POSITIONS: Record<string, string> = {
  infield: 'Infield',
  pitcher: 'Pitcher',
  outfield: 'Outfield',
  catcher: 'Catcher',
  first: 'First Base',
};

function parseGlove(id: string) {
  const parts = id.split('_');
  const color = parts[0].replace(/-/g, ' · ');
  const size = parts[1] ? `${parts[1]}"` : '';
  const posRaw = parts[2] || '';
  const position = Object.keys(POSITIONS).find(p => posRaw.toLowerCase().includes(p)) || 'other';
  return { color, size, position, label: `${color} ${size}` };
}

export default function CatalogPage() {
  const [category, setCategory] = useState<Category>('classic');
  const [position, setPosition] = useState<string | null>(null);
  const [gloves, setGloves] = useState<Record<Category, string[]>>({ classic: [], gelato: [], unique: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gloves')
      .then(r => r.json())
      .then(data => {
        setGloves(data);
        setLoading(false);
      });
  }, []);

  const availablePositions = [...new Set(
    gloves[category].map(id => parseGlove(id).position).filter(p => p !== 'other')
  )];

  const filtered = gloves[category].filter(id => {
    if (!position) return true;
    return parseGlove(id).position === position;
  });

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat);
    setPosition(null);
  };

  return (
    <main style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>GN Glove Catalog</h1>
      <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>Select a glove to start customizing</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['classic', 'gelato', 'unique'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            style={{
              padding: '6px 18px',
              borderRadius: '20px',
              border: 'none',
              background: category === cat ? '#111' : '#eee',
              color: category === cat ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              textTransform: 'capitalize',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {!loading && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPosition(null)}
            style={{
              padding: '5px 14px',
              borderRadius: '20px',
              border: '1px solid #ddd',
              background: position === null ? '#f0a500' : '#fff',
              color: position === null ? '#fff' : '#555',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            All
          </button>
          {availablePositions.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              style={{
                padding: '5px 14px',
                borderRadius: '20px',
                border: '1px solid #ddd',
                background: position === pos ? '#f0a500' : '#fff',
                color: position === pos ? '#fff' : '#555',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {POSITIONS[pos] || pos}
            </button>
          ))}
        </div>
      )}

      {!loading && (
        <p style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>
          {filtered.length} gloves found
        </p>
      )}

      {loading ? (
        <p style={{ color: '#999' }}>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {filtered.map((id) => {
            const { label } = parseGlove(id);
            return (
              <div
                key={id}
                style={{ border: '1px solid #e0e0e0', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                onClick={() => {
                  const confirmed = window.confirm(`Start ordering this glove?\n\n${label}\nCategory: ${category}`);
                  if (confirmed) {
                    sessionStorage.setItem('selectedGlove', JSON.stringify({ id, category, label }));
                    window.location.href = '/';
                  }
                }}
              >
                <img
                  src={`/gloves/${category}/${id}.jpg`}
                  alt={label}
                  style={{ width: '100%', height: '180px', objectFit: 'cover', background: '#f5f5f5' }}
                />
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>{label}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#888', textTransform: 'capitalize' }}>{category}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const baseDir = path.join(process.cwd(), 'public', 'gloves');
  const categories = ['classic', 'gelato', 'unique'];
  
  const result: Record<string, string[]> = {};
  
  for (const cat of categories) {
    const catDir = path.join(baseDir, cat);
    if (fs.existsSync(catDir)) {
      const files = fs.readdirSync(catDir)
        .filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'))
        .map(f => f.replace(/\.(jpg|png|webp)$/, ''));
      result[cat] = files;
    } else {
      result[cat] = [];
    }
  }
  
  return NextResponse.json(result);
}
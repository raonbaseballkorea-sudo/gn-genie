import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image (estimated from base64 length)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 10, 60_000)) {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }

    const { images } = await req.json();

    if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGES) {
      return NextResponse.json({ error: 'Invalid image count' }, { status: 400 });
    }

    for (const img of images) {
      if (!img || typeof img.base64 !== 'string' || !ALLOWED_TYPES.includes(img.type)) {
        return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
      }
      const estimatedSize = (img.base64.length * 3) / 4;
      if (estimatedSize > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Image too large' }, { status: 400 });
      }
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'gloves', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const savedFiles: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const { base64 } = images[i];
      const buffer = Buffer.from(base64, 'base64');

      // 500x500 흰색 여백으로 비율 유지 변환
      const converted = await sharp(buffer)
        .resize(500, 500, {
          fit: 'contain',       // 비율 유지, 잘리지 않음
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // 흰색 여백
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      const filename = `upload_${Date.now()}_${i}.jpg`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, converted);
      savedFiles.push(`uploads/${filename}`);
    }

    return NextResponse.json({ success: true, files: savedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
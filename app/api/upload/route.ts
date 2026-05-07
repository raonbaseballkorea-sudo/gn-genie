import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json();

    const uploadsDir = path.join(process.cwd(), 'public', 'gloves', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const savedFiles: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const { base64, type } = images[i];
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
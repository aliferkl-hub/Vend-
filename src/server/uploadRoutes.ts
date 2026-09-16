import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateUser, AuthRequest } from '../middleware/auth.ts';

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

// Helper to ensure upload dir exists
function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Allowed MIME types and their extensions
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Check binary buffer magic bytes
function isValidImageBuffer(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  const normalized = mimeType.toLowerCase();

  // JPEG magic bytes: FF D8 FF
  if (normalized.includes('jpeg') || normalized.includes('jpg')) {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (normalized.includes('png')) {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  // WEBP magic bytes: RIFF .... WEBP
  if (normalized.includes('webp')) {
    const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
    const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
    return isRiff && isWebp;
  }

  return false;
}

function processAndSaveImage(rawBase64: string, requestedMime?: string): {
  url: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
} {
  ensureUploadsDir();

  let mimeType = requestedMime || 'image/jpeg';
  let base64Data = rawBase64;

  // Extract mime from data URL if present
  if (rawBase64.startsWith('data:')) {
    const matches = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1].toLowerCase();
      base64Data = matches[2];
    }
  }

  mimeType = mimeType.toLowerCase();
  const ext = MIME_TO_EXT[mimeType];
  if (!ext) {
    throw new Error('Formato inválido. Os formatos aceitos são JPG, JPEG, PNG e WEBP.');
  }

  const buffer = Buffer.from(base64Data, 'base64');

  // Maximum 15MB
  if (buffer.length > 15 * 1024 * 1024) {
    throw new Error('Imagem muito pesada. O tamanho máximo permitido é 15MB.');
  }

  // Validate magic bytes
  if (!isValidImageBuffer(buffer, mimeType)) {
    throw new Error('Arquivo de imagem corrompido ou formato incompatível.');
  }

  // Unique filename
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const fileName = `vend_${timestamp}_${randomSuffix}${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  fs.writeFileSync(filePath, buffer);

  return {
    url: `/uploads/${fileName}`,
    fileName,
    sizeBytes: buffer.length,
    mimeType,
  };
}

// POST /api/upload - Single or batch image upload
router.post('/', authenticateUser, (req: AuthRequest, res) => {
  try {
    const { imageBase64, mimeType, images } = req.body;

    // Batch upload support
    if (Array.isArray(images) && images.length > 0) {
      if (images.length > 10) {
        return res.status(400).json({ error: 'Limite de até 10 fotos por upload excedido.' });
      }

      const uploadedResults = [];
      for (const item of images) {
        if (!item.imageBase64) continue;
        const result = processAndSaveImage(item.imageBase64, item.mimeType);
        uploadedResults.push({
          ...result,
          type: item.type || 'gallery',
          position: item.position ?? uploadedResults.length,
        });
      }

      return res.json({
        success: true,
        count: uploadedResults.length,
        images: uploadedResults,
        message: `${uploadedResults.length} foto(s) enviada(s) com sucesso.`,
      });
    }

    // Single image upload
    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma foto selecionada para envio.' });
    }

    const saved = processAndSaveImage(imageBase64, mimeType);

    return res.json({
      success: true,
      url: saved.url,
      fileName: saved.fileName,
      sizeBytes: saved.sizeBytes,
      mimeType: saved.mimeType,
      message: 'Foto adicionada com sucesso.',
    });
  } catch (err: any) {
    console.error('Upload error:', err.message);
    return res.status(400).json({ error: err.message || 'Erro ao processar upload da foto.' });
  }
});

export default router;

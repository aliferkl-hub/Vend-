// Image optimization, validation, and compression utilities for VEND+

export interface ProcessedImageResult {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  previewUrl: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Validates file format and size
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Nenhum arquivo selecionado.' };
  }

  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const isAllowedExt =
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp');

  if (!ALLOWED_MIME_TYPES.includes(mime) && !isAllowedExt) {
    return {
      valid: false,
      error: 'Formato não suportado. Por favor, envie fotos nos formatos JPG, JPEG, PNG ou WEBP.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'A imagem é muito grande. O tamanho máximo permitido é 15MB.',
    };
  }

  return { valid: true };
}

/**
 * Optimizes an image using HTML5 Canvas:
 * - Maintains original aspect ratio without distortion or stretching
 * - Resizes if dimensions exceed maxWidth / maxHeight (e.g. 1600px)
 * - Compresses with high visual fidelity (quality 0.85)
 * - Converts to optimized WebP (or JPEG fallback)
 */
export async function optimizeImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<ProcessedImageResult> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.85 } = options;

  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem do dispositivo.'));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () =>
        reject(new Error('Arquivo corrompido ou imagem ilegível. Selecione outra foto.'));

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          return reject(new Error('Dimensões da imagem inválidas.'));
        }

        // Calculate proportional scale preserving exact aspect ratio
        let targetWidth = width;
        let targetHeight = height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          targetWidth = Math.round(width * ratio);
          targetHeight = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Falha ao inicializar renderizador de imagem.'));
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // White background for transparent PNGs converted to JPEG/WEBP
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Draw image keeping exact proportions
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Try WebP first for optimal compression
        let mimeType = 'image/webp';
        let dataUrl = '';

        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            // WebP not supported, fallback to JPEG
            mimeType = 'image/jpeg';
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          mimeType = 'image/jpeg';
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Base64 without data prefix
        const base64Data = dataUrl.split(',')[1] || dataUrl;

        // Approximate byte size of base64
        const optimizedSize = Math.round((base64Data.length * 3) / 4);

        resolve({
          base64: base64Data,
          mimeType,
          width: targetWidth,
          height: targetHeight,
          originalSize: file.size,
          optimizedSize,
          previewUrl: dataUrl,
        });
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an optimized photo to the backend /api/upload endpoint
 * Returns the permanent /uploads/vend_... URL
 */
export async function uploadImageToStorage(
  file: File,
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
  options?: { type?: string; position?: number }
): Promise<{
  url: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  previewUrl: string;
}> {
  // 1. Optimize on client
  const optimized = await optimizeImage(file);

  // 2. Post to /api/upload
  const res = await authFetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: optimized.base64,
      mimeType: optimized.mimeType,
      type: options?.type || 'gallery',
      position: options?.position ?? 0,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Falha ao enviar foto para o servidor.');
  }

  const result = await res.json();

  return {
    url: result.url,
    fileName: result.fileName,
    sizeBytes: result.sizeBytes || optimized.optimizedSize,
    mimeType: result.mimeType || optimized.mimeType,
    previewUrl: optimized.previewUrl,
  };
}

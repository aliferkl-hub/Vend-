import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Validate image payload (Base64 / data URI)
router.post('/', requireAuth, (req: AuthRequest, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({
        error: 'Formato inválido. Os formatos aceitos são JPG, JPEG, PNG e WEBP.',
      });
    }

    // Check size (max 5MB in base64 string)
    if (imageBase64.length > 7 * 1024 * 1024) {
      return res.status(400).json({
        error: 'Imagem muito pesada. O tamanho máximo permitido é 5MB.',
      });
    }

    let fullDataUrl = imageBase64;
    if (!fullDataUrl.startsWith('data:')) {
      fullDataUrl = `data:${mimeType};base64,${imageBase64}`;
    }

    return res.json({
      url: fullDataUrl,
      message: 'Imagem validada e processada com sucesso!',
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Erro ao processar upload da imagem.' });
  }
});

export default router;

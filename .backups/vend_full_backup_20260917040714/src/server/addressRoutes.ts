import { Router } from 'express';
import { db } from '../db/index.ts';
import { addresses } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = Router();

// LIST ADDRESSES
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const list = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

    return res.json(list);
  } catch (err) {
    console.error('List addresses error:', err);
    return res.status(500).json({ error: 'Erro ao carregar endereços.' });
  }
});

// CREATE ADDRESS
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const {
      recipientName,
      phone,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      postalCode,
      isDefault = false,
    } = req.body;

    if (!recipientName || !phone || !street || !number || !neighborhood || !city || !state || !postalCode) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios do endereço devem ser preenchidos.' });
    }

    if (isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
    }

    const [newAddress] = await db
      .insert(addresses)
      .values({
        userId: user.id,
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        street: street.trim(),
        number: number.trim(),
        complement: complement ? complement.trim() : null,
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        postalCode: postalCode.trim(),
        isDefault: Boolean(isDefault),
      })
      .returning();

    return res.status(201).json({ message: 'Endereço salvo com sucesso!', address: newAddress });
  } catch (err) {
    console.error('Create address error:', err);
    return res.status(500).json({ error: 'Erro ao salvar endereço.' });
  }
});

export default router;

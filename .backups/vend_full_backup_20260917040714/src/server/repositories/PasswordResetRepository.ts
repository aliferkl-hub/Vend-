import crypto from 'crypto';
import { db, persistDatabase } from '../../db/index.ts';
import { passwordResets, users } from '../../db/schema.ts';
import { eq, and, isNull } from 'drizzle-orm';
import { AuthDatabase } from './AuthDatabase.ts';

const TOKEN_EXPIRY_HOURS = 1;

export class PasswordResetRepository {
  /**
   * Hashes a token using SHA-256 to ensure no plaintext tokens are stored in the database
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Gera um token de recuperação seguro de uso único para o usuário
   */
  static async createResetToken(userId: number, email: string, ipAddress?: string) {
    try {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

      await db.insert(passwordResets).values({
        userId,
        token: rawToken.substring(0, 16) + '...', // safe masked token for logging reference
        tokenHash,
        expiresAt,
        usedAt: null,
        ipAddress: ipAddress || null,
        createdAt: new Date(),
      });

      persistDatabase();

      console.log(`[PASSWORD RESET] Token de recuperação gerado para o usuário id: ${userId}`);

      return { rawToken, expiresAt };
    } catch (err: any) {
      console.error(`[PASSWORD RESET ERROR] Falha ao criar token de recuperação:`, err.message);
      throw err;
    }
  }

  /**
   * Valida e consome o token de uso único.
   * Retorna o ID do usuário se for válido e não expirado/já utilizado.
   */
  static async consumeToken(rawToken: string): Promise<number | null> {
    if (!rawToken || typeof rawToken !== 'string') {
      return null;
    }

    try {
      const tokenHash = this.hashToken(rawToken.trim());

      const rows = await db
        .select()
        .from(passwordResets)
        .where(eq(passwordResets.tokenHash, tokenHash))
        .limit(1);

      if (rows.length === 0) {
        console.log('[PASSWORD RESET] Token não encontrado.');
        return null;
      }

      const reset = rows[0];

      // Check if already used
      if (reset.usedAt) {
        console.log('[PASSWORD RESET] Token já foi utilizado.');
        return null;
      }

      // Check expiration
      const expiry = new Date(reset.expiresAt).getTime();
      const now = Date.now();
      if (expiry < now) {
        console.log('[PASSWORD RESET] Token expirado.');
        return null;
      }

      // Mark token as consumed
      await db
        .update(passwordResets)
        .set({ usedAt: new Date() })
        .where(eq(passwordResets.id, reset.id));

      persistDatabase();

      return reset.userId;
    } catch (err: any) {
      console.error('[PASSWORD RESET ERROR] Falha ao validar token:', err.message);
      return null;
    }
  }
}

export default PasswordResetRepository;

import { pool } from '../db/index.ts';

/**
 * Ensures default Growth, Affiliate and Platform Settings exist in app_settings.
 */
export async function ensureGrowthAndAffiliateTables(): Promise<void> {
  try {
    const defaultSettings = [
      { key: 'platform_commission_percent', value: '7', description: 'Comissão padrão retida pelo VEND+ nas transações (%)' },
      { key: 'default_affiliate_commission_percent', value: '10', description: 'Comissão padrão do afiliado por venda quando o produto não customiza (%)' },
      { key: 'affiliate_attribution_model', value: 'LAST_CLICK', description: 'Modelo de atribuição de comissão de afiliado (LAST_CLICK)' },
      { key: 'affiliate_cookie_days', value: '30', description: 'Validade do clique de atribuição do afiliado em dias' },
      { key: 'affiliate_min_payout_cents', value: '5000', description: 'Valor mínimo em centavos para solicitação de repasse via PIX (R$ 50,00)' },
      { key: 'affiliate_prevent_self_referral', value: 'true', description: 'Impede o afiliado de receber comissão comprando com seu próprio link' },
    ];

    for (const setting of defaultSettings) {
      await pool.query(`
        INSERT INTO app_settings (key, value, description, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (key) DO NOTHING;
      `, [setting.key, setting.value, setting.description]);
    }

    console.log('[Growth] Módulos de Growth, Afiliados, Hub e Configurações ativos no VEND+.');
  } catch (err: any) {
    console.warn('[Growth] Nota de inicialização de Growth:', err.message);
  }
}

import bcrypt from 'bcryptjs';
import { db, persistDatabase } from '../db/index.ts';
import { users, profiles, categories, plans } from '../db/schema.ts';
import { eq, count } from 'drizzle-orm';
import { UserRepository } from './repositories/UserRepository.ts';
import { removeLegacyDemoData } from './demoDataCleanup.ts';

export async function initializeDatabaseSeed() {
  try {
    const existingCats = await db.select({ count: count() }).from(categories);
    if (Number(existingCats[0]?.count || 0) === 0) {
      const defaultCategories = [
        { name: 'Celulares e Telefonia', slug: 'celulares', icon: 'Smartphone', description: 'Smartphones, smartwatches e acessórios' },
        { name: 'Informática e Escritório', slug: 'informatica', icon: 'Laptop', description: 'Notebooks, computadores, monitores e periféricos' },
        { name: 'Eletrônicos e Áudio', slug: 'eletronicos', icon: 'Tv', description: 'Smart TVs, fones de ouvido, caixas de som e home theater' },
        { name: 'Games e Consoles', slug: 'games', icon: 'Gamepad2', description: 'PlayStation, Xbox, Nintendo, jogos e controles' },
        { name: 'Ferramentas e Máquinas', slug: 'ferramentas', icon: 'Wrench', description: 'Parafusadeiras, furadeiras, kits manuais e elétricos' },
        { name: 'Relógios e Acessórios', slug: 'relogios', icon: 'Watch', description: 'Smartwatches esportivos, relógios analógicos e pulseiras' },
        { name: 'Eletrodomésticos', slug: 'eletrodomesticos', icon: 'Coffee', description: 'Cafeteiras, fritadeiras air fryer, liquidificadores e micro-ondas' },
        { name: 'Pet Shop e Cuidados', slug: 'pet', icon: 'Dog', description: 'Rações premium, brinquedos, caminhas e acessórios pet' },
        { name: 'Serviços Especializados', slug: 'servicos', icon: 'Briefcase', description: 'Técnicos, eletricistas, instaladores e manutenção profissional' },
        { name: 'Moda e Calçados', slug: 'moda', icon: 'Shirt', description: 'Roupas, tênis, bolsas e vestuário masculino e feminino' },
        { name: 'Casa e Decoração', slug: 'casa', icon: 'Home', description: 'Móveis, iluminação, organização e decoração de interiores' },
        { name: 'Automotivo e Peças', slug: 'automotivo', icon: 'Car', description: 'Acessórios automotivos, som, ferramentas e cuidados para carros' },
      ];
      for (const category of defaultCategories) await db.insert(categories).values(category);
      console.log('[VEND+] Categorias padrão inseridas.');
    }

    const existingPlans = await db.select({ count: count() }).from(plans);
    if (Number(existingPlans[0]?.count || 0) === 0) {
      const defaultPlans = [
        { name: 'Gratuito', slug: 'free', priceCents: 0, maxActiveListings: 5, commissionPercent: 7, features: JSON.stringify(['Até 5 anúncios ativos', 'Taxa de 7% por venda', 'Recebimento seguro', 'Suporte padrão']), status: 'ACTIVE' },
        { name: 'Básico', slug: 'basico', priceCents: 2990, maxActiveListings: 25, commissionPercent: 5, features: JSON.stringify(['Até 25 anúncios ativos', 'Taxa reduzida de 5%', 'Destaque nas buscas locais', 'Suporte prioritário via WhatsApp']), status: 'ACTIVE' },
        { name: 'Premium', slug: 'premium', priceCents: 6990, maxActiveListings: 100, commissionPercent: 4, features: JSON.stringify(['Até 100 anúncios ativos', 'Taxa de apenas 4%', 'Selo Loja Verificada', 'Painel analítico avançado']), status: 'ACTIVE' },
        { name: 'Lendário', slug: 'lendario', priceCents: 14990, maxActiveListings: 99999, commissionPercent: 3, features: JSON.stringify(['Anúncios ILIMITADOS', 'Menor taxa da plataforma: 3%', 'Criação de Loja Virtual com IA', 'Gestor de conta exclusivo']), status: 'ACTIVE' },
      ];
      for (const plan of defaultPlans) await db.insert(plans).values(plan);
      console.log('[VEND+] Planos padrão inseridos.');
    }

    await UserRepository.ensureMasterOwner();
    const masterEmail = (process.env.MASTER_OWNER_EMAIL || 'alifergael76@gmail.com').trim().toLowerCase();
    const existingMaster = await db.select().from(users).where(eq(users.email, masterEmail)).limit(1);

    const quickAdminEmail = 'admin@vendplus.com';
    if (masterEmail !== quickAdminEmail) {
      const existingQuickAdmin = await db.select().from(users).where(eq(users.email, quickAdminEmail)).limit(1);
      if (existingQuickAdmin.length === 0) {
        const passwordHash = await bcrypt.hash('VendMaster2025!', await bcrypt.genSalt(10));
        const [quickAdmin] = await db.insert(users).values({
          uid: 'vend_admin_quick_001',
          username: 'admin',
          email: quickAdminEmail,
          normalizedEmail: quickAdminEmail,
          passwordHash,
          name: 'Administrador VEND+',
          phone: '(11) 98888-0000',
          location: 'São Paulo, SP',
          role: 'MASTER_OWNER',
          status: 'ACTIVE',
          planSlug: 'lendario',
          emailVerified: true,
        }).returning();
        await db.insert(profiles).values({
          userId: quickAdmin.id,
          bio: 'Conta administrativa do VEND+',
        });
      } else if (existingQuickAdmin[0].role !== 'MASTER_OWNER') {
        await db.update(users).set({ role: 'MASTER_OWNER' }).where(eq(users.id, existingQuickAdmin[0].id));
      }
    }

    const removedDemoData = await removeLegacyDemoData();
    if (Object.values(removedDemoData).some((value) => value > 0)) {
      console.log('[VEND+] Dados demo legados removidos com preservação de histórico.', removedDemoData);
    }

    // No demo stores, supplier fixtures, products, services or images are seeded.
    persistDatabase();
  } catch (err) {
    console.error('[VEND+] Seed initialization check:', err);
  }
}
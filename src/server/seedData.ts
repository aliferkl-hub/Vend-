import bcrypt from 'bcryptjs';
import { db, persistDatabase } from '../db/index.ts';
import { users, profiles, categories, plans, products, services, stores } from '../db/schema.ts';
import { eq, count } from 'drizzle-orm';
import { UserRepository } from './repositories/UserRepository.ts';

export async function initializeDatabaseSeed() {
  try {
    // 0. Ensure Categories exist
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
      for (const cat of defaultCategories) {
        await db.insert(categories).values(cat);
      }
      console.log('[VEND+] Categorias padrão inseridas.');
    }

    // 0.1. Ensure Plans exist
    const existingPlans = await db.select({ count: count() }).from(plans);
    if (Number(existingPlans[0]?.count || 0) === 0) {
      const defaultPlans = [
        {
          name: 'Gratuito',
          slug: 'free',
          priceCents: 0,
          maxActiveListings: 5,
          commissionPercent: 7,
          features: JSON.stringify(['Até 5 anúncios ativos', 'Taxa de 7% por venda', 'Recebimento seguro', 'Suporte padrão']),
          status: 'ACTIVE',
        },
        {
          name: 'Básico',
          slug: 'basico',
          priceCents: 2990,
          maxActiveListings: 25,
          commissionPercent: 5,
          features: JSON.stringify(['Até 25 anúncios ativos', 'Taxa reduzida de 5%', 'Destaque nas buscas locais', 'Suporte prioritário via WhatsApp']),
          status: 'ACTIVE',
        },
        {
          name: 'Premium',
          slug: 'premium',
          priceCents: 6990,
          maxActiveListings: 100,
          commissionPercent: 4,
          features: JSON.stringify(['Até 100 anúncios ativos', 'Taxa de apenas 4%', 'Selo Loja Verificada', 'Painel analítico avançado']),
          status: 'ACTIVE',
        },
        {
          name: 'Lendário',
          slug: 'lendario',
          priceCents: 14990,
          maxActiveListings: 99999,
          commissionPercent: 3,
          features: JSON.stringify(['Anúncios ILIMITADOS', 'Menor taxa da plataforma: 3%', 'Criação de Loja Virtual com IA', 'Gestor de conta exclusivo']),
          status: 'ACTIVE',
        },
      ];
      for (const pl of defaultPlans) {
        await db.insert(plans).values(pl);
      }
      console.log('[VEND+] Planos padrão inseridos.');
    }

    // 1. Check & ensure Master Owner via official ensureMasterOwner()
    await UserRepository.ensureMasterOwner();

    const masterEmail = (process.env.MASTER_OWNER_EMAIL || 'alifergael76@gmail.com').trim().toLowerCase();
    const existingMaster = await db.select().from(users).where(eq(users.email, masterEmail)).limit(1);
    let masterUserId: number = existingMaster[0]?.id || 1;

    // Ensure secondary administrator account exists without duplication
    const quickAdminEmail = 'admin@vendplus.com';
    if (masterEmail !== quickAdminEmail) {
      const existingQuickAdmin = await db.select().from(users).where(eq(users.email, quickAdminEmail)).limit(1);
      if (existingQuickAdmin.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('VendMaster2025!', salt);
        const [qUser] = await db
          .insert(users)
          .values({
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
          })
          .returning();
        await db.insert(profiles).values({
          userId: qUser.id,
          bio: 'Conta de Demonstração Administrativa VEND+',
        });
      } else {
        if (existingQuickAdmin[0].role !== 'MASTER_OWNER') {
          await db.update(users).set({ role: 'MASTER_OWNER' }).where(eq(users.id, existingQuickAdmin[0].id));
        }
      }
    }

    // 2. Check if products exist; if 0, seed curated demonstration products with accurate images
    const [{ productCount }] = await db.select({ productCount: count() }).from(products);
    if (Number(productCount) === 0) {
      // Get category map
      const allCats = await db.select().from(categories);
      const catMap = new Map(allCats.map((c) => [c.slug, c.id]));

      // Create a demo store
      let demoStoreId: number | null = null;
      const [demoStore] = await db
        .insert(stores)
        .values({
          userId: masterUserId,
          name: 'VEND+ Eletro & Tech Local',
          slug: 'vend-eletro-tech',
          category: 'Eletrônicos',
          location: 'São Paulo, SP',
          phone: '(11) 98888-1234',
          description: 'Loja oficial parceira de eletrônicos, celulares e informática na sua cidade.',
          offersDelivery: true,
          offersPickup: true,
        })
        .returning();
      demoStoreId = demoStore.id;

      // Curated Demo Products with 100% accurate, high-quality Unsplash image URLs matching the exact item:
      const demoProducts = [
        {
          name: 'Smartphone Galaxy S23 Ultra 256GB Preto Phantom',
          slug: 'smartphone-galaxy-s23-ultra-256gb-demo',
          description: 'Smartphone topo de linha com câmera de 200MP, caneta S-Pen integrada e processador Snapdragon 8 Gen 2. Acompanha carregador e nota fiscal.',
          categorySlug: 'celulares',
          condition: 'NOVO',
          priceCents: 429900, // R$ 4.299,00
          originalPriceCents: 549900,
          stock: 3,
          location: 'São Paulo, SP',
          imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true,
        },
        {
          name: 'Notebook Dell Inspiron 15 Intel Core i7 16GB SSD 512GB',
          slug: 'notebook-dell-inspiron-15-i7-demo',
          description: 'Notebook de alta performance para trabalho, programação e estudos. Tela Full HD antirreflexo, bateria duradoura e teclado retroiluminado.',
          categorySlug: 'informatica',
          condition: 'USADO',
          priceCents: 285000, // R$ 2.850,00
          originalPriceCents: 390000,
          stock: 1,
          location: 'São Paulo, SP',
          imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true,
        },
        {
          name: 'Smart TV 50 Polegadas 4K UHD HDR com Comando de Voz',
          slug: 'smart-tv-50-polegadas-4k-demo',
          description: 'Televisor inteligente com qualidade de imagem ultra vívida, sistema ágil com Netflix, YouTube, Prime Video e conexão Bluetooth.',
          categorySlug: 'eletronicos',
          condition: 'NOVO',
          priceCents: 199900, // R$ 1.999,00
          originalPriceCents: 249900,
          stock: 4,
          location: 'São Paulo, SP',
          imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: false,
        },
        {
          name: 'Console PlayStation 5 Edição Digital com 2 Controles DualSense',
          slug: 'console-ps5-digital-2-controles-demo',
          description: 'Console de última geração com SSD ultrarrápido, áudio 3D imersivo e gráficos em até 120 FPS. Pouco tempo de uso, em perfeito estado.',
          categorySlug: 'games',
          condition: 'USADO',
          priceCents: 319000, // R$ 3.190,00
          originalPriceCents: 380000,
          stock: 1,
          location: 'São Paulo, SP',
          imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80',
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true,
        },
        {
          name: 'Furadeira e Parafusadeira de Impacto a Bateria 18V com Maleta',
          slug: 'furadeira-parafusadeira-impacto-18v-demo',
          description: 'Kit completo de ferramentas profissionais para manutenção, marcenaria e montagem. Inclui 2 baterias de lítio, carregador bivolt e brocas.',
          categorySlug: 'ferramentas',
          condition: 'NOVO',
          priceCents: 38900, // R$ 389,00
          originalPriceCents: 45000,
          stock: 8,
          location: 'São Paulo, SP',
          imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true,
        },
        {
          name: 'Relógio Smartwatch Pro com Monitor Cardíaco e GPS Integrado',
          slug: 'relogio-smartwatch-pro-gps-demo',
          description: 'Relógio esportivo e casual com display AMOLED, resistência à água 5ATM, monitoramento de sono, oxigenação do sangue e notificações.',
          categorySlug: 'relogios',
          condition: 'NOVO',
          priceCents: 27900, // R$ 279,00
          originalPriceCents: 35000,
          stock: 6,
          location: 'São Paulo, SP',
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true,
        },
        {
          name: 'Cafeteira Espresso Automática 15 Bar em Aço Inox',
          slug: 'cafeteira-espresso-automatica-demo',
          description: 'Cafeteira para pó ou sachês, com bico vaporizador para leite e cappuccino cremoso. Design compacto e sofisticado para sua cozinha.',
          categorySlug: 'eletrodomesticos',
          condition: 'NOVO',
          priceCents: 54900, // R$ 549,00
          originalPriceCents: 69900,
          stock: 2,
          location: 'São Paulo, SP',
          imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop&q=80',
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: true,
        },
        {
          name: 'Ração Premium para Cães Adultos Frango e Arroz 15kg',
          slug: 'racao-premium-caes-15kg-demo',
          description: 'Alimento completo e balanceado para cães de médio e grande porte. Rica em ômega 3 e 6, sem corantes artificiais.',
          categorySlug: 'pet',
          condition: 'NOVO',
          priceCents: 18900, // R$ 189,00
          originalPriceCents: 22000,
          stock: 12,
          location: 'São Paulo, SP',
          imageUrl: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&auto=format&fit=crop&q=80',
          offersDelivery: true,
          offersPickup: true,
          allowsNegotiation: false,
        },
      ];

      for (const p of demoProducts) {
        const catId = catMap.get(p.categorySlug) || allCats[0].id;
        await db.insert(products).values({
          sellerId: masterUserId,
          storeId: demoStoreId,
          name: p.name,
          slug: p.slug,
          description: p.description,
          categoryId: catId,
          condition: p.condition,
          priceCents: p.priceCents,
          originalPriceCents: p.originalPriceCents,
          stock: p.stock,
          location: p.location,
          offersDelivery: p.offersDelivery,
          offersPickup: p.offersPickup,
          allowsNegotiation: p.allowsNegotiation,
          status: 'ACTIVE',
          imageUrl: p.imageUrl,
          isDemo: true, // Clearly marked as demonstration data (Section 48)
        });
      }

      // Demo Services
      const demoServices = [
        {
          name: 'Instalação e Manutenção de Ar-Condicionado e Elétrica Residencial',
          slug: 'instalacao-ar-condicionado-eletrica-demo',
          description: 'Técnico certificado para higienização, recarga de gás, reparos elétricos e instalação de ar condicionado split.',
          categorySlug: 'servicos',
          priceCents: 15000, // a partir de R$ 150,00
          priceType: 'STARTING_AT',
          location: 'São Paulo, SP',
          imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
        },
        {
          name: 'Formatação, Limpeza e Manutenção Preventiva de Computadores e Notebooks',
          slug: 'formatacao-manutencao-pc-notebook-demo',
          description: 'Assistência técnica especializada em hardware e software. Troca de pasta térmica, upgrade para SSD e remoção de vírus.',
          categorySlug: 'servicos',
          priceCents: 12000, // a partir de R$ 120,00
          priceType: 'STARTING_AT',
          location: 'São Paulo, SP',
          imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80',
        },
      ];

      for (const s of demoServices) {
        const catId = catMap.get(s.categorySlug) || allCats[0].id;
        await db.insert(services).values({
          providerId: masterUserId,
          name: s.name,
          slug: s.slug,
          description: s.description,
          categoryId: catId,
          priceCents: s.priceCents,
          priceType: s.priceType,
          location: s.location,
          status: 'ACTIVE',
          imageUrl: s.imageUrl,
          isDemo: true,
        });
      }

      console.log('[VEND+] Catálogo inicial de demonstração (marcado como isDemo) inserido com sucesso.');
    }

    // Ensure all seeded records are persisted to disk immediately
    persistDatabase();
  } catch (err) {
    console.error('[VEND+] Seed initialization check:', err);
  }
}

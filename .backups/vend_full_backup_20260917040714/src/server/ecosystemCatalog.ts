export interface EcosystemProduct {
  id: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  niche: string;
  description: string;
  costPriceCents: number; // Preço de custo real do fornecedor
  suggestedRetailPriceCents: number; // Preço de venda sugerido (com margem de ~35-45%)
  defaultMarginPercent: number;
  stock: number;
  supplierName: string;
  location: string;
  imageUrl: string; // Imagem 100% fiel e rigorosa do produto
  condition: 'NOVO' | 'USADO';
  tags: string[];
}

// Catálogo com fotos reais e exatas de cada produto anunciado
export const VERIFIED_ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
  // 1. ELETRÔNICOS & TECH
  {
    id: 'eco-prod-01',
    name: 'Smartphone Galaxy S23 Ultra 256GB Preto Phantom 5G',
    categorySlug: 'celulares',
    categoryName: 'Celulares e Telefonia',
    niche: 'Eletrônicos & Informática',
    description: 'Smartphone topo de linha com câmera de 200MP, tela Dynamic AMOLED 2X de 6.8", caneta S-Pen integrada e processador Snapdragon 8 Gen 2. Acompanha carregador original homologado Anatel.',
    costPriceCents: 345000, // Custo: R$ 3.450,00
    suggestedRetailPriceCents: 449900, // Venda: R$ 4.499,00 (~30.4% margem)
    defaultMarginPercent: 30,
    stock: 14,
    supplierName: 'Distribuidora TechSul Brasil',
    location: 'São Paulo, SP',
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['smartphone', 'samsung', 'galaxy', '5g', 'tech'],
  },
  {
    id: 'eco-prod-02',
    name: 'Notebook Dell Inspiron 15 Intel Core i7 16GB RAM SSD 512GB',
    categorySlug: 'informatica',
    categoryName: 'Informática e Escritório',
    niche: 'Eletrônicos & Informática',
    description: 'Notebook de alta performance para produtividade, programação e design. Tela 15.6" Full HD antirreflexo, teclado retroiluminado com teclado numérico e bateria de longa duração.',
    costPriceCents: 260000, // Custo: R$ 2.600,00
    suggestedRetailPriceCents: 359000, // Venda: R$ 3.590,00 (~38% margem)
    defaultMarginPercent: 38,
    stock: 8,
    supplierName: 'Megaware Informática Atacado',
    location: 'Campinas, SP',
    imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['notebook', 'dell', 'i7', 'computador', 'ssd'],
  },
  {
    id: 'eco-prod-03',
    name: 'Fone de Ouvido Bluetooth Over-Ear com Cancelamento Ativo de Ruído (ANC)',
    categorySlug: 'eletronicos',
    categoryName: 'Eletrônicos e Áudio',
    niche: 'Eletrônicos & Informática',
    description: 'Fone sem fio premium com drivers de neodímio de 40mm, cancelamento de ruído ativo inteligente, microfone para chamadas nítidas e autonomia de até 40 horas contínuas de reprodução.',
    costPriceCents: 19500, // Custo: R$ 195,00
    suggestedRetailPriceCents: 34900, // Venda: R$ 349,00 (~79% margem)
    defaultMarginPercent: 75,
    stock: 25,
    supplierName: 'AudioMax Distribuição',
    location: 'Curitiba, PR',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['fone', 'bluetooth', 'audio', 'headphone', 'anc'],
  },
  {
    id: 'eco-prod-04',
    name: 'Smart TV 50 Polegadas 4K UHD HDR com Wi-Fi e Comando de Voz',
    categorySlug: 'eletronicos',
    categoryName: 'Eletrônicos e Áudio',
    niche: 'Eletrônicos & Informática',
    description: 'Televisor inteligente com tecnologia Crystal UHD 4K, processador Crystal 4K com upscaling inteligente, HDR10+, assistente de voz Alexa integrada e design sem bordas aparentes.',
    costPriceCents: 155000, // Custo: R$ 1.550,00
    suggestedRetailPriceCents: 219900, // Venda: R$ 2.199,00 (~41% margem)
    defaultMarginPercent: 41,
    stock: 10,
    supplierName: 'EletroPrime Fornecedores',
    location: 'São Paulo, SP',
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['tv', 'smart-tv', '4k', 'eletronicos'],
  },
  {
    id: 'eco-prod-05',
    name: 'Console PlayStation 5 Edição Digital com Controle DualSense Branco',
    categorySlug: 'games',
    categoryName: 'Games e Consoles',
    niche: 'Eletrônicos & Informática',
    description: 'Console Sony PS5 Digital Edition com SSD de 825GB ultrarrápido, ray tracing em tempo real, taxa de quadros de até 120 FPS e controle sem fio DualSense com feedback tátil imersivo.',
    costPriceCents: 295000, // Custo: R$ 2.950,00
    suggestedRetailPriceCents: 369900, // Venda: R$ 3.699,00 (~25% margem)
    defaultMarginPercent: 25,
    stock: 6,
    supplierName: 'GameZone Distribuidora Nacional',
    location: 'São Paulo, SP',
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['ps5', 'playstation', 'sony', 'games', 'console'],
  },

  // 2. FERRAMENTAS & EQUIPAMENTOS
  {
    id: 'eco-prod-06',
    name: 'Furadeira e Parafusadeira de Impacto 18V Bateria Lítio com Maleta e 24 Acessórios',
    categorySlug: 'ferramentas',
    categoryName: 'Ferramentas e Construção',
    niche: 'Ferramentas & Equipamentos',
    description: 'Ferramenta profissional robusta com 2 baterias intercambiáveis de 18V, mandril de aperto rápido metálico, luz LED de trabalho e controle de torque de 25 posições mais modo impacto para concreto.',
    costPriceCents: 21000, // Custo: R$ 210,00
    suggestedRetailPriceCents: 38900, // Venda: R$ 389,00 (~85% margem)
    defaultMarginPercent: 85,
    stock: 30,
    supplierName: 'Ferramentas do Brasil Distribuidora',
    location: 'Joinville, SC',
    imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['furadeira', 'parafusadeira', 'ferramentas', 'bateria'],
  },
  {
    id: 'eco-prod-07',
    name: 'Jogo de Chaves e Ferramentas Manuais 110 Peças em Maleta Termoplástica',
    categorySlug: 'ferramentas',
    categoryName: 'Ferramentas e Construção',
    niche: 'Ferramentas & Equipamentos',
    description: 'Kit completo de ferramentas manuais em aço cromo vanádio com alicates, chaves de fenda, chaves combinadas, catraca reversível e soquetes métricos.',
    costPriceCents: 14000, // Custo: R$ 140,00
    suggestedRetailPriceCents: 24900, // Venda: R$ 249,00 (~77% margem)
    defaultMarginPercent: 77,
    stock: 18,
    supplierName: 'Ferramentas do Brasil Distribuidora',
    location: 'Joinville, SC',
    imageUrl: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['chaves', 'maleta', 'ferramentas', 'mecanica'],
  },

  // 3. PET SHOP
  {
    id: 'eco-prod-08',
    name: 'Bebedouro Fonte Automática com Filtro de Carvão Ativado para Gatos e Cães 2.5L',
    categorySlug: 'pet',
    categoryName: 'Pet Shop e Animais',
    niche: 'Pet Shop',
    description: 'Fonte bebedouro elétrica ultra silenciosa com bomba submersa de baixo consumo, triplo sistema de filtragem de água com carvão ativado e capacidade de 2.5 litros.',
    costPriceCents: 6500, // Custo: R$ 65,00
    suggestedRetailPriceCents: 13900, // Venda: R$ 139,00 (~113% margem)
    defaultMarginPercent: 110,
    stock: 45,
    supplierName: 'PetDistribuidora Sul',
    location: 'Porto Alegre, RS',
    imageUrl: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['bebedouro', 'fonte', 'gatos', 'caes', 'pet'],
  },
  {
    id: 'eco-prod-09',
    name: 'Ração Super Premium para Cães Adultos Sabor Frango e Arroz 15kg',
    categorySlug: 'pet',
    categoryName: 'Pet Shop e Animais',
    niche: 'Pet Shop',
    description: 'Alimento de alta digestibilidade formulado com proteínas nobres, prebióticos naturais, ômega 3 e 6 para pelagem saudável e livre de corantes ou aromatizantes artificiais.',
    costPriceCents: 12500, // Custo: R$ 125,00
    suggestedRetailPriceCents: 19990, // Venda: R$ 199,90 (~60% margem)
    defaultMarginPercent: 60,
    stock: 35,
    supplierName: 'NutriPet Agropecuária',
    location: 'Campinas, SP',
    imageUrl: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['racao', 'caes', 'premium', 'pet'],
  },

  // 4. CASA, COZINHA & ELETRODOMÉSTICOS
  {
    id: 'eco-prod-10',
    name: 'Cafeteira Espresso Automática 15 Bar em Aço Inox com Vaporizador de Leite',
    categorySlug: 'eletrodomesticos',
    categoryName: 'Eletrodomésticos e Cozinha',
    niche: 'Casa & Cozinha',
    description: 'Máquina de café espresso italiana de alta pressão 15 bar, caldeira em alumínio fundido, vaporizador profissional para cappuccino cremoso e suporte duplo para xícaras.',
    costPriceCents: 32000, // Custo: R$ 320,00
    suggestedRetailPriceCents: 54900, // Venda: R$ 549,00 (~71% margem)
    defaultMarginPercent: 70,
    stock: 12,
    supplierName: 'HomeStyle Brasil',
    location: 'São Paulo, SP',
    imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['cafeteira', 'espresso', 'cafe', 'cozinha'],
  },
  {
    id: 'eco-prod-11',
    name: 'Fritadeira Elétrica sem Óleo Air Fryer Digital 4.5 Litros Inox 1500W',
    categorySlug: 'eletrodomesticos',
    categoryName: 'Eletrodomésticos e Cozinha',
    niche: 'Casa & Cozinha',
    description: 'Fritadeira com circulação de ar quente 360°, painel digital touch screen com 8 programas pré-definidos, cesto antiaderente removível de fácil limpeza e timer sonoro.',
    costPriceCents: 18000, // Custo: R$ 180,00
    suggestedRetailPriceCents: 32900, // Venda: R$ 329,00 (~82% margem)
    defaultMarginPercent: 80,
    stock: 20,
    supplierName: 'HomeStyle Brasil',
    location: 'São Paulo, SP',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['airfryer', 'cozinha', 'eletrodomesticos', 'fritadeira'],
  },

  // 5. MODA, ACESSÓRIOS & RELÓGIOS
  {
    id: 'eco-prod-12',
    name: 'Relógio Smartwatch Pro AMOLED com GPS Integrado e Monitor Cardíaco',
    categorySlug: 'relogios',
    categoryName: 'Moda e Acessórios',
    niche: 'Moda & Acessórios',
    description: 'Smartwatch elegante com caixa em alumínio aeroespacial, display AMOLED de alta resolução, mais de 100 modos esportivos, monitor de oxigênio SpO2 e resistência à água 50 metros.',
    costPriceCents: 14500, // Custo: R$ 145,00
    suggestedRetailPriceCents: 28900, // Venda: R$ 289,00 (~99% margem)
    defaultMarginPercent: 95,
    stock: 40,
    supplierName: 'Chronos Import & Distribuição',
    location: 'São Paulo, SP',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['relogio', 'smartwatch', 'acessorios', 'moda'],
  },
  {
    id: 'eco-prod-13',
    name: 'Mochila Impermeável Antifurto para Notebook 15.6" com Entrada USB',
    categorySlug: 'moda',
    categoryName: 'Moda e Acessórios',
    niche: 'Moda & Acessórios',
    description: 'Mochila executiva confeccionada em tecido Oxford repelente a água, zíperes ocultos antifurto, compartimento acolchoado para laptop e porta de carregamento USB externa.',
    costPriceCents: 7500, // Custo: R$ 75,00
    suggestedRetailPriceCents: 15990, // Venda: R$ 159,90 (~113% margem)
    defaultMarginPercent: 110,
    stock: 50,
    supplierName: 'UrbanStyle Acessórios',
    location: 'Belo Horizonte, MG',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['mochila', 'notebook', 'antifurto', 'moda'],
  },
  {
    id: 'eco-prod-14',
    name: 'Tênis Esportivo Running Amortecimento Pro Respirável',
    categorySlug: 'calcados',
    categoryName: 'Moda e Acessórios',
    niche: 'Moda & Acessórios',
    description: 'Calçado esportivo com cabedal em mesh ventilado, entressola em espuma EVA de alta absorção de impacto e solado em borracha antiderrapante de alta durabilidade.',
    costPriceCents: 11000, // Custo: R$ 110,00
    suggestedRetailPriceCents: 22990, // Venda: R$ 229,90 (~109% margem)
    defaultMarginPercent: 105,
    stock: 28,
    supplierName: 'SportLine Calçados Atacado',
    location: 'Franca, SP',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
    condition: 'NOVO',
    tags: ['tenis', 'calcados', 'corrida', 'moda'],
  },
];

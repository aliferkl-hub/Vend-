import { GoogleGenAI } from '@google/genai';

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

// Helper to call Gemini with timeout and JSON parsing
async function callGeminiJson<T>(prompt: string, fallback: T): Promise<T> {
  const client = getGeminiClient();
  if (!client) {
    return fallback;
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 12000)
    );

    const callPromise = client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const response: any = await Promise.race([callPromise, timeoutPromise]);
    const text = response?.text?.trim();
    if (!text) return fallback;

    // Parse json
    return JSON.parse(text) as T;
  } catch (err: any) {
    console.warn('[VEND+ Gemini API] Using fallback response:', err?.message || err);
    return fallback;
  }
}

export interface StoreConceptInput {
  storeName?: string;
  niche: string;
  targetAudience: string;
  visualStyle?: string;
  profitMarginPercent?: number;
  location?: string;
}

export interface StoreConceptOutput {
  storeName: string;
  slogan: string;
  visualStyle: 'modern' | 'dark_tech' | 'elegant' | 'vibrant' | 'eco';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
  };
  bannerHeadline: string;
  bannerSubheadline: string;
  bannerCtaText: string;
  promotionalBanners: Array<{
    title: string;
    subtitle: string;
    tag: string;
    badgeColor: string;
  }>;
  aboutText: string;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  contactInfo: {
    whatsapp: string;
    supportEmail: string;
    businessHours: string;
  };
}

// 1. GENERATE STORE CONCEPT WITH AI
export async function generateStoreConceptAI(input: StoreConceptInput): Promise<StoreConceptOutput> {
  const niche = input.niche || 'Eletrônicos & Informática';
  const target = input.targetAudience || 'Consumidores que buscam qualidade e confiança';
  const rawName = input.storeName?.trim() || '';

  // Palette presets by visual style
  const stylePresets: Record<string, any> = {
    modern: {
      primary: '#0F172A',
      secondary: '#0284C7',
      accent: '#10B981',
      surface: '#F8FAFC',
    },
    dark_tech: {
      primary: '#0B192C',
      secondary: '#00ADB5',
      accent: '#38BDF8',
      surface: '#0F172A',
    },
    elegant: {
      primary: '#18181B',
      secondary: '#D97706',
      accent: '#F59E0B',
      surface: '#FAFAFA',
    },
    vibrant: {
      primary: '#EA580C',
      secondary: '#F59E0B',
      accent: '#E11D48',
      surface: '#FFF7ED',
    },
    eco: {
      primary: '#064E3B',
      secondary: '#059669',
      accent: '#34D399',
      surface: '#F0FDF4',
    },
  };

  const selectedStyle = (input.visualStyle as any) || 'modern';
  const defaultColors = stylePresets[selectedStyle] || stylePresets.modern;

  const defaultName = rawName || `${niche.split(' ')[0]} Prime Express`;

  const fallback: StoreConceptOutput = {
    storeName: defaultName,
    slogan: `Os melhores produtos de ${niche} com envio rápido e garantia VEND+.`,
    visualStyle: selectedStyle,
    colors: defaultColors,
    bannerHeadline: `Sua Escolha Inteligente em ${niche}`,
    bannerSubheadline: `Catálogo selecionado a dedo com os melhores preços e pronta entrega na sua região.`,
    bannerCtaText: 'Ver Ofertas do Catálogo',
    promotionalBanners: [
      {
        title: 'Garantia e Procedência',
        subtitle: 'Todos os produtos testados e aprovados pelo VEND+',
        tag: '100% Seguro',
        badgeColor: 'emerald',
      },
      {
        title: 'Envio Rápido & Retirada',
        subtitle: 'Receba no mesmo dia via motoboy ou retire no balcão',
        tag: 'Entrega Express',
        badgeColor: 'sky',
      },
      {
        title: 'Condições Especiais',
        subtitle: 'Parcelamento facilitado ou desconto exclusivo no Pix',
        tag: 'Melhor Preço',
        badgeColor: 'amber',
      },
    ],
    aboutText: `A ${defaultName} nasceu com a missão de aproximar produtos de alta qualidade do público de ${target}. Com foco em atendimento ágil, transparência nos preços e rigorosa inspeção de procedência, oferecemos a melhor experiência de compra integrada ao ecossistema VEND+.`,
    faq: [
      {
        question: 'Os produtos possuem garantia?',
        answer: 'Sim! Todos os nossos produtos contam com garantia legal de 90 dias com suporte direto e respaldo da plataforma VEND+.',
      },
      {
        question: 'Quais são as formas de envio disponíveis?',
        answer: 'Trabalhamos com entrega expressa local via entregadores parceiros VEND+, envio pelos Correios e retirada presencial combinada.',
      },
      {
        question: 'Quais métodos de pagamento são aceitos?',
        answer: 'Aceitamos Pix com confirmação imediata, cartão de crédito em até 12x via Mercado Pago e boleto bancário.',
      },
      {
        question: 'Como acompanhar meu pedido?',
        answer: 'Assim que seu pedido for realizado, você recebe o código de rastreio e código de segurança de 4 dígitos para conferência na entrega.',
      },
    ],
    seo: {
      metaTitle: `${defaultName} | Loja Oficial no VEND+`,
      metaDescription: `Compre online na ${defaultName}. Especialista em ${niche} para ${target}. Pagamento seguro Mercado Pago e entrega rápida.`,
      keywords: [niche.toLowerCase(), 'loja online', 'vend+', 'comprar online', 'brasil', target.toLowerCase()],
    },
    contactInfo: {
      whatsapp: '(11) 99876-5432',
      supportEmail: `contato@${defaultName.toLowerCase().replace(/[^a-z0-9]/g, '')}.vendmais.com`,
      businessHours: 'Segunda a Sábado das 08h às 19h',
    },
  };

  const prompt = `Você é o Diretor Comercial de IA do VEND+ Marketplace.
Gere a identidade e apresentação comercial completa de uma nova loja virtual virtual dentro da plataforma.
Dados do cliente:
- Nome desejado: ${rawName || '(Gere um nome comercial atraente e marcante)'}
- Nicho: ${niche}
- Público-alvo: ${target}
- Estilo visual pretendido: ${selectedStyle}
- Margem de lucro média: ${input.profitMarginPercent || 35}%

Retorne ESTRITAMENTE um objeto JSON no seguinte formato:
{
  "storeName": "string",
  "slogan": "string comercial curto e marcante",
  "visualStyle": "${selectedStyle}",
  "colors": {
    "primary": "hex color",
    "secondary": "hex color",
    "accent": "hex color",
    "surface": "hex color"
  },
  "bannerHeadline": "string impactante para o banner principal",
  "bannerSubheadline": "string explicativo com proposta de valor",
  "bannerCtaText": "string chamada para acao",
  "promotionalBanners": [
    { "title": "string", "subtitle": "string", "tag": "string", "badgeColor": "emerald | sky | amber | rose" }
  ],
  "aboutText": "texto institucional profissional da loja de 3 a 5 linhas",
  "faq": [
    { "question": "string", "answer": "string" }
  ],
  "seo": {
    "metaTitle": "string",
    "metaDescription": "string",
    "keywords": ["array", "de", "palavras-chave"]
  },
  "contactInfo": {
    "whatsapp": "(11) 99999-9999",
    "supportEmail": "email profissional",
    "businessHours": "horario de funcionamento"
  }
}`;

  return await callGeminiJson<StoreConceptOutput>(prompt, fallback);
}

// 2. ENHANCE PRODUCT COPY & COMMERCIAL PRESENTATION
export async function enhanceProductCopyAI(params: {
  name: string;
  description?: string;
  category?: string;
  costPriceCents?: number;
  marginPercent?: number;
}): Promise<{
  commercialTitle: string;
  persuasiveDescription: string;
  keyBenefits: string[];
  suggestedSalePriceCents: number;
  profitMarginPercent: number;
}> {
  const cost = params.costPriceCents || 10000;
  const margin = params.marginPercent || 40;
  const calculatedPrice = Math.round(cost * (1 + margin / 100));

  const fallback = {
    commercialTitle: params.name.trim(),
    persuasiveDescription: params.description || `Produto de excelente qualidade com procedência garantida e pronta entrega. Ideal para seu dia a dia.`,
    keyBenefits: [
      'Produto original com garantia e nota',
      'Excelente custo-benefício e durabilidade',
      'Envio rápido e embalagem reforçada',
    ],
    suggestedSalePriceCents: calculatedPrice,
    profitMarginPercent: margin,
  };

  const prompt = `Você é um Copywriter e Especialista em E-commerce no VEND+.
Melhore a apresentação comercial do seguinte produto:
Nome bruto: ${params.name}
Descrição atual: ${params.description || 'Sem descrição detalhada'}
Categoria: ${params.category || 'Geral'}
Preço de custo: R$ ${(cost / 100).toFixed(2)}
Margem pretendida: ${margin}%

Gere um título comercial otimizado para marketplace, descrição persuasiva destacando benefícios práticos e lista com 3 a 4 diferenciais.
NÃO invente dados técnicos ou características falsas que não pertençam a essa categoria.

Retorne ESTRITAMENTE em JSON:
{
  "commercialTitle": "string",
  "persuasiveDescription": "string formatada em paragrafos persuasivos",
  "keyBenefits": ["beneficio 1", "beneficio 2", "beneficio 3"],
  "suggestedSalePriceCents": ${calculatedPrice},
  "profitMarginPercent": ${margin}
}`;

  return await callGeminiJson(prompt, fallback);
}

// 3. COMMERCIAL AI TOOLS (SOCIAL MEDIA, ADS, CAMPAIGNS, TITLES)
export async function runCommercialAiTool(tool: string, data: any): Promise<any> {
  const client = getGeminiClient();

  switch (tool) {
    case 'optimize-title': {
      const rawTitle = String(data.title || '').trim();
      const category = String(data.category || '').trim();

      const fallback = {
        optimizedTitle: `${rawTitle} Original com Garantia e Pronta Entrega`,
        searchKeywords: [rawTitle.toLowerCase(), 'original', 'garantia', 'vend+'],
        tips: 'Título otimizado com marca, atributos principais e termo de busca.',
      };

      const prompt = `Você é o otimizador de títulos para marketplaces do VEND+.
Transforme o seguinte título num título de alto ranqueamento (SEO) para e-commerce:
Título original: "${rawTitle}"
Categoria: "${category}"

Retorne ESTRITAMENTE em JSON:
{
  "optimizedTitle": "título claro, preciso, sem clichês, até 75 caracteres",
  "searchKeywords": ["termo1", "termo2", "termo3"],
  "tips": "dica rápida de ranqueamento"
}`;

      return await callGeminiJson(prompt, fallback);
    }

    case 'generate-social-post': {
      const { productName, price, storeName, benefits } = data;
      const fallback = {
        instagramCaption: `🔥 Destaque na ${storeName || 'nossa loja'}!\n\n${productName} por apenas R$ ${price || 'confira o valor'}!\n\n✨ Garantia de qualidade e envio imediato para todo o Brasil.\n📦 Compre com segurança no VEND+.\n\n👉 Link na bio ou direct para pedir o seu!`,
        whatsappMessage: `Olá! Olha essa novidade na ${storeName || 'nossa loja'}:\n\n*${productName}*\n💰 Por apenas: R$ ${price}\n🚚 Entrega rápida no mesmo dia!\n\nResponda essa mensagem para garantir o seu antes que acabe o estoque!`,
        hashtags: '#vendmais #oferta #promoção #comprasonline #qualidade',
      };

      const prompt = `Gere textos persuasivos para redes sociais anunciando o produto "${productName}" da loja "${storeName}". Preço: R$ ${price}. Benefícios: ${benefits || 'alta qualidade e procedência'}.
Retorne ESTRITAMENTE em JSON:
{
  "instagramCaption": "legenda com emojis e chamada clara para acao",
  "whatsappMessage": "mensagem pronta para status e lista de transmissao do whatsapp",
  "hashtags": "string com hashtags relevantes"
}`;

      return await callGeminiJson(prompt, fallback);
    }

    case 'generate-ad-copy': {
      const { productName, price, storeName } = data;
      const fallback = {
        metaAds: {
          headline: `${productName} com Preço Especial`,
          primaryText: `Aproveite entrega rápida e garantia total na ${storeName || 'Loja Oficial VEND+'}. Compre com desconto no Pix ou parcele em até 12x!`,
          callToAction: 'Comprar Agora',
        },
        googleAds: {
          headline1: `Comprar ${productName}`,
          headline2: `Na ${storeName} | Pronta Entrega`,
          description: `Melhores preços em ${productName}. Garantia comprovada, parcelamento facilitado e entrega rápida VEND+.`,
        },
      };

      const prompt = `Gere anúncios de alta conversão (Meta Ads e Google Ads) para o produto "${productName}" da loja "${storeName}".
Retorne ESTRITAMENTE em JSON com a estrutura do fallback.`;

      return await callGeminiJson(prompt, fallback);
    }

    case 'generate-campaign': {
      const { campaignType, storeName, niche } = data;
      const fallback = {
        campaignName: `${campaignType || 'Semana de Ofertas'} ${storeName || 'VEND+'}`,
        theme: `Descontos imperdíveis no nicho de ${niche || 'produtos selecionados'}`,
        promotionalCoupon: 'VEND10',
        discountPercent: 10,
        bannerHeadline: `A Grande Semana de Descontos da ${storeName || 'Nossa Loja'}`,
        bannerSubtitle: `Aproveite até 30% OFF em produtos selecionados com garantia e pronta entrega.`,
        actionPlan: [
          'Divulgar no WhatsApp e redes sociais com o cupom promocional',
          'Destacar os produtos campeões de vendas na vitrine',
          'Oferecer frete grátis para compras acima de valor estipulado',
        ],
      };

      const prompt = `Crie uma campanha promocional para a loja "${storeName}" no nicho "${niche}". Tipo de campanha: "${campaignType}".
Retorne ESTRITAMENTE em JSON:
{
  "campaignName": "string",
  "theme": "string",
  "promotionalCoupon": "string",
  "discountPercent": number,
  "bannerHeadline": "string",
  "bannerSubtitle": "string",
  "actionPlan": ["passo 1", "passo 2", "passo 3"]
}`;

      return await callGeminiJson(prompt, fallback);
    }

    case 'suggest-trending-products': {
      const niche = String(data.niche || 'Eletrônicos');
      const fallback = {
        niche,
        trendingProducts: [
          { name: 'Smartphone 5G com alta memória', searchVolume: 'Muito Alto', marginEstimated: '25-35%' },
          { name: 'Fone Bluetooth com cancelamento de ruído', searchVolume: 'Alto', marginEstimated: '60-90%' },
          { name: 'Smartwatch com monitor de saúde', searchVolume: 'Alto', marginEstimated: '70-100%' },
          { name: 'Acessórios e carregadores rápidos', searchVolume: 'Contínuo', marginEstimated: '100-150%' },
        ],
        commercialAdvice: 'Mantenha produtos de giro rápido com margem saudável e produtos de ticket médio para ancorar valor.',
      };

      const prompt = `Sugira os produtos com maior demanda e facilidade de venda para o nicho de "${niche}" em marketplaces locais e nacionais no Brasil.
Retorne ESTRITAMENTE em JSON:
{
  "niche": "${niche}",
  "trendingProducts": [
    { "name": "string", "searchVolume": "string", "marginEstimated": "string" }
  ],
  "commercialAdvice": "string com conselho estrategico"
}`;

      return await callGeminiJson(prompt, fallback);
    }

    default:
      return { error: 'Ferramenta de IA não reconhecida.' };
  }
}

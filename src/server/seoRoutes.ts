import { Request, Response, NextFunction } from 'express';
import { db, pool } from '../db/index.ts';
import { stores, products, productImages } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export function handleRobotsTxt(req: Request, res: Response) {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  const robots = `# VEND+ Robots.txt - Organic indexing
User-agent: *
Allow: /
Allow: /marketplace
Allow: /loja-ia
Allow: /loja/
Allow: /produto/
Disallow: /admin
Disallow: /api/
Disallow: /checkout
Disallow: /orders

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.type('text/plain').send(robots);
}

export async function handleSitemapXml(req: Request, res: Response) {
  try {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    // Query active stores
    const activeStoresRes = await pool.query(
      `SELECT slug, updated_at FROM stores WHERE slug IS NOT NULL ORDER BY updated_at DESC LIMIT 500`
    );

    // Query active products
    const activeProductsRes = await pool.query(
      `SELECT id, slug, updated_at FROM products WHERE status = 'ACTIVE' ORDER BY updated_at DESC LIMIT 1000`
    );

    const now = new Date().toISOString();

    let urlsXml = `
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/marketplace</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/loja-ia</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

    // Add stores
    for (const store of activeStoresRes.rows) {
      const lastMod = store.updated_at ? new Date(store.updated_at).toISOString() : now;
      urlsXml += `
  <url>
    <loc>${baseUrl}/loja/${encodeURIComponent(store.slug)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Add products
    for (const prod of activeProductsRes.rows) {
      const lastMod = prod.updated_at ? new Date(prod.updated_at).toISOString() : now;
      const prodSlugOrId = prod.slug || prod.id;
      urlsXml += `
  <url>
    <loc>${baseUrl}/produto/${encodeURIComponent(prodSlugOrId)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

    res.type('application/xml').send(sitemap);
  } catch (err: any) {
    console.error('[SEO] Erro ao gerar sitemap.xml:', err);
    res.status(500).type('text/plain').send('Erro ao gerar sitemap.');
  }
}

// Dynamic Open Graph / SEO metadata injector for public pages
export async function handleSocialSharePreviews(req: Request, res: Response, next: NextFunction) {
  const urlPath = req.path;

  // Only handle specific shareable routes
  const isProductRoute = urlPath.startsWith('/produto/');
  const isStoreRoute = urlPath.startsWith('/loja/');
  const isMarketplaceRoute = urlPath === '/marketplace';
  const isLojaIaRoute = urlPath === '/loja-ia';

  if (!isProductRoute && !isStoreRoute && !isMarketplaceRoute && !isLojaIaRoute) {
    return next();
  }

  try {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    let title = 'VEND+ — Mais perto. Mais VEND+.';
    let description = 'Marketplace local e criador de lojas virtuais com Inteligência Artificial: catálogo verificado, identidade visual e entrega protegida.';
    let imageUrl = `${baseUrl}/favicon.ico`;
    let structuredData: any = null;

    if (isMarketplaceRoute) {
      title = 'VEND+ Marketplace — VENDA. COMPRE. NEGOCIE. ENTREGUE.';
      description = 'Compre e venda com garantia total de recebimento e entrega com código de 4 dígitos. Produtos novos e seminovos perto de você.';
    } else if (isLojaIaRoute) {
      title = 'Crie sua Loja Virtual com IA no VEND+';
      description = 'Crie sua própria loja em minutos com Inteligência Artificial. Identidade visual exclusiva, catálogo organizado, logo e integração com redes sociais.';
    } else if (isStoreRoute) {
      const slug = urlPath.replace('/loja/', '').split('/')[0];
      const [store] = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
      if (store) {
        title = `${store.name} — Loja Oficial VEND+`;
        description = store.description || `Confira o catálogo exclusivo de produtos da loja ${store.name} com entrega segura e garantia VEND+.`;
        if (store.logoUrl) {
          imageUrl = store.logoUrl.startsWith('http') ? store.logoUrl : `${baseUrl}${store.logoUrl}`;
        }
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: store.name,
          description: store.description,
          image: imageUrl,
          url: `${baseUrl}/loja/${store.slug}`,
          address: store.location,
        };
      }
    } else if (isProductRoute) {
      const param = urlPath.replace('/produto/', '').split('/')[0];
      let prod: any = null;
      if (!isNaN(Number(param))) {
        [prod] = await db.select().from(products).where(eq(products.id, Number(param))).limit(1);
      }
      if (!prod) {
        [prod] = await db.select().from(products).where(eq(products.slug, param)).limit(1);
      }

      if (prod) {
        const formattedPrice = (prod.priceCents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        title = `${prod.name} por ${formattedPrice} — VEND+`;
        description = prod.description ? prod.description.slice(0, 160) : `Compre ${prod.name} com segurança, garantia e entrega protegida pelo VEND+.`;
        if (prod.imageUrl) {
          imageUrl = prod.imageUrl.startsWith('http') ? prod.imageUrl : `${baseUrl}${prod.imageUrl}`;
        }
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: prod.name,
          description: prod.description,
          image: imageUrl,
          offers: {
            '@type': 'Offer',
            price: (prod.priceCents / 100).toFixed(2),
            priceCurrency: 'BRL',
            availability: prod.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        };
      }
    }

    // Read index.html template
    const indexPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'dist', 'index.html')
      : path.join(process.cwd(), 'index.html');

    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');

      // Inject SEO & Open Graph Tags
      html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
      html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${description}" />`);
      html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title}" />`);
      html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${description}" />`);

      const extraMeta = `
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${baseUrl}${urlPath}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    ${structuredData ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>` : ''}
      `;
      html = html.replace('</head>', `${extraMeta}\n</head>`);

      return res.type('text/html').send(html);
    }

    return next();
  } catch (err: any) {
    console.error('[SEO] Error serving dynamic social preview:', err);
    return next();
  }
}

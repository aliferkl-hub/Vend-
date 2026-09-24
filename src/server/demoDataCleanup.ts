import { db } from '../db/index.ts';
import { products, productImages, services, stores, orderItems, orders } from '../db/schema.ts';
import { and, count, eq, inArray } from 'drizzle-orm';

const LEGACY_DEMO_STORE_SLUG = 'vend-eletro-tech';
const LEGACY_DEMO_STORE_NAME = 'VEND+ Eletro & Tech Local';

/**
 * Removes only records that are explicitly marked as demo or match the
 * historical seed store identity. Records referenced by orders are archived
 * instead of deleted so marketplace history and financial data remain intact.
 */
export async function removeLegacyDemoData(database: any = db) {
  const result = {
    deletedProducts: 0,
    archivedProducts: 0,
    deletedServices: 0,
    archivedServices: 0,
    deletedStores: 0,
  };

  const demoProductRows = await database
    .select({ id: products.id })
    .from(products)
    .where(eq(products.isDemo, true));
  const demoProductIds = demoProductRows.map((row: { id: number }) => row.id);

  if (demoProductIds.length > 0) {
    const referencedRows = await database
      .select({ productId: orderItems.productId })
      .from(orderItems)
      .where(inArray(orderItems.productId, demoProductIds));
    const referencedIds = new Set(
      referencedRows
        .map((row: { productId: number | null }) => row.productId)
        .filter((id): id is number => id !== null),
    );
    const deletableIds = demoProductIds.filter((id) => !referencedIds.has(id));
    const protectedIds = demoProductIds.filter((id) => referencedIds.has(id));

    if (deletableIds.length > 0) {
      await database.delete(productImages).where(inArray(productImages.productId, deletableIds));
      await database.delete(products).where(inArray(products.id, deletableIds));
      result.deletedProducts = deletableIds.length;
    }

    if (protectedIds.length > 0) {
      await database
        .update(products)
        .set({ status: 'ARCHIVED', updatedAt: new Date() })
        .where(inArray(products.id, protectedIds));
      result.archivedProducts = protectedIds.length;
    }
  }

  const demoServiceRows = await database
    .select({ id: services.id })
    .from(services)
    .where(eq(services.isDemo, true));
  const demoServiceIds = demoServiceRows.map((row: { id: number }) => row.id);

  if (demoServiceIds.length > 0) {
    const referencedRows = await database
      .select({ serviceId: orderItems.serviceId })
      .from(orderItems)
      .where(inArray(orderItems.serviceId, demoServiceIds));
    const referencedIds = new Set(
      referencedRows
        .map((row: { serviceId: number | null }) => row.serviceId)
        .filter((id): id is number => id !== null),
    );
    const deletableIds = demoServiceIds.filter((id) => !referencedIds.has(id));
    const protectedIds = demoServiceIds.filter((id) => referencedIds.has(id));

    if (deletableIds.length > 0) {
      await database.delete(services).where(inArray(services.id, deletableIds));
      result.deletedServices = deletableIds.length;
    }

    if (protectedIds.length > 0) {
      await database
        .update(services)
        .set({ status: 'ARCHIVED', updatedAt: new Date() })
        .where(inArray(services.id, protectedIds));
      result.archivedServices = protectedIds.length;
    }
  }

  const legacyStores = await database
    .select()
    .from(stores)
    .where(and(eq(stores.slug, LEGACY_DEMO_STORE_SLUG), eq(stores.name, LEGACY_DEMO_STORE_NAME)));

  for (const store of legacyStores) {
    const storeProducts = await database
      .select({ id: products.id, isDemo: products.isDemo })
      .from(products)
      .where(eq(products.storeId, store.id));
    const [{ orderCount }] = await database
      .select({ orderCount: count() })
      .from(orders)
      .where(eq(orders.sellerId, store.userId));

    const hasNonDemoProducts = storeProducts.some((product: { isDemo: boolean }) => !product.isDemo);
    if (storeProducts.length === 0 && Number(orderCount) === 0 && !hasNonDemoProducts) {
      await database.delete(stores).where(eq(stores.id, store.id));
      result.deletedStores += 1;
    }
  }

  return result;
}
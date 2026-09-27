/** Use real catalog content until the owner publishes homepage sections. */
export function fallbackHomeSections(
  hero: Record<string, unknown>,
  collectionId: number | null,
  productIds: number[]
): { id: number; type: string; config: Record<string, unknown> }[] {
  const sections = [{ id: -1, type: 'hero', config: hero }];
  if (collectionId) {
    sections.push({
      id: -2,
      type: 'collection_highlight',
      config: { collectionId, layout: 'split' }
    });
  } else if (productIds.length > 0) {
    sections.push({
      id: -2,
      type: 'featured_products',
      config: { productIds }
    });
  }
  return sections;
}

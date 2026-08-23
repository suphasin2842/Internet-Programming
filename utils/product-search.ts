export type SearchableProduct = {
  product_name: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
};

function normalizeSearchValue(value: unknown) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('th-TH')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesProductSearch(product: SearchableProduct, search: string) {
  const terms = normalizeSearchValue(search).split(' ').filter(Boolean);
  if (terms.length === 0) return true;

  const searchableText = normalizeSearchValue([
    product.product_name,
    product.description,
    product.sku,
    product.category,
  ].filter(Boolean).join(' '));

  return terms.every((term) => searchableText.includes(term));
}

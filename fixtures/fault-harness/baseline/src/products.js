export const PRODUCTS = [
  { id: 'travel-pack', name: 'Travel Pack', price: 49 },
  { id: 'day-bag', name: 'Day Bag', price: 29 }
];

export function searchProducts(query) {
  const q = String(query || '').toLowerCase();
  return PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
}

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

/** Clean: unknown ids stay null (404 path). */
export function getProductOrDefault(id) {
  return getProduct(id);
}

export function notFoundMessage() {
  return 'Product not found';
}

export function searchLabel() {
  return 'Search products';
}

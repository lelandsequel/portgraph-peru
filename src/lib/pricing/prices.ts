// PRICE LAYER — Commodity price context
// Uses hardcoded recent values as primary source with timestamps

export interface CommodityPrice {
  commodity: string;
  price: number;
  unit: string;
  currency: string;
  change_24h: number;
  source: string;
  updated_at: string;
}

// Hardcoded recent benchmark prices (fallback — always available)
// Last updated: 2026-03-28
const BENCHMARK_PRICES: CommodityPrice[] = [
  { commodity: 'Copper', price: 9_420, unit: '$/MT', currency: 'USD', change_24h: +1.2, source: 'LME benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Iron Ore', price: 108.5, unit: '$/MT', currency: 'USD', change_24h: -0.8, source: 'SGX benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Coal (thermal)', price: 135.0, unit: '$/MT', currency: 'USD', change_24h: +0.3, source: 'Newcastle benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Brent Crude', price: 73.80, unit: '$/bbl', currency: 'USD', change_24h: -1.5, source: 'ICE benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'LNG (JKM)', price: 12.40, unit: '$/MMBtu', currency: 'USD', change_24h: +2.1, source: 'Platts JKM benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Lithium Carbonate', price: 11_200, unit: '$/MT', currency: 'USD', change_24h: +3.4, source: 'Fastmarkets estimate', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Nickel', price: 16_350, unit: '$/MT', currency: 'USD', change_24h: -0.4, source: 'LME benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Zinc', price: 2_780, unit: '$/MT', currency: 'USD', change_24h: +0.6, source: 'LME benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Lead', price: 2_085, unit: '$/MT', currency: 'USD', change_24h: -0.2, source: 'LME benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Cobalt', price: 28_500, unit: '$/MT', currency: 'USD', change_24h: +1.8, source: 'Fastmarkets estimate', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Wheat', price: 5.62, unit: '$/bushel', currency: 'USD', change_24h: -0.9, source: 'CBOT benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Corn', price: 4.48, unit: '$/bushel', currency: 'USD', change_24h: +0.5, source: 'CBOT benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Soy', price: 10.15, unit: '$/bushel', currency: 'USD', change_24h: +0.3, source: 'CBOT benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Uranium (U3O8)', price: 82.50, unit: '$/lb', currency: 'USD', change_24h: +1.1, source: 'UxC estimate', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Potash (KCl)', price: 285, unit: '$/MT', currency: 'USD', change_24h: 0.0, source: 'CRU benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Platinum', price: 985, unit: '$/oz', currency: 'USD', change_24h: +0.7, source: 'NYMEX benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Alumina', price: 345, unit: '$/MT', currency: 'USD', change_24h: -0.3, source: 'Platts estimate', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Rare Earths (NdPr oxide)', price: 62_000, unit: '$/MT', currency: 'USD', change_24h: +2.5, source: 'Shanghai Metals estimate', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Bauxite', price: 52, unit: '$/MT', currency: 'USD', change_24h: +0.1, source: 'CRU benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Chromium', price: 8_200, unit: '$/MT', currency: 'USD', change_24h: -1.0, source: 'Fastmarkets estimate', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Manganese', price: 4.80, unit: '$/dmtu', currency: 'USD', change_24h: +0.4, source: 'CRU benchmark', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Phosphate Rock', price: 100, unit: '$/MT', currency: 'USD', change_24h: 0.0, source: 'World Bank estimate', updated_at: '2026-03-28T12:00:00Z' },
  { commodity: 'Fertilizer (DAP)', price: 540, unit: '$/MT', currency: 'USD', change_24h: -0.6, source: 'World Bank estimate', updated_at: '2026-03-28T12:00:00Z' },
];

// Category -> commodity name mapping
const CATEGORY_TO_NAME: Record<string, string> = {
  copper_ore: 'Copper', refined_copper: 'Copper', copper_matte: 'Copper',
  iron_ore: 'Iron Ore', coal: 'Coal (thermal)',
  soy: 'Soy', nickel_ore: 'Nickel', cobalt: 'Cobalt',
  zinc_ore: 'Zinc', lead_ore: 'Lead', platinum: 'Platinum',
  potash: 'Potash (KCl)', wheat: 'Wheat', corn: 'Corn',
  fertilizer: 'Fertilizer (DAP)', uranium: 'Uranium (U3O8)',
  bauxite: 'Bauxite', lng: 'LNG (JKM)',
  lithium_carbonate: 'Lithium Carbonate', lithium_ore: 'Lithium Carbonate',
  rare_earths: 'Rare Earths (NdPr oxide)', crude_oil: 'Brent Crude',
  alumina: 'Alumina', chromium: 'Chromium', manganese: 'Manganese',
  phosphate: 'Phosphate Rock',
};

export function getAllPrices(): CommodityPrice[] {
  return BENCHMARK_PRICES;
}

export function getPriceForCommodity(commodityCategory: string): CommodityPrice | null {
  const name = CATEGORY_TO_NAME[commodityCategory.toLowerCase()];
  if (!name) return null;
  return BENCHMARK_PRICES.find(p => p.commodity === name) || null;
}

export function getPriceContext(commodityCategory: string): string {
  const price = getPriceForCommodity(commodityCategory);
  if (!price) return 'Price data unavailable';
  const direction = price.change_24h > 0 ? '+' : '';
  return `${price.commodity}: ${price.price.toLocaleString()} ${price.unit} (${direction}${price.change_24h}% 24h) — ${price.source}`;
}

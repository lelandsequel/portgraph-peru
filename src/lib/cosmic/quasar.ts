// QUASAR — Signal Ranking Engine
// Ranks importance of each event 0-100

export interface QuasarResult {
  impact_score: number;
  percentile_rank: number;
  category: 'routine' | 'notable' | 'critical';
}

// Commodity criticality — strategic importance weight
const COMMODITY_CRITICALITY: Record<string, number> = {
  lithium_carbonate: 1.0,
  lithium_ore: 1.0,
  rare_earths: 1.0,
  cobalt: 0.95,
  uranium: 0.95,
  copper_ore: 0.85,
  refined_copper: 0.85,
  copper_matte: 0.80,
  nickel_ore: 0.80,
  platinum: 0.75,
  chromium: 0.70,
  manganese: 0.65,
  iron_ore: 0.60,
  bauxite: 0.55,
  alumina: 0.55,
  crude_oil: 0.50,
  lng: 0.50,
  zinc_ore: 0.45,
  lead_ore: 0.40,
  coal: 0.35,
  potash: 0.35,
  fertilizer: 0.35,
  phosphate: 0.30,
  wheat: 0.40,
  corn: 0.35,
  soy: 0.40,
};

// Destination sensitivity — geopolitical importance weight
const DESTINATION_SENSITIVITY: Record<string, number> = {
  china: 1.0,
  india: 0.85,
  japan: 0.80,
  'south korea': 0.75,
  germany: 0.70,
  netherlands: 0.65,
  taiwan: 0.90,
  usa: 0.70,
  brazil: 0.55,
  turkey: 0.50,
};

interface QuasarInput {
  trade_value_usd?: number;
  volume_kg?: number;
  baseline_volume_kg?: number;
  commodity_category?: string;
  destination_country?: string;
  alert_type?: string;
  confidence?: number;
}

export function rankSignal(input: QuasarInput): QuasarResult {
  let rawScore = 0;

  // 1. Trade value component (0-25 points)
  const value = input.trade_value_usd || 0;
  if (value >= 1e9) rawScore += 25;
  else if (value >= 5e8) rawScore += 20;
  else if (value >= 1e8) rawScore += 15;
  else if (value >= 1e7) rawScore += 8;
  else if (value >= 1e6) rawScore += 4;
  else rawScore += 1;

  // 2. Volume vs baseline (0-20 points)
  if (input.volume_kg && input.baseline_volume_kg && input.baseline_volume_kg > 0) {
    const ratio = input.volume_kg / input.baseline_volume_kg;
    if (ratio > 3.0) rawScore += 20;
    else if (ratio > 2.0) rawScore += 15;
    else if (ratio > 1.5) rawScore += 10;
    else if (ratio > 1.2) rawScore += 5;
    else rawScore += 2;
  } else {
    rawScore += 5; // unknown baseline, moderate
  }

  // 3. Commodity criticality (0-25 points)
  const cat = (input.commodity_category || '').toLowerCase();
  const criticality = COMMODITY_CRITICALITY[cat] ?? 0.4;
  rawScore += Math.round(criticality * 25);

  // 4. Destination sensitivity (0-20 points)
  const dest = (input.destination_country || '').toLowerCase();
  let destScore = 0.4; // default for unknown
  for (const [key, val] of Object.entries(DESTINATION_SENSITIVITY)) {
    if (dest.includes(key)) {
      destScore = val;
      break;
    }
  }
  rawScore += Math.round(destScore * 20);

  // 5. Alert type bonus (0-10 points)
  const typeBonus: Record<string, number> = {
    critical_mineral_alert: 10,
    supply_disruption: 9,
    demand_surge: 7,
    dominance_shift: 6,
    route_confirmed: 5,
    new_corridor: 5,
    route_expansion: 4,
    entity_entry: 3,
  };
  rawScore += typeBonus[input.alert_type || ''] ?? 3;

  const impact_score = Math.min(100, Math.max(0, rawScore));

  // Percentile rank approximation based on score distribution
  const percentile_rank = Math.min(99, Math.round(
    100 * (1 - Math.exp(-impact_score / 35))
  ));

  let category: QuasarResult['category'];
  if (impact_score >= 71) category = 'critical';
  else if (impact_score >= 41) category = 'notable';
  else category = 'routine';

  return { impact_score, percentile_rank, category };
}

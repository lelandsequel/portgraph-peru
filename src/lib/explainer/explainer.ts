// EXPLAINER — Signal explanation generator
// Generates human-readable intelligence from COSMIC signals

export interface SignalExplanation {
  anomaly_explanation: string;
  economic_implication: string;
  affected_regions: string[];
  affected_companies: string[];
}

// Commodity → typical baseline volumes (MT/year) for anomaly detection
const BASELINE_VOLUMES: Record<string, number> = {
  copper_ore: 22_000_000,
  refined_copper: 5_000_000,
  iron_ore: 1_500_000_000,
  coal: 1_200_000_000,
  soy: 160_000_000,
  nickel_ore: 3_000_000,
  cobalt: 170_000,
  lithium_carbonate: 600_000,
  lithium_ore: 400_000,
  rare_earths: 300_000,
  wheat: 200_000_000,
  lng: 400_000_000,
  crude_oil: 2_000_000_000,
  bauxite: 370_000_000,
  zinc_ore: 13_000_000,
  uranium: 60_000,
  potash: 45_000_000,
};

// Major companies per commodity for affected_companies inference
const COMMODITY_COMPANIES: Record<string, string[]> = {
  copper_ore: ['Freeport-McMoRan', 'Southern Copper (SCCO)', 'Glencore', 'BHP', 'Antofagasta', 'Codelco', 'Zijin Mining'],
  refined_copper: ['Freeport-McMoRan', 'Southern Copper', 'Jiangxi Copper', 'Aurubis'],
  iron_ore: ['Vale', 'Rio Tinto', 'BHP', 'Fortescue', 'LKAB'],
  coal: ['Glencore', 'BHP', 'Adaro Energy', 'Banpu', 'Bumi Resources'],
  soy: ['Cargill', 'ADM', 'Bunge', 'Louis Dreyfus', 'COFCO'],
  nickel_ore: ['Vale', 'Norilsk Nickel', 'BHP', 'Glencore', 'Eramet'],
  cobalt: ['Glencore', 'CMOC', 'ERG', 'Umicore'],
  lithium_carbonate: ['Albemarle', 'SQM', 'Ganfeng Lithium', 'Tianqi Lithium', 'Pilbara Minerals'],
  lithium_ore: ['Pilbara Minerals', 'Allkem', 'Sigma Lithium', 'Arcadium Lithium'],
  rare_earths: ['MP Materials', 'Lynas Rare Earths', 'China Northern Rare Earth', 'Iluka Resources'],
  wheat: ['Cargill', 'ADM', 'Bunge', 'Viterra'],
  lng: ['QatarEnergy', 'Shell', 'TotalEnergies', 'Cheniere', 'Woodside'],
  crude_oil: ['Saudi Aramco', 'ExxonMobil', 'Shell', 'Chevron', 'TotalEnergies'],
  bauxite: ['Rio Tinto', 'Alcoa', 'CBG', 'Norsk Hydro'],
  uranium: ['Kazatomprom', 'Cameco', 'Orano', 'CNNC'],
  zinc_ore: ['Glencore', 'Teck Resources', 'Hindustan Zinc', 'Boliden'],
  potash: ['Nutrien', 'Belaruskali', 'Mosaic', 'K+S'],
};

// Country → region mapping for affected_regions
const COUNTRY_REGIONS: Record<string, string> = {
  peru: 'South America', chile: 'South America', brazil: 'South America', argentina: 'South America', colombia: 'South America',
  china: 'East Asia', japan: 'East Asia', 'south korea': 'East Asia', taiwan: 'East Asia',
  india: 'South Asia',
  indonesia: 'Southeast Asia', philippines: 'Southeast Asia', myanmar: 'Southeast Asia',
  australia: 'Oceania', 'new caledonia': 'Oceania',
  germany: 'Europe', netherlands: 'Europe', sweden: 'Europe', belgium: 'Europe', finland: 'Europe',
  'south africa': 'Southern Africa', drc: 'Central Africa', guinea: 'West Africa', mozambique: 'East Africa', tanzania: 'East Africa',
  russia: 'FSU/Eurasia', ukraine: 'FSU/Eurasia', kazakhstan: 'Central Asia',
  canada: 'North America', usa: 'North America',
  qatar: 'Middle East', nigeria: 'West Africa', angola: 'Southern Africa',
};

export function explainSignal(input: {
  commodity_category?: string;
  commodity?: string;
  origin_country?: string;
  destination_country?: string;
  volume_kg?: number;
  trade_value_usd?: number;
  impact_score?: number;
  route_status?: string;
  alert_type?: string;
  anomalies?: string[];
}): SignalExplanation {
  const cat = (input.commodity_category || '').toLowerCase();
  const commodity = input.commodity || cat.replace(/_/g, ' ');
  const origin = input.origin_country || 'Unknown';
  const dest = input.destination_country || 'Unknown';
  const volumeMT = (input.volume_kg || 0) / 1000;
  const baselineMT = BASELINE_VOLUMES[cat] || 1_000_000;

  // Anomaly explanation
  let anomaly_explanation: string;
  const volumeRatio = volumeMT > 0 ? volumeMT / (baselineMT * 0.01) : 0; // compare to 1% of annual baseline
  if (input.anomalies && input.anomalies.length > 0) {
    anomaly_explanation = input.anomalies.join('. ') + '.';
  } else if (volumeRatio > 2) {
    anomaly_explanation = `${commodity} volume from ${origin} is ${volumeRatio.toFixed(1)}x above typical monthly baseline. This shipment represents an unusual concentration of supply on a single corridor.`;
  } else if (input.route_status === 'broken') {
    anomaly_explanation = `Route disruption detected on ${origin} -> ${dest} corridor. Expected shipment path could not be confirmed — possible logistics delay, vessel diversion, or port congestion.`;
  } else if (input.alert_type === 'new_corridor') {
    anomaly_explanation = `First observed ${commodity} flow between ${origin} and ${dest}. This may indicate a new trade relationship, supply chain diversification, or opportunistic procurement.`;
  } else if (input.alert_type === 'dominance_shift') {
    anomaly_explanation = `Supplier concentration shifting in ${commodity} exports from ${origin}. Market share rebalancing detected — a single entity is capturing disproportionate flow share.`;
  } else {
    anomaly_explanation = `${commodity} movement on ${origin} -> ${dest} corridor within normal parameters. No significant deviation from historical baseline.`;
  }

  // Economic implication
  let economic_implication: string;
  const value = input.trade_value_usd || 0;
  if ((input.impact_score || 0) >= 70) {
    if (['lithium_carbonate', 'lithium_ore', 'rare_earths', 'cobalt'].includes(cat)) {
      economic_implication = `Strategic mineral supply signal. ${dest} procurement of ${commodity} may affect battery/EV supply chain pricing. Watch spot markets and long-term offtake contract renegotiations.`;
    } else if (['copper_ore', 'refined_copper'].includes(cat)) {
      economic_implication = `Copper is a leading economic indicator. This ${value > 1e8 ? 'high-value' : ''} flow shift could signal ${dest} infrastructure demand changes. LME copper futures may respond.`;
    } else if (['wheat', 'corn', 'soy'].includes(cat)) {
      economic_implication = `Agricultural commodity flow disruption. Food security implications for importing regions. CBOT futures and regional food prices may be affected.`;
    } else {
      economic_implication = `Significant ${commodity} trade signal. Value: $${(value / 1e6).toFixed(0)}M. Market participants should monitor for trend confirmation.`;
    }
  } else {
    economic_implication = `Standard ${commodity} trade flow. No immediate pricing pressure expected. Cumulative trend monitoring recommended.`;
  }

  // Affected regions
  const affected_regions = new Set<string>();
  const originRegion = COUNTRY_REGIONS[origin.toLowerCase()];
  const destRegion = COUNTRY_REGIONS[dest.toLowerCase()];
  if (originRegion) affected_regions.add(originRegion);
  if (destRegion) affected_regions.add(destRegion);
  if (affected_regions.size === 0) affected_regions.add('Global');

  // Affected companies
  const affected_companies = COMMODITY_COMPANIES[cat] || [];

  return {
    anomaly_explanation,
    economic_implication,
    affected_regions: Array.from(affected_regions),
    affected_companies: affected_companies.slice(0, 5),
  };
}

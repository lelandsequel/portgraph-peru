// NEBULA — Uncertainty Model
// Quantifies certainty of every signal

export interface NebulaResult {
  confidence: number;
  uncertainty_band: 'low' | 'medium' | 'high';
  contradictions: string[];
}

interface NebulaInput {
  data_age_hours?: number;
  source_count?: number;
  sources_agree?: boolean;
  historical_pattern_match?: boolean;
  missing_fields?: string[];
  confidence_scores?: number[];
  has_vessel_imo?: boolean;
  has_destination?: boolean;
  has_exporter?: boolean;
  has_importer?: boolean;
}

export function quantifyUncertainty(input: NebulaInput): NebulaResult {
  const contradictions: string[] = [];
  let score = 0.5; // Base confidence

  // Factor 1: Data recency (up to +0.2)
  const ageHours = input.data_age_hours ?? 48;
  if (ageHours < 6) {
    score += 0.20;
  } else if (ageHours < 24) {
    score += 0.15;
  } else if (ageHours < 72) {
    score += 0.08;
  } else if (ageHours < 168) {
    score += 0.02;
  } else {
    score -= 0.05;
    contradictions.push(`Data is ${Math.round(ageHours / 24)} days old — may be stale`);
  }

  // Factor 2: Source agreement (up to +0.15)
  const sourceCount = input.source_count ?? 1;
  if (sourceCount >= 3 && input.sources_agree) {
    score += 0.15;
  } else if (sourceCount >= 2 && input.sources_agree) {
    score += 0.10;
  } else if (sourceCount >= 2 && !input.sources_agree) {
    score += 0.02;
    contradictions.push('Multiple sources disagree on key fields');
  } else {
    score += 0.03;
  }

  // Factor 3: Historical pattern match (up to +0.10)
  if (input.historical_pattern_match === true) {
    score += 0.10;
  } else if (input.historical_pattern_match === false) {
    score -= 0.05;
    contradictions.push('Pattern diverges from historical baseline');
  }

  // Factor 4: Missing links penalty (-0.05 each)
  const missing = input.missing_fields || [];
  if (missing.length > 0) {
    score -= missing.length * 0.05;
    if (missing.length >= 3) {
      contradictions.push(`${missing.length} key fields missing: ${missing.join(', ')}`);
    }
  }

  // Factor 5: Entity confidence scores agreement
  const scores = input.confidence_scores || [];
  if (scores.length >= 2) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    if (variance > 0.04) {
      contradictions.push('Confidence scores vary significantly across data points');
      score -= 0.05;
    }
    score += mean * 0.1; // Boost from underlying confidence
  }

  // Factor 6: Key identifiers present
  if (input.has_vessel_imo) score += 0.05;
  if (input.has_destination) score += 0.03;
  if (input.has_exporter) score += 0.02;
  if (input.has_importer) score += 0.02;

  const confidence = parseFloat(Math.max(0, Math.min(1, score)).toFixed(3));

  let uncertainty_band: NebulaResult['uncertainty_band'];
  if (confidence >= 0.80) {
    uncertainty_band = 'low';
  } else if (confidence >= 0.55) {
    uncertainty_band = 'medium';
  } else {
    uncertainty_band = 'high';
  }

  return { confidence, uncertainty_band, contradictions };
}

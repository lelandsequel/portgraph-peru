// LNG Signal Engine — 3 signal types for US Gulf → Asia-Pacific LNG intelligence

export interface DestinationPrediction {
  type: 'destination_prediction';
  vessel: string;
  imo: string;
  origin_terminal: string;
  predicted_destination: string;
  predicted_country: string;
  confidence: number;
  reasoning: string;
  status: 'high_confidence' | 'suppressed';
  timestamp: string;
}

export interface RerouteDetection {
  type: 'reroute';
  vessel: string;
  imo: string;
  origin_terminal: string;
  original_destination: string;
  new_likely_destination: string;
  deviation_hours: number;
  confidence: number;
  anomaly_note: string;
  timestamp: string;
}

export interface DelayAnomaly {
  type: 'delay';
  vessel: string;
  imo: string;
  origin_terminal: string;
  expected_arrival: string;
  revised_arrival: string;
  delay_hours: number;
  confidence: number;
  cause_inference: string;
  timestamp: string;
}

export type LNGSignal = DestinationPrediction | RerouteDetection | DelayAnomaly;

// Historical route patterns: heading ranges to destination regions
const HEADING_DESTINATION_MAP: { heading_min: number; heading_max: number; destination: string; country: string }[] = [
  { heading_min: 240, heading_max: 290, destination: 'Futtsu', country: 'Japan' },
  { heading_min: 235, heading_max: 265, destination: 'Sodegaura', country: 'Japan' },
  { heading_min: 250, heading_max: 280, destination: 'Pyeongtaek', country: 'South Korea' },
  { heading_min: 245, heading_max: 275, destination: 'Incheon', country: 'South Korea' },
  { heading_min: 230, heading_max: 260, destination: 'Shanghai', country: 'China' },
  { heading_min: 220, heading_max: 255, destination: 'Guangzhou', country: 'China' },
  { heading_min: 225, heading_max: 260, destination: 'Tianjin', country: 'China' },
  { heading_min: 235, heading_max: 270, destination: 'Yung An', country: 'Taiwan' },
  { heading_min: 230, heading_max: 265, destination: 'Taichung', country: 'Taiwan' },
  { heading_min: 255, heading_max: 285, destination: 'Tongyeong', country: 'South Korea' },
];

export function generateDestinationPrediction(input: {
  vessel: string;
  imo: string;
  origin_terminal: string;
  heading: number;
  speed_knots: number;
  historical_destination?: string;
}): DestinationPrediction {
  // Match heading to likely destination
  const matches = HEADING_DESTINATION_MAP.filter(
    m => input.heading >= m.heading_min && input.heading <= m.heading_max
  );

  let predicted = matches[0] || { destination: 'Unknown', country: 'Unknown' };
  let confidence = 0.70;
  let reasoning = `Heading ${input.heading}° at ${input.speed_knots}kn`;

  // Historical pattern match boosts confidence
  if (input.historical_destination && matches.some(m => m.destination === input.historical_destination)) {
    predicted = matches.find(m => m.destination === input.historical_destination) || predicted;
    confidence += 0.12;
    reasoning += ` — matches historical pattern to ${predicted.destination}`;
  }

  // Speed factor: consistent cruising speed (14-19kn) boosts confidence
  if (input.speed_knots >= 14 && input.speed_knots <= 19) {
    confidence += 0.05;
    reasoning += ', consistent cruising speed';
  } else if (input.speed_knots < 10) {
    confidence -= 0.08;
    reasoning += ', slow speed may indicate course change';
  }

  confidence = Math.min(0.95, Math.max(0.45, confidence));

  return {
    type: 'destination_prediction',
    vessel: input.vessel,
    imo: input.imo,
    origin_terminal: input.origin_terminal,
    predicted_destination: predicted.destination,
    predicted_country: predicted.country,
    confidence: parseFloat(confidence.toFixed(3)),
    reasoning,
    status: confidence >= 0.65 ? 'high_confidence' : 'suppressed',
    timestamp: new Date().toISOString(),
  };
}

export function generateRerouteDetection(input: {
  vessel: string;
  imo: string;
  origin_terminal: string;
  original_destination: string;
  new_heading: number;
  speed_change_knots: number;
  heading_shift_degrees: number;
}): RerouteDetection {
  // Determine new likely destination from shifted heading
  const matches = HEADING_DESTINATION_MAP.filter(
    m => input.new_heading >= m.heading_min && input.new_heading <= m.heading_max
  );
  const newDest = matches.find(m => m.destination !== input.original_destination) || matches[0] || { destination: 'Unknown' };

  // Confidence based on deviation magnitude
  let confidence = 0.60;
  if (Math.abs(input.heading_shift_degrees) > 15) confidence += 0.10;
  if (Math.abs(input.heading_shift_degrees) > 30) confidence += 0.08;
  if (Math.abs(input.speed_change_knots) > 3) confidence += 0.06;

  const deviation_hours = Math.round(Math.abs(input.heading_shift_degrees) * 0.8 + Math.abs(input.speed_change_knots) * 2);

  confidence = Math.min(0.95, Math.max(0.45, confidence));

  return {
    type: 'reroute',
    vessel: input.vessel,
    imo: input.imo,
    origin_terminal: input.origin_terminal,
    original_destination: input.original_destination,
    new_likely_destination: newDest.destination,
    deviation_hours,
    confidence: parseFloat(confidence.toFixed(3)),
    anomaly_note: `Heading shifted ${input.heading_shift_degrees}° with ${input.speed_change_knots}kn speed change — probable reroute from ${input.original_destination} to ${newDest.destination}`,
    timestamp: new Date().toISOString(),
  };
}

export function generateDelayAnomaly(input: {
  vessel: string;
  imo: string;
  origin_terminal: string;
  expected_arrival: string;
  speed_drop_knots: number;
  congestion_factor?: number;
}): DelayAnomaly {
  // Calculate delay from speed drop
  const delay_hours = Math.round(input.speed_drop_knots * 4 + (input.congestion_factor || 0) * 12);

  const expected = new Date(input.expected_arrival);
  const revised = new Date(expected.getTime() + delay_hours * 3600000);

  let confidence = 0.65;
  if (input.speed_drop_knots > 5) confidence += 0.10;
  if (input.congestion_factor && input.congestion_factor > 0.5) confidence += 0.08;
  if (delay_hours > 24) confidence += 0.05;

  confidence = Math.min(0.95, Math.max(0.45, confidence));

  let cause = `Speed reduction of ${input.speed_drop_knots}kn detected`;
  if (input.congestion_factor && input.congestion_factor > 0.5) {
    cause += ` — destination port congestion factor: ${(input.congestion_factor * 100).toFixed(0)}%`;
  }
  if (delay_hours > 36) {
    cause += ' — significant ETA revision, possible weather or scheduling delay';
  }

  return {
    type: 'delay',
    vessel: input.vessel,
    imo: input.imo,
    origin_terminal: input.origin_terminal,
    expected_arrival: expected.toISOString(),
    revised_arrival: revised.toISOString(),
    delay_hours,
    confidence: parseFloat(confidence.toFixed(3)),
    cause_inference: cause,
    timestamp: new Date().toISOString(),
  };
}

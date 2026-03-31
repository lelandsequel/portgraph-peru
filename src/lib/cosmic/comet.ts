// COMET — Route Continuity Engine
// Determines if a shipment path is confirmed/partial/broken

export interface CometResult {
  route_status: 'confirmed' | 'partial' | 'broken';
  continuity_score: number;
  anomalies: string[];
}

interface RouteInput {
  origin_country?: string;
  origin_port?: string;
  loading_port?: string;
  loading_port_unlocode?: string;
  vessel_name?: string;
  vessel_imo?: string;
  destination_port?: string;
  destination_country?: string;
  expected_destination?: string;
  arrival_time?: string;
  departure_time?: string;
  match_method?: string;
  confidence_score?: number;
}

// Known high-frequency routes for baseline comparison
const KNOWN_ROUTES: Record<string, string[]> = {
  'peru': ['china', 'japan', 'south korea', 'india', 'germany', 'netherlands', 'spain'],
  'chile': ['china', 'japan', 'south korea', 'india', 'netherlands'],
  'australia': ['china', 'japan', 'south korea', 'india'],
  'brazil': ['china', 'netherlands', 'japan', 'germany'],
  'indonesia': ['china', 'india', 'japan', 'south korea'],
  'south africa': ['china', 'india', 'japan'],
  'canada': ['china', 'japan', 'india', 'south korea'],
  'russia': ['china', 'india', 'turkey'],
  'drc': ['china', 'south korea', 'japan'],
  'guinea': ['china', 'india'],
};

export function evaluateRouteContinuity(input: RouteInput): CometResult {
  const anomalies: string[] = [];
  let score = 0;
  const maxPoints = 6;

  // 1. Origin present
  if (input.origin_country || input.origin_port) {
    score += 1;
  } else {
    anomalies.push('Missing origin data');
  }

  // 2. Loading port present and matches
  if (input.loading_port_unlocode || input.loading_port) {
    score += 1;
  } else {
    anomalies.push('Loading port unknown');
  }

  // 3. Vessel identified
  if (input.vessel_imo) {
    score += 1;
  } else if (input.vessel_name) {
    score += 0.7;
    anomalies.push('Vessel identified by name only (no IMO)');
  } else {
    anomalies.push('No vessel identification');
  }

  // 4. Destination known
  if (input.destination_port) {
    score += 1;
  } else if (input.destination_country) {
    score += 0.6;
    anomalies.push('Destination country known but specific port unknown');
  } else {
    anomalies.push('Destination unknown');
  }

  // 5. Route matches expected pattern
  if (input.destination_country && input.origin_country) {
    const origin = input.origin_country.toLowerCase();
    const dest = input.destination_country.toLowerCase();
    const knownDests = KNOWN_ROUTES[origin] || [];
    if (knownDests.some(d => dest.includes(d))) {
      score += 1;
    } else {
      score += 0.3;
      anomalies.push(`Unusual route: ${input.origin_country} -> ${input.destination_country}`);
    }
  }

  // 6. Expected vs actual destination match
  if (input.expected_destination && input.destination_country) {
    if (input.expected_destination.toLowerCase() === input.destination_country.toLowerCase()) {
      score += 1;
    } else {
      score += 0.2;
      anomalies.push(`Route deviation: expected ${input.expected_destination}, actual ${input.destination_country}`);
    }
  } else if (input.match_method === 'route_confirmed') {
    score += 1;
  } else {
    score += 0.4; // partial credit for no expected route to compare
  }

  const continuity_score = parseFloat((score / maxPoints).toFixed(3));

  let route_status: CometResult['route_status'];
  if (continuity_score >= 0.75) {
    route_status = 'confirmed';
  } else if (continuity_score >= 0.45) {
    route_status = 'partial';
  } else {
    route_status = 'broken';
  }

  return { route_status, continuity_score, anomalies };
}

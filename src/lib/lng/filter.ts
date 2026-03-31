// LNG Filter Layer — US Gulf Coast → Asia-Pacific
// Filters vessels/routes to LNG carriers on target corridors

export interface LNGTerminal {
  name: string;
  location: string;
  country: string;
  unlocode?: string;
}

export const ORIGIN_TERMINALS: LNGTerminal[] = [
  { name: 'Sabine Pass LNG', location: 'Sabine Pass, TX', country: 'USA', unlocode: 'USSAB' },
  { name: 'Corpus Christi LNG', location: 'Corpus Christi, TX', country: 'USA', unlocode: 'USCCR' },
  { name: 'Freeport LNG', location: 'Quintana, TX', country: 'USA', unlocode: 'USFPT' },
  { name: 'Cameron LNG', location: 'Hackberry, LA', country: 'USA', unlocode: 'USCAM' },
];

export const DESTINATION_TERMINALS: LNGTerminal[] = [
  // Japan
  { name: 'Futtsu', location: 'Futtsu', country: 'Japan' },
  { name: 'Sodegaura', location: 'Sodegaura', country: 'Japan' },
  { name: 'Ohgishima', location: 'Ohgishima', country: 'Japan' },
  { name: 'Niigata', location: 'Niigata', country: 'Japan' },
  // South Korea
  { name: 'Pyeongtaek', location: 'Pyeongtaek', country: 'South Korea' },
  { name: 'Incheon', location: 'Incheon', country: 'South Korea' },
  { name: 'Tongyeong', location: 'Tongyeong', country: 'South Korea' },
  // China
  { name: 'Guangzhou', location: 'Guangzhou', country: 'China' },
  { name: 'Shanghai', location: 'Shanghai', country: 'China' },
  { name: 'Tianjin', location: 'Tianjin', country: 'China' },
  // Taiwan
  { name: 'Yung An', location: 'Yung An', country: 'Taiwan' },
  { name: 'Taichung', location: 'Taichung', country: 'Taiwan' },
];

export interface LNGVessel {
  vessel_name: string;
  imo: string;
  vessel_type?: string;
  commodity?: string;
  origin_terminal?: string;
  origin_location?: string;
  destination?: string;
  destination_country?: string;
  heading?: number;
  speed_knots?: number;
  lat?: number;
  lng?: number;
}

function matchesOrigin(vessel: LNGVessel): boolean {
  const origin = (vessel.origin_terminal || vessel.origin_location || '').toLowerCase();
  return ORIGIN_TERMINALS.some(t =>
    origin.includes(t.name.toLowerCase()) ||
    origin.includes(t.location.toLowerCase().split(',')[0])
  );
}

function matchesDestination(vessel: LNGVessel): boolean {
  const dest = (vessel.destination || '').toLowerCase();
  const destCountry = (vessel.destination_country || '').toLowerCase();
  return DESTINATION_TERMINALS.some(t =>
    dest.includes(t.name.toLowerCase()) ||
    dest.includes(t.location.toLowerCase()) ||
    destCountry.includes(t.country.toLowerCase())
  );
}

function isLNGC(vessel: LNGVessel): boolean {
  const type = (vessel.vessel_type || '').toLowerCase();
  const commodity = (vessel.commodity || '').toLowerCase();
  return type.includes('lng') || commodity === 'lng' || commodity.includes('liquefied natural gas');
}

export function filterLNGVessels(vessels: LNGVessel[]): LNGVessel[] {
  return vessels.filter(v => isLNGC(v) && (matchesOrigin(v) || matchesDestination(v)));
}

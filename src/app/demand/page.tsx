'use client';

const IMPORTERS = [
  { country: 'China', flag: '🇨🇳', commodities: ['Copper', 'Iron Ore', 'Soy', 'Cobalt', 'Nickel', 'Bauxite'], share: '38%' },
  { country: 'India', flag: '🇮🇳', commodities: ['Coal', 'Iron Ore', 'Potash', 'Copper'], share: '15%' },
  { country: 'Japan', flag: '🇯🇵', commodities: ['Coal', 'Iron Ore', 'Copper', 'Zinc'], share: '9%' },
  { country: 'European Union', flag: '🇪🇺', commodities: ['Iron Ore', 'Coal', 'Grain', 'Copper'], share: '12%' },
  { country: 'South Korea', flag: '🇰🇷', commodities: ['Iron Ore', 'Coal', 'Zinc', 'Copper'], share: '6%' },
  { country: 'Turkey', flag: '🇹🇷', commodities: ['Wheat', 'Coal', 'Iron Ore'], share: '4%' },
  { country: 'Taiwan', flag: '🇹🇼', commodities: ['Coal', 'Iron Ore', 'Copper'], share: '3%' },
  { country: 'Thailand', flag: '🇹🇭', commodities: ['Coal', 'Iron Ore', 'Copper'], share: '2%' },
];

export default function DemandPage() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#C6A86B] mb-1" style={{ fontFamily: 'Sora, Manrope' }}>
          Demand Intelligence
        </h1>
        <p className="text-[#6b7a8d] text-sm">
          Who&apos;s buying what — top importer profiles by commodity
        </p>
      </div>

      {/* Status */}
      <div className="bg-[#121722] border border-[#1e2535] p-5 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#C6A86B] animate-pulse" />
          <span className="text-sm text-[#C6A86B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Data loading...</span>
        </div>
        <p className="text-xs text-[#6b7a8d]">
          Demand intelligence will populate as bilateral trade data is processed. Importer volumes and trend data incoming.
        </p>
      </div>

      {/* Importer cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#1e2535]">
        {IMPORTERS.map(imp => (
          <div key={imp.country} className="bg-[#121722] p-5 hover:bg-[#1a2030] transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{imp.flag}</span>
              <div>
                <p className="text-sm font-medium text-[#e0e6ed]" style={{ fontFamily: 'Manrope' }}>{imp.country}</p>
                <p className="text-[10px] text-[#6b7a8d]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{imp.share} of monitored imports</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {imp.commodities.map(c => (
                <span key={c} className="text-[10px] px-2 py-0.5 bg-[#1a2030] text-[#8a9bb0] border border-[#1e2535]">{c}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

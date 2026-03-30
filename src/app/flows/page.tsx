'use client';

const CORRIDORS = [
  'Chile → China (Copper)',
  'Australia → China (Iron Ore)',
  'Brazil → China (Soy)',
  'Indonesia → India (Coal)',
  'DRC → China (Cobalt)',
  'South Africa → India (Coal)',
  'Peru → China (Copper)',
  'Canada → India (Potash)',
  'Russia → Turkey (Wheat)',
  'Guinea → China (Bauxite)',
  'Kazakhstan → China (Uranium)',
  'Ukraine → EU (Grain)',
  'Australia → Japan (Coal)',
  'Brazil → EU (Iron Ore)',
];

export default function FlowsPage() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#C6A86B] mb-1" style={{ fontFamily: 'Sora, Manrope' }}>
          Flow Arc Intelligence
        </h1>
        <p className="text-[#6b7a8d] text-sm">
          Bilateral commodity flow analysis — powered by UN Comtrade data
        </p>
      </div>

      {/* Status */}
      <div className="bg-[#121722] border border-[#1e2535] p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#C6A86B] animate-pulse" />
          <span className="text-sm text-[#C6A86B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Loading data...</span>
        </div>
        <p className="text-xs text-[#6b7a8d] mb-4">
          Flow arc intelligence is being populated. Bilateral trade data from UN Comtrade is being processed
          across all monitored corridors.
        </p>
        <div className="grid grid-cols-2 gap-px bg-[#1e2535]">
          <div className="bg-[#0B0E13] p-4">
            <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Active Corridors</p>
            <p className="text-2xl font-semibold text-[#e0e6ed]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{CORRIDORS.length}</p>
          </div>
          <div className="bg-[#0B0E13] p-4">
            <p className="text-[9px] text-[#6b7a8d] uppercase tracking-wider mb-1" style={{ fontFamily: 'Manrope' }}>Data Source</p>
            <p className="text-sm font-medium text-[#4C6A92] mt-1.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>UN Comtrade</p>
          </div>
        </div>
      </div>

      {/* Corridor list */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-[#4C6A92] uppercase tracking-[0.15em] mb-3" style={{ fontFamily: 'Manrope' }}>
          Monitored Corridors
        </h2>
        <div className="bg-[#121722] border border-[#1e2535]">
          {CORRIDORS.map((c, i) => (
            <div key={i} className={`px-4 py-3 text-xs text-[#8a9bb0] flex items-center gap-3 ${i < CORRIDORS.length - 1 ? 'border-b border-[#1e2535]/50' : ''} hover:bg-[#1a2030] transition-colors`}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              <span className="text-[#4C6A92]">•</span>
              {c}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

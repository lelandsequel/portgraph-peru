'use client';

import { useState, useCallback } from 'react';
import { TradeIntelligenceProfile, QueryType } from '@/lib/db/types';
import IntelligenceProfile from '@/components/IntelligenceProfile';

const QUERY_TYPES: { value: QueryType; label: string; placeholder: string }[] = [
  { value: 'vessel', label: 'Vessel', placeholder: 'Enter vessel name or IMO number...' },
  { value: 'company', label: 'Company', placeholder: 'Enter exporter or importer name...' },
  { value: 'commodity', label: 'Commodity', placeholder: 'copper, zinc, lead, or HS code...' },
  { value: 'country', label: 'Country', placeholder: 'Enter destination or origin country...' },
  { value: 'port', label: 'Port', placeholder: 'Callao, Matarani, PECLL, PEMRI...' },
];

const EXAMPLE_QUERIES = [
  { query: 'copper concentrate', type: 'commodity' as QueryType, label: 'Copper concentrate' },
  { query: 'China', type: 'country' as QueryType, label: 'China flows' },
  { query: 'zinc', type: 'commodity' as QueryType, label: 'Zinc ore' },
  { query: 'Japan', type: 'country' as QueryType, label: 'Japan flows' },
  { query: 'refined copper', type: 'commodity' as QueryType, label: 'Refined copper' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [queryType, setQueryType] = useState<QueryType>('commodity');
  const [profile, setProfile] = useState<TradeIntelligenceProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = useCallback(async (q: string, t: QueryType) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, type: t }),
      });
      if (!res.ok) throw new Error(`Query failed: ${res.status}`);
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery(query, queryType);
  };

  const currentType = QUERY_TYPES.find(t => t.value === queryType)!;

  return (
    <div className="p-4 sm:p-10 max-w-4xl">
      {/* Header */}
      <div className="mb-6 sm:mb-10">
        <h1 className="text-xl sm:text-3xl font-thin tracking-wide text-[#00263f] mb-2" style={{ fontFamily: 'Sora, Manrope' }}>
          Trade Intelligence
        </h1>
        <p className="text-[#72777e] text-sm leading-relaxed max-w-xl">
          Enter a vessel, company, commodity, country, or port.
          Returns a confidence-scored intelligence profile with observed, enriched, and inferred data.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(24,28,30,0.08)] p-6">
          {/* Type tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {QUERY_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setQueryType(t.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  queryType === t.value
                    ? 'bg-[#00263f] text-white'
                    : 'bg-[#f1f4f6] text-[#42474e] hover:bg-[#e5e9eb]'
                }`}
                style={{ fontFamily: 'Manrope' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={currentType.placeholder}
              className="flex-1 bg-[#f1f4f6] border-none rounded-full px-5 py-3 text-base sm:text-sm text-[#181c1e] placeholder:text-[#72777e]/60 focus:outline-none focus:ring-2 focus:ring-[#006a62]/20 min-h-[44px]"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 py-3 bg-[#00263f] text-white rounded-full text-sm font-medium hover:bg-[#0b3c5d] disabled:opacity-40 transition-colors min-h-[44px]"
              style={{ fontFamily: 'Manrope' }}
            >
              {loading ? 'Querying...' : 'Query'}
            </button>
          </div>
        </div>
      </form>

      {/* Example queries */}
      {!profile && !loading && (
        <div className="mb-8">
          <p className="text-xs text-[#72777e] uppercase tracking-widest mb-3 font-medium" style={{ fontFamily: 'Manrope' }}>
            Try these
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map(ex => (
              <button
                key={ex.query}
                onClick={() => {
                  setQuery(ex.query);
                  setQueryType(ex.type);
                  executeQuery(ex.query, ex.type);
                }}
                className="px-4 py-1.5 bg-white rounded-full text-xs text-[#42474e] hover:bg-[#e5e9eb] transition-colors shadow-sm"
                style={{ fontFamily: 'Manrope' }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-[#ffdad6] text-[#ba1a1a] rounded-lg px-5 py-4 text-sm mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#006a62]/30 border-t-[#006a62] rounded-full animate-spin" />
        </div>
      )}

      {profile && !loading && <IntelligenceProfile profile={profile} />}
    </div>
  );
}

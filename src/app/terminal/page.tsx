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

export default function TerminalPage() {
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
    <div className="p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-thin tracking-wide text-[#C6A86B] mb-1" style={{ fontFamily: 'Sora, Manrope' }}>
          Terminal
        </h1>
        <p className="text-[#6b7a8d] text-sm">
          Query intelligence profiles — vessel, company, commodity, country, or port.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="bg-[#121722] border border-[#1e2535] p-5">
          {/* Type tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {QUERY_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setQueryType(t.value)}
                className={`px-4 py-1.5 text-xs font-medium transition-all ${
                  queryType === t.value
                    ? 'bg-[#C6A86B] text-[#0B0E13]'
                    : 'bg-[#1a2030] text-[#8a9bb0] hover:bg-[#1e2535] hover:text-[#e0e6ed]'
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
              className="flex-1 bg-[#0B0E13] border border-[#1e2535] px-4 py-2.5 text-sm text-[#e0e6ed] placeholder:text-[#6b7a8d]/60 focus:outline-none focus:border-[#4C6A92] min-h-[44px]"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 py-2.5 bg-[#4C6A92] text-white text-sm font-medium hover:bg-[#5a7ba6] disabled:opacity-40 transition-colors min-h-[44px]"
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
          <p className="text-[9px] text-[#6b7a8d] uppercase tracking-[0.15em] mb-3 font-medium" style={{ fontFamily: 'Manrope' }}>
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
                className="px-4 py-1.5 bg-[#121722] border border-[#1e2535] text-xs text-[#8a9bb0] hover:bg-[#1a2030] hover:text-[#e0e6ed] transition-colors"
                style={{ fontFamily: 'Manrope' }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 px-5 py-4 text-sm mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#4C6A92]/30 border-t-[#4C6A92] rounded-full animate-spin" />
        </div>
      )}

      {profile && !loading && <IntelligenceProfile profile={profile} />}
    </div>
  );
}

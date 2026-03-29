'use client';

import { useState, useCallback } from 'react';
import { TradeIntelligenceProfile, QueryType } from '@/lib/db/types';
import IntelligenceProfile from '@/components/IntelligenceProfile';
import EntityPanel from '@/components/EntityPanel';

const QUERY_TYPES: { value: QueryType; label: string; placeholder: string }[] = [
  { value: 'vessel', label: 'Vessel', placeholder: 'Enter vessel name or IMO number...' },
  { value: 'company', label: 'Company', placeholder: 'Enter exporter or importer name...' },
  { value: 'commodity', label: 'Commodity', placeholder: 'copper, zinc, lead, or HS code...' },
  { value: 'country', label: 'Country', placeholder: 'Enter destination or origin country...' },
  { value: 'port', label: 'Port', placeholder: 'Callao, Matarani, PECLL, PEMRI...' },
];

const EXAMPLE_QUERIES = [
  { query: 'copper concentrate', type: 'commodity' as QueryType, label: 'Copper concentrate exports' },
  { query: 'China', type: 'country' as QueryType, label: 'China trade flows' },
  { query: 'zinc', type: 'commodity' as QueryType, label: 'Zinc ore shipments' },
  { query: 'Japan', type: 'country' as QueryType, label: 'Japan trade flows' },
  { query: 'refined copper', type: 'commodity' as QueryType, label: 'Refined copper exports' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [queryType, setQueryType] = useState<QueryType>('commodity');
  const [profile, setProfile] = useState<TradeIntelligenceProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entityPanel, setEntityPanel] = useState<{ exporter: string; importer: string; commodity: string; value: number } | null>(null);

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

      if (!res.ok) {
        throw new Error(`Query failed: ${res.status}`);
      }

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

  const handleExample = (q: string, t: QueryType) => {
    setQuery(q);
    setQueryType(t);
    executeQuery(q, t);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Trade Intelligence Query
        </h1>
        <p className="text-gray-400 text-sm max-w-2xl mx-auto">
          Enter a vessel, company, commodity, country, or port.
          Returns a confidence-scored intelligence profile with observed, enriched, and inferred data.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {QUERY_TYPES.map(qt => (
            <button
              key={qt.value}
              type="button"
              onClick={() => setQueryType(qt.value)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                queryType === qt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {qt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={QUERY_TYPES.find(qt => qt.value === queryType)?.placeholder}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Querying...
              </span>
            ) : 'Query'}
          </button>
        </div>
      </form>

      {/* Example queries */}
      {!profile && !loading && (
        <div className="mb-8">
          <p className="text-xs text-gray-500 mb-2">Example queries:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((eq, i) => (
              <button
                key={i}
                onClick={() => handleExample(eq.query, eq.type)}
                className="px-3 py-1.5 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 rounded-md transition-colors border border-gray-700"
              >
                {eq.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-400 text-sm">Running COSMIC pipeline query...</p>
            <p className="text-gray-600 text-xs mt-1">METEOR + COMET + AURORA</p>
          </div>
        </div>
      )}

      {/* Results */}
      {profile && !loading && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setEntityPanel({
                exporter: 'Peru',
                importer: query,
                commodity: queryType === 'commodity' ? query : 'copper',
                value: 1000000,
              })}
              className="px-3 py-1.5 text-xs bg-cyan-900/50 text-cyan-400 border border-cyan-800 hover:bg-cyan-800/50 rounded-md transition-colors"
            >
              Resolve Entities &rarr;
            </button>
          </div>
          <IntelligenceProfile profile={profile} />
        </div>
      )}

      {entityPanel && (
        <EntityPanel
          exporter={entityPanel.exporter}
          importer={entityPanel.importer}
          commodity={entityPanel.commodity}
          value={entityPanel.value}
          onClose={() => setEntityPanel(null)}
        />
      )}

      {/* Footer info */}
      <div className="mt-12 border-t border-gray-800 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <p className="text-gray-400 font-medium mb-1">Data Sources</p>
            <p>OEC BACI (annual bilateral trade flows, 2019-2022)</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium mb-1">Coverage</p>
            <p>Peru mining exports: copper, zinc, lead | Country-level, annual</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium mb-1">Pipeline</p>
            <p>METEOR entity resolution + COMET chains + AURORA trust</p>
          </div>
        </div>
      </div>
    </div>
  );
}

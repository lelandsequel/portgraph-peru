'use client';

import { useState, useMemo } from 'react';
import entitiesData from '@/data/entities.json';

interface EntityRecord {
  id: string;
  name: string;
  type: string;
  commodities: string[];
  regions: string[];
  roles: string[];
  market_presence: string;
}

const allEntities: EntityRecord[] = entitiesData as EntityRecord[];

function presenceBadge(p: string) {
  if (p === 'major') return 'bg-cyan-900/50 text-cyan-400 border-cyan-800';
  if (p === 'significant') return 'bg-blue-900/50 text-blue-400 border-blue-800';
  return 'bg-gray-800 text-gray-400 border-gray-700';
}

function typeBadge(t: string) {
  if (t === 'miner') return 'bg-amber-900/50 text-amber-400 border-amber-800';
  if (t === 'trader') return 'bg-purple-900/50 text-purple-400 border-purple-800';
  if (t === 'buyer') return 'bg-emerald-900/50 text-emerald-400 border-emerald-800';
  return 'bg-blue-900/50 text-blue-400 border-blue-800'; // miner_trader
}

export default function EntitiesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [commodityFilter, setCommodityFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');

  const allCommodities = useMemo(() => {
    const s = new Set<string>();
    allEntities.forEach(e => e.commodities.forEach(c => s.add(c)));
    return Array.from(s).sort();
  }, []);

  const allRegions = useMemo(() => {
    const s = new Set<string>();
    allEntities.forEach(e => e.regions.forEach(r => s.add(r)));
    return Array.from(s).sort();
  }, []);

  const filtered = allEntities.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.id.includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (commodityFilter !== 'all' && !e.commodities.includes(commodityFilter)) return false;
    if (regionFilter !== 'all' && !e.regions.includes(regionFilter)) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Entity Directory</h1>
        <p className="text-gray-400 text-sm">Mining companies, commodity traders, and refiners in Peru&apos;s export corridors</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search entities..."
          className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 w-64"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300">
          <option value="all">All Types</option>
          <option value="miner">Miner</option>
          <option value="trader">Trader</option>
          <option value="buyer">Buyer</option>
          <option value="miner_trader">Miner/Trader</option>
        </select>
        <select value={commodityFilter} onChange={e => setCommodityFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300">
          <option value="all">All Commodities</option>
          {allCommodities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-300">
          <option value="all">All Regions</option>
          {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(entity => (
          <div key={entity.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">{entity.name}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${presenceBadge(entity.market_presence)}`}>
                {entity.market_presence}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeBadge(entity.type)}`}>
                {entity.type.replace('_', '/')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {entity.commodities.map(c => (
                <span key={c} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {entity.regions.map(r => (
                <span key={r} className="text-[10px] text-gray-600">{r}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center text-xs text-gray-600">
        Showing {filtered.length} of {allEntities.length} entities
      </div>
    </div>
  );
}

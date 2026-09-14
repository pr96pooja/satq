import React, { useState } from 'react';
import { Search, Sparkles, Send, MapPin, Zap } from 'lucide-react';

const CommandBar = ({ onDispatchQuery, isLoading }) => {
  const [query, setQuery] = useState('');

  const samplePresets = [
    { label: '🌊 Valencia Flood Assessment', text: 'Compare Sentinel-2 imagery for Valencia flood disaster and detect inundated regions' },
    { label: '🌳 Amazon Deforestation', text: 'Analyze Amazon deforestation in Rondônia with NDVI change contours' },
    { label: '🌉 SF Bay Urban Grounding', text: 'Inspect San Francisco Bay area with VLM visual grounding for industrial complexes' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onDispatchQuery(query);
  };

  const handleSelectPreset = (text) => {
    setQuery(text);
    onDispatchQuery(text);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-3.5 text-cyan-400">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask GeoPulse AI Agent (e.g. 'Compare Sentinel-2 Valencia flood imagery and ground flooded zones')..."
          className="w-full pl-11 pr-28 py-3 bg-slate-950/80 border border-cyan-500/40 rounded-2xl font-mono text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-2xl backdrop-blur-md"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="absolute right-2 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-lg"
        >
          {isLoading ? (
            <Zap className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <span>RUN AGENT</span>
              <Send className="w-3 h-3" />
            </>
          )}
        </button>
      </form>

      {/* Quick Preset Buttons */}
      <div className="flex items-center space-x-2 mt-2 overflow-x-auto pb-1">
        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider whitespace-nowrap">
          Presets:
        </span>
        {samplePresets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectPreset(p.text)}
            className="px-2.5 py-1 bg-slate-900/60 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 rounded-lg text-[10px] font-mono text-slate-300 transition-all whitespace-nowrap"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CommandBar;

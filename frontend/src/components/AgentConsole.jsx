import React, { useEffect, useRef } from 'react';
import { Terminal, Activity, CheckCircle2, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

const AgentConsole = ({ traceLogs = [], isExpanded = true, onToggleExpand }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [traceLogs]);

  const getBadgeStyle = (agent) => {
    switch (agent) {
      case 'INTENT_PARSER':
        return 'bg-purple-950/60 text-purple-300 border-purple-800';
      case 'STAC_ENGINE':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-800';
      case 'RASTER_PROCESSOR':
        return 'bg-amber-950/60 text-amber-300 border-amber-800';
      case 'BI_TEMPORAL_ENGINE':
        return 'bg-rose-950/60 text-rose-300 border-rose-800';
      case 'VLM_GROUNDING':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div
      className={`tactical-glass transition-all duration-300 flex flex-col border-t md:border-l border-cyan-500/20 z-40 ${
        isExpanded ? 'w-full md:w-96 h-64 md:h-full' : 'w-full md:w-12 h-10 md:h-full'
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Agent Trace Console
          </span>
          <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">
            LIVE
          </span>
        </div>
        <button
          onClick={onToggleExpand}
          className="text-slate-400 hover:text-cyan-400 p-1 font-mono text-xs"
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {isExpanded && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#060a12]/90 font-mono">
          {/* Status Metric Bar */}
          <div className="grid grid-cols-3 gap-1 p-2 bg-slate-900/40 border-b border-slate-800 text-[10px]">
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <Activity className="w-3 h-3" />
              <span>STAC: Ready</span>
            </div>
            <div className="flex items-center space-x-1.5 text-cyan-400">
              <Sparkles className="w-3 h-3" />
              <span>VLM: Active</span>
            </div>
            <div className="flex items-center space-x-1.5 text-purple-400">
              <Cpu className="w-3 h-3" />
              <span>NumPy: 60 FPS</span>
            </div>
          </div>

          {/* Terminal Logs Container */}
          <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {traceLogs.length === 0 ? (
              <div className="text-slate-500 italic text-[11px] py-4 text-center">
                Waiting for natural language query dispatch...
              </div>
            ) : (
              traceLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/30 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${getBadgeStyle(log.agent)}`}>
                      [{log.agent || 'SYSTEM'}]
                    </span>
                    <span className="text-[10px] text-slate-500">Step {log.step || idx + 1}</span>
                  </div>
                  <div className="text-slate-300 text-[11px] leading-relaxed break-words font-mono">
                    {log.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentConsole;

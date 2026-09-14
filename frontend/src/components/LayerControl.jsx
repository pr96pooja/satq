import React, { useState } from 'react';
import { Layers, Eye, Compass, Moon, Sun, Globe, Radio, Cpu } from 'lucide-react';

const LayerControl = ({
  activeBasemap,
  onBasemapChange,
  activeOverlays,
  onToggleOverlay,
  pitch,
  onPitchChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const basemaps = [
    { id: 'dark', name: 'Dark Tactical', icon: Moon, desc: 'Cybernetic vector basemap' },
    { id: 'imagery', name: 'Esri World Imagery', icon: Sun, desc: 'High-res optical satellite' },
    { id: 'nasa-nightlights', name: 'NASA VIIRS Night Lights', icon: Radio, desc: 'Global nocturnal radiance' },
    { id: 'nasa-modis', name: 'NASA MODIS Terra', icon: Globe, desc: 'Daily global true color' }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="tactical-glass hover:bg-slate-800/80 text-cyan-400 p-2.5 rounded-xl border border-cyan-500/30 shadow-lg flex items-center space-x-2 transition-all"
        title="Cartography & Basemap Control"
      >
        <Layers className="w-5 h-5 text-cyan-400" />
        <span className="font-mono text-xs font-semibold uppercase tracking-wider hidden md:inline">
          Layers & GIBS
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 tactical-glass rounded-2xl p-4 border border-cyan-500/30 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                Cartography Selector
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-cyan-400 text-xs font-mono"
            >
              ✕
            </button>
          </div>

          {/* Basemap Options */}
          <div className="space-y-2 mb-4">
            <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Basemap Engine (Optical / GIBS)
            </label>
            {basemaps.map((bm) => {
              const Icon = bm.icon;
              const isSelected = activeBasemap === bm.id;
              return (
                <button
                  key={bm.id}
                  onClick={() => onBasemapChange(bm.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 tactical-glow'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-mono text-xs font-semibold">{bm.name}</div>
                      <div className="text-[10px] text-slate-400">{bm.desc}</div>
                    </div>
                  </div>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>}
                </button>
              );
            })}
          </div>

          {/* Dynamic Overlay Layer Toggles */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Inspection Vector Overlays
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onToggleOverlay('changePolys')}
                className={`p-2 rounded-lg border text-left font-mono text-[11px] flex items-center justify-between ${
                  activeOverlays.changePolys
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}
              >
                <span>Change Contours</span>
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onToggleOverlay('vlmBoxes')}
                className={`p-2 rounded-lg border text-left font-mono text-[11px] flex items-center justify-between ${
                  activeOverlays.vlmBoxes
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}
              >
                <span>VLM Grounding</span>
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3D Pitch Control */}
          <div className="border-t border-slate-800 pt-3 mt-3 flex items-center justify-between">
            <span className="font-mono text-[11px] text-slate-400 flex items-center space-x-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D Pitch Angle ({pitch}°)</span>
            </span>
            <button
              onClick={() => onPitchChange(pitch === 0 ? 55 : 0)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 font-mono text-[10px] text-cyan-300 border border-slate-700"
            >
              {pitch === 0 ? 'Enable 3D Tilt' : 'Reset Flat'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayerControl;

import React from 'react';
import { Activity, BarChart2, CheckCircle2, Shield, Eye, Layers } from 'lucide-react';

const SpectralInspector = ({
  activeSpectralIndex = "NDWI",
  onSelectIndex,
  spectralData = null,
  changeData = null,
  vlmData = null
}) => {
  const getFormula = (index) => {
    switch (index) {
      case 'NDVI':
        return '(B08 - B04) / (B08 + B04)';
      case 'NDWI':
        return '(B03 - B08) / (B03 + B08)';
      case 'NDBI':
        return '(B11 - B08) / (B11 + B08)';
      case 'FALSE_COLOR':
        return 'NIR (B08) | Red (B04) | Green (B03)';
      default:
        return '(B08 - B04) / (B08 + B04)';
    }
  };

  return (
    <div className="tactical-glass p-3 rounded-2xl border border-cyan-500/30 w-80 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Spectral & VLM Inspector
          </span>
        </div>
        <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">
          NUMPY ARITHMETIC
        </span>
      </div>

      {/* Index Selector Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
        {['NDWI', 'NDVI', 'NDBI', 'FALSE_COLOR'].map((idxKey) => (
          <button
            key={idxKey}
            onClick={() => onSelectIndex(idxKey)}
            className={`py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${
              activeSpectralIndex === idxKey
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {idxKey === 'FALSE_COLOR' ? 'RGB' : idxKey}
          </button>
        ))}
      </div>

      {/* Formula & Raster Metrics */}
      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 font-mono">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Formula Definition</span>
          <span className="text-cyan-400 font-bold">{activeSpectralIndex}</span>
        </div>
        <div className="p-2 rounded bg-slate-950 text-cyan-300 text-xs font-bold border border-slate-800 text-center">
          {getFormula(activeSpectralIndex)}
        </div>
        {spectralData && (
          <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-slate-300 text-center">
            <div className="p-1 rounded bg-slate-950 border border-slate-800">
              <div className="text-slate-500">MEAN</div>
              <div className="font-bold text-cyan-400">{spectralData.mean_val.toFixed(3)}</div>
            </div>
            <div className="p-1 rounded bg-slate-950 border border-slate-800">
              <div className="text-slate-500">MIN</div>
              <div className="font-bold text-slate-300">{spectralData.min_val.toFixed(2)}</div>
            </div>
            <div className="p-1 rounded bg-slate-950 border border-slate-800">
              <div className="text-slate-500">MAX</div>
              <div className="font-bold text-rose-400">{spectralData.max_val.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Bi-Temporal Change Detection Contour Summary */}
      {changeData && changeData.geojson_contours && (
        <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1 font-mono">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-rose-300">Bi-Temporal Delta ΔShift</span>
            <span className="text-[10px] text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800">
              {changeData.geojson_contours.features.length} Polygons
            </span>
          </div>
          <div className="text-[10px] text-slate-300">
            Detected inundation vector contours with area &gt; 200m²
          </div>
        </div>
      )}

      {/* VLM Visual Grounding Target Cards */}
      {vlmData && vlmData.geojson && (
        <div className="space-y-1.5 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>VLM Visual Grounding</span>
            <span className="text-cyan-400 font-bold">{vlmData.detections_count} Targets</span>
          </div>
          {vlmData.geojson.features.map((feat, idx) => (
            <div
              key={idx}
              className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between text-[11px]"
            >
              <div>
                <div className="font-bold text-cyan-300">{feat.properties.label}</div>
                <div className="text-[9px] text-slate-400">
                  Geo Center: [{feat.properties.geo_center[0]}, {feat.properties.geo_center[1]}]
                </div>
              </div>
              <div className="px-1.5 py-0.5 rounded bg-cyan-900 text-cyan-200 font-bold text-[10px]">
                {(feat.properties.confidence * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpectralInspector;

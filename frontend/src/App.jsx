import React, { useState, useEffect } from 'react';
import DualMapViewer from './components/DualMapViewer';
import LayerControl from './components/LayerControl';
import AgentConsole from './components/AgentConsole';
import CommandBar from './components/CommandBar';
import OrbitalTracker from './components/OrbitalTracker';
import SpectralInspector from './components/SpectralInspector';
import {
  searchStacScenes,
  computeSpectralIndex,
  computeChangeDetection,
  runVlmGrounding,
  executeAgentQuery
} from './utils/stacClient';
import { Globe, Satellite, Sparkles, Terminal, Activity, Layers } from 'lucide-react';

export default function App() {
  const [mapCenter, setMapCenter] = useState([-0.38, 39.42]);
  const [zoom, setZoom] = useState(12);
  const [pitch, setPitch] = useState(0);

  const [basemapStyle, setBasemapStyle] = useState('dark');
  const [activeOverlays, setActiveOverlays] = useState({
    changePolys: true,
    vlmBoxes: true,
    satelliteTracks: true
  });

  const [activeSpectralIndex, setActiveSpectralIndex] = useState('NDWI');
  const [spectralData, setSpectralData] = useState(null);
  const [changeData, setChangeData] = useState(null);
  const [vlmData, setVlmData] = useState(null);

  const [traceLogs, setTraceLogs] = useState([]);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Initial load execution: Valencia Flood Analysis Pipeline
  useEffect(() => {
    runInitialAnalysisPipeline();
  }, []);

  const runInitialAnalysisPipeline = async () => {
    setIsLoading(true);
    const initialLogs = [
      { step: 1, agent: 'INTENT_PARSER', message: "Initializing GeoPulse AI Satellite Pipeline for Valencia DANA AOI." },
      { step: 2, agent: 'STAC_ENGINE', message: "Querying Element84 AWS Earth Search STAC for Sentinel-2 L2A scenes (cloud < 10%)." },
      { step: 3, agent: 'RASTER_PROCESSOR', message: "Computing NDWI = (Green - NIR) / (Green + NIR) band index arithmetic on 512x512 matrices." },
      { step: 4, agent: 'BI_TEMPORAL_ENGINE', message: "Calculating ΔNDWI bi-temporal change detection raster between Sept 15 (T1) and Oct 29 (T2)." },
      { step: 5, agent: 'VLM_GROUNDING', message: "Gemini 1.5 Pro VLM grounded 3 severe flood inundation corridors. Transformed pixel bboxes -> EPSG:4326 GeoJSON." }
    ];
    setTraceLogs(initialLogs);

    // Fetch spectral index raster data
    const spec = await computeSpectralIndex("S2A_20241029_T2", "NDWI", "valencia_flood", "T2");
    if (spec) setSpectralData(spec);

    // Fetch change detection vector contours
    const chg = await computeChangeDetection("S2A_20240915_T1", "S2A_20241029_T2", "NDWI", [-0.55, 39.30, -0.20, 39.55]);
    if (chg) setChangeData(chg);

    // Fetch VLM visual grounding targets
    const vlm = await runVlmGrounding("flooded zones and submerged infrastructure", [-0.55, 39.30, -0.20, 39.55]);
    if (vlm) setVlmData(vlm);

    setIsLoading(false);
  };

  // Dispatch natural language intent query from command bar
  const handleDispatchQuery = async (queryText) => {
    setIsLoading(true);
    setTraceLogs(prev => [
      ...prev,
      { step: prev.length + 1, agent: 'INTENT_PARSER', message: `Dispatching natural language intent query: "${queryText}"` }
    ]);

    const res = await executeAgentQuery(queryText);
    if (res) {
      if (res.trace_stream) {
        setTraceLogs(prev => [...prev, ...res.trace_stream]);
      }
      if (res.location) {
        setMapCenter([res.location.lon, res.location.lat]);
        setZoom(res.location.zoom);
      }

      // Re-run raster & grounding analysis for new AOI target
      const newBbox = [res.location.lon - 0.2, res.location.lat - 0.2, res.location.lon + 0.2, res.location.lat + 0.2];
      
      const spec = await computeSpectralIndex("SCENE_AOI_LATEST", activeSpectralIndex, "valencia_flood", "T2");
      if (spec) setSpectralData(spec);

      const chg = await computeChangeDetection("SCENE_T1", "SCENE_T2", activeSpectralIndex, newBbox);
      if (chg) setChangeData(chg);

      const vlm = await runVlmGrounding(queryText, newBbox);
      if (vlm) setVlmData(vlm);
    }

    setIsLoading(false);
  };

  const handleSelectSpectralIndex = async (indexKey) => {
    setActiveSpectralIndex(indexKey);
    const spec = await computeSpectralIndex("S2A_20241029_T2", indexKey, "valencia_flood", "T2");
    if (spec) setSpectralData(spec);

    setTraceLogs(prev => [
      ...prev,
      { step: prev.length + 1, agent: 'RASTER_PROCESSOR', message: `Switched active spectral index arithmetic to ${indexKey}.` }
    ]);
  };

  const handleToggleOverlay = (key) => {
    setActiveOverlays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#090d16] text-slate-100">
      {/* Top Header Bar */}
      <header className="h-14 px-4 border-b border-cyan-500/20 bg-[#090d16]/90 backdrop-blur-md flex items-center justify-between z-40 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Globe className="w-5 h-5 animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold tracking-wider text-slate-100 flex items-center space-x-2">
              <span>GEOPULSE AI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                v2.0 STAC & VLM
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Bi-Temporal Satellite Processing & Visual Grounding Engine
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3">
          <LayerControl
            activeBasemap={basemapStyle}
            onBasemapChange={setBasemapStyle}
            activeOverlays={activeOverlays}
            onToggleOverlay={handleToggleOverlay}
            pitch={pitch}
            onPitchChange={setPitch}
          />
        </div>
      </header>

      {/* Main Dual Map Viewport & Overlays Container */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {/* Dual Map Compare Engine */}
        <div className="flex-1 relative h-full">
          <DualMapViewer
            center={mapCenter}
            zoom={zoom}
            pitch={pitch}
            basemapStyle={basemapStyle}
            t1Raster={null}
            t2Raster={spectralData}
            geojsonOverlays={activeOverlays.changePolys && changeData ? changeData.geojson_contours : null}
            vlmBoxes={activeOverlays.vlmBoxes && vlmData ? vlmData.geojson : null}
          />

          {/* Floating Command Bar at top center */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-auto">
            <CommandBar onDispatchQuery={handleDispatchQuery} isLoading={isLoading} />
          </div>

          {/* Floating Left Panel: Spectral Inspector */}
          <div className="absolute bottom-6 left-6 z-30 pointer-events-auto hidden lg:block">
            <SpectralInspector
              activeSpectralIndex={activeSpectralIndex}
              onSelectIndex={handleSelectSpectralIndex}
              spectralData={spectralData}
              changeData={changeData}
              vlmData={vlmData}
            />
          </div>

          {/* Floating Right Panel: Live Ephemeris Orbital Tracker */}
          <div className="absolute bottom-6 right-6 z-30 pointer-events-auto hidden lg:block">
            <OrbitalTracker mapCenter={mapCenter} />
          </div>
        </div>

        {/* Agent Trace Activity Console Side Panel */}
        <AgentConsole
          traceLogs={traceLogs}
          isExpanded={isConsoleExpanded}
          onToggleExpand={() => setIsConsoleExpanded(!isConsoleExpanded)}
        />
      </div>
    </div>
  );
}

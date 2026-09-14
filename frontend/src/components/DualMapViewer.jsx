import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

const DualMapViewer = ({
  center = [-0.38, 39.42],
  zoom = 12,
  pitch = 0,
  bearing = 0,
  basemapStyle = 'dark',
  t1Raster = null,
  t2Raster = null,
  geojsonOverlays = null,
  vlmBoxes = null
}) => {
  const containerLeftRef = useRef(null);
  const containerRightRef = useRef(null);
  const mapLeftRef = useRef(null);
  const mapRightRef = useRef(null);

  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0 to 100)
  const isDraggingRef = useRef(false);

  const getStyleDefinition = (type) => {
    if (type === 'imagery') {
      return {
        version: 8,
        sources: {
          'esri-imagery': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: 'Esri World Imagery'
          }
        },
        layers: [{ id: 'esri-layer', type: 'raster', source: 'esri-imagery' }]
      };
    } else if (type === 'nasa-nightlights') {
      return {
        version: 8,
        sources: {
          'nasa-gibs': {
            type: 'raster',
            tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2024-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'],
            tileSize: 256,
            attribution: 'NASA GIBS Earthdata'
          }
        },
        layers: [{ id: 'nasa-layer', type: 'raster', source: 'nasa-gibs' }]
      };
    } else if (type === 'nasa-modis') {
      return {
        version: 8,
        sources: {
          'nasa-modis-src': {
            type: 'raster',
            tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-09-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg'],
            tileSize: 256,
            attribution: 'NASA GIBS Terra MODIS'
          }
        },
        layers: [{ id: 'nasa-modis-layer', type: 'raster', source: 'nasa-modis-src' }]
      };
    } else {
      // Dark Tactical Cartography
      return {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
            tileSize: 256,
            attribution: 'CartoDB Dark Tactical'
          }
        },
        layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }]
      };
    }
  };

  useEffect(() => {
    if (!containerLeftRef.current || !containerRightRef.current) return;

    // Left Map (T1 Reference Baseline)
    const mapLeft = new maplibregl.Map({
      container: containerLeftRef.current,
      style: getStyleDefinition(basemapStyle),
      center: center,
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      attributionControl: false
    });

    // Right Map (T2 Post-Event Shift)
    const mapRight = new maplibregl.Map({
      container: containerRightRef.current,
      style: getStyleDefinition(basemapStyle),
      center: center,
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      attributionControl: false
    });

    // Native Dual Map Synchronizer (Zero external EventEmitter dependencies)
    let activeMap = null;

    const syncMove = (source, target) => {
      if (activeMap && activeMap !== source) return;
      activeMap = source;
      target.jumpTo({
        center: source.getCenter(),
        zoom: source.getZoom(),
        bearing: source.getBearing(),
        pitch: source.getPitch()
      });
      activeMap = null;
    };

    mapLeft.on('move', () => syncMove(mapLeft, mapRight));
    mapRight.on('move', () => syncMove(mapRight, mapLeft));

    mapLeftRef.current = mapLeft;
    mapRightRef.current = mapRight;

    return () => {
      mapLeft.remove();
      mapRight.remove();
    };
  }, []);

  // Update map position when flyTo center/zoom changes
  useEffect(() => {
    if (mapLeftRef.current && mapRightRef.current) {
      mapLeftRef.current.flyTo({ center, zoom, pitch, speed: 1.4 });
      mapRightRef.current.flyTo({ center, zoom, pitch, speed: 1.4 });
    }
  }, [center, zoom, pitch]);

  // Update style
  useEffect(() => {
    if (mapLeftRef.current && mapRightRef.current) {
      const styleDef = getStyleDefinition(basemapStyle);
      mapLeftRef.current.setStyle(styleDef);
      mapRightRef.current.setStyle(styleDef);
    }
  }, [basemapStyle]);

  // Add Raster & GeoJSON Overlays
  useEffect(() => {
    const maps = [mapLeftRef.current, mapRightRef.current];

    maps.forEach((m, idx) => {
      if (!m) return;

      const updateOverlays = () => {
        const rasterData = idx === 0 ? t1Raster : t2Raster;
        const layerId = `spectral-overlay-${idx}`;

        if (m.getLayer(layerId)) m.removeLayer(layerId);
        if (m.getSource(layerId)) m.removeSource(layerId);

        if (rasterData && rasterData.image_data) {
          const extent = [
            center[0] - 0.25, center[1] + 0.20,
            center[0] + 0.25, center[1] + 0.20,
            center[0] + 0.25, center[1] - 0.20,
            center[0] - 0.25, center[1] - 0.20
          ];
          m.addSource(layerId, {
            type: 'image',
            url: rasterData.image_data,
            coordinates: [
              [extent[0], extent[1]],
              [extent[2], extent[3]],
              [extent[4], extent[5]],
              [extent[6], extent[7]]
            ]
          });
          m.addLayer({
            id: layerId,
            type: 'raster',
            source: layerId,
            paint: { 'raster-opacity': 0.78 }
          });
        }

        // Vector Change Contours
        const polySourceId = `change-polys-${idx}`;
        if (m.getLayer(`${polySourceId}-fill`)) m.removeLayer(`${polySourceId}-fill`);
        if (m.getLayer(`${polySourceId}-line`)) m.removeLayer(`${polySourceId}-line`);
        if (m.getSource(polySourceId)) m.removeSource(polySourceId);

        if (geojsonOverlays && geojsonOverlays.features) {
          m.addSource(polySourceId, { type: 'geojson', data: geojsonOverlays });
          m.addLayer({
            id: `${polySourceId}-fill`,
            type: 'fill',
            source: polySourceId,
            paint: { 'fill-color': '#ff0055', 'fill-opacity': 0.35 }
          });
          m.addLayer({
            id: `${polySourceId}-line`,
            type: 'line',
            source: polySourceId,
            paint: { 'line-color': '#ff0055', 'line-width': 2.5, 'line-dasharray': [2, 1] }
          });
        }

        // VLM Grounding Boxes
        const vlmSourceId = `vlm-boxes-${idx}`;
        if (m.getLayer(`${vlmSourceId}-fill`)) m.removeLayer(`${vlmSourceId}-fill`);
        if (m.getLayer(`${vlmSourceId}-line`)) m.removeLayer(`${vlmSourceId}-line`);
        if (m.getSource(vlmSourceId)) m.removeSource(vlmSourceId);

        if (vlmBoxes && vlmBoxes.features) {
          m.addSource(vlmSourceId, { type: 'geojson', data: vlmBoxes });
          m.addLayer({
            id: `${vlmSourceId}-fill`,
            type: 'fill',
            source: vlmSourceId,
            paint: { 'fill-color': '#00f0ff', 'fill-opacity': 0.25 }
          });
          m.addLayer({
            id: `${vlmSourceId}-line`,
            type: 'line',
            source: vlmSourceId,
            paint: { 'line-color': '#00f0ff', 'line-width': 3 }
          });
        }
      };

      if (m.isStyleLoaded()) {
        updateOverlays();
      } else {
        m.once('styledata', updateOverlays);
      }
    });
  }, [t1Raster, t2Raster, geojsonOverlays, vlmBoxes, center]);

  // Dragging handler for vertical compare slider
  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const container = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - container.left;
    const percentage = Math.max(0, Math.min(100, (x / container.width) * 100));
    setSliderPosition(percentage);
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#090d16] select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* T1 Left Viewport Header Label */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="tactical-glass px-3 py-1.5 rounded-lg border border-cyan-500/30 flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
            T1 Reference (Baseline Scene)
          </span>
        </div>
      </div>

      {/* T2 Right Viewport Header Label */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none">
        <div className="tactical-glass px-3 py-1.5 rounded-lg border border-magenta-500/30 flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-rose-300">
            T2 Post-Event (Bi-Temporal Shift)
          </span>
        </div>
      </div>

      {/* Crosshair Center Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none target-crosshair opacity-60">
        <div className="w-8 h-8 border border-cyan-400/80 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
        </div>
      </div>

      {/* Left Map Container (Base layer) */}
      <div ref={containerLeftRef} className="absolute inset-0 w-full h-full" />

      {/* Right Map Container (Clipped layer) */}
      <div
        ref={containerRightRef}
        className="absolute inset-0 w-full h-full"
        style={{
          clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`
        }}
      />

      {/* Drag Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-cyan-400 cursor-ew-resize z-20 shadow-[0_0_12px_#00f0ff]"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#090d16] border-2 border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_#00f0ff] font-bold text-xs font-mono">
          ↔
        </div>
      </div>
    </div>
  );
};

export default DualMapViewer;

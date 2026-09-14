import React, { useState, useEffect } from 'react';
import { Satellite, Radio, Clock, Sun, ShieldCheck } from 'lucide-react';
import { propagateSatellitePosition } from '../utils/orbitMath';

const OrbitalTracker = ({ mapCenter }) => {
  const [satellites, setSatellites] = useState([
    {
      name: "SENTINEL-2A",
      tle1: "1 40697U 15028A   26257.51234567  .00000123  00000-0  34567-4 0  9991",
      tle2: "2 40697  98.5700 310.1200 0001200  90.2500 270.0000 14.30825000481234",
      sensor: "MSI 13-Band Optical (10m)",
      nextPassMin: 14,
      elevation: "54.2°",
      sunlit: true
    },
    {
      name: "SENTINEL-2B",
      tle1: "1 42063U 17012A   26257.48910112  .00000110  00000-0  31200-4 0  9994",
      tle2: "2 42063  98.5710 130.4500 0001150  85.4000 274.8000 14.30823000392011",
      sensor: "MSI 13-Band Optical (10m)",
      nextPassMin: 42,
      elevation: "68.0°",
      sunlit: true
    },
    {
      name: "LANDSAT-9",
      tle1: "1 49260U 21088A   26257.55432100  .00000105  00000-0  30000-4 0  9992",
      tle2: "2 49260  98.2050  40.8500 0001400  78.1000 282.1000 14.57112000261988",
      sensor: "OLI-2 / TIRS-2 (30m)",
      nextPassMin: 85,
      elevation: "41.5°",
      sunlit: false
    }
  ]);

  const [livePos, setLivePos] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (satellites.length > 0) {
        const sat = satellites[0];
        const pos = propagateSatellitePosition(sat.tle1, sat.tle2);
        setLivePos(pos);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [satellites]);

  return (
    <div className="tactical-glass p-3 rounded-2xl border border-cyan-500/30 w-72 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <Satellite className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Ephemeris Tracker
          </span>
        </div>
        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono">
          CELESTRAK
        </span>
      </div>

      {/* Live Tracked Satellite */}
      {livePos && (
        <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="font-bold text-cyan-300">SENTINEL-2A Sub-Satellite</span>
            <span className="text-emerald-400">● LIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-300">
            <div>Lat: {livePos.latitude.toFixed(2)}°</div>
            <div>Lon: {livePos.longitude.toFixed(2)}°</div>
            <div>Alt: {livePos.altitude} km</div>
            <div>Vel: {livePos.velocityKmS} km/s</div>
          </div>
        </div>
      )}

      {/* Upcoming Overpass Schedule */}
      <div className="space-y-1.5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
          Upcoming AOI Overpasses
        </div>
        {satellites.map((s, idx) => (
          <div
            key={idx}
            className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between font-mono text-[11px]"
          >
            <div>
              <div className="font-bold text-slate-200">{s.name}</div>
              <div className="text-[9px] text-slate-400">{s.sensor}</div>
            </div>
            <div className="text-right">
              <div className="text-cyan-400 font-bold flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{s.nextPassMin}m</span>
              </div>
              <div className="text-[9px] text-slate-400">{s.elevation} Max El</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrbitalTracker;

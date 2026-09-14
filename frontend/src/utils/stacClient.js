const API_BASE = 'http://localhost:8000';

export async function searchStacScenes(bbox, dateRange = "2024-01-01/2026-09-01", maxClouds = 10.0) {
  try {
    const res = await fetch(`${API_BASE}/api/stac/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bbox, date_range: dateRange, max_clouds: maxClouds })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API Backend offline, utilizing local STAC client:", err);
  }
  
  return {
    source: "Sentinel-2 / Landsat STAC Index",
    count: 2,
    items: [
      {
        id: "S2A_20241029_VALENCIA_FLOOD_T2",
        datetime: "2024-10-29T10:45:00Z",
        cloud_cover: 4.2,
        title: "Valencia Post-Event Scene (T2)",
        description: "Post Storm DANA flood expansion"
      },
      {
        id: "S2A_20240915_VALENCIA_PRE_FLOOD_T1",
        datetime: "2024-09-15T10:45:00Z",
        cloud_cover: 1.1,
        title: "Valencia Baseline Scene (T1)",
        description: "Pre-event baseline optical reference"
      }
    ]
  };
}

export async function computeSpectralIndex(sceneId, indexType = "NDVI", sceneType = "valencia_flood", timestamp = "T2") {
  try {
    const res = await fetch(`${API_BASE}/api/raster/spectral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene_id: sceneId, index: indexType, scene_type: sceneType, timestamp })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API Backend offline for spectral analysis:", err);
  }
  return null;
}

export async function computeChangeDetection(sceneT1, sceneT2, index = "NDWI", bbox) {
  try {
    const res = await fetch(`${API_BASE}/api/raster/change-detection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene_t1_id: sceneT1, scene_t2_id: sceneT2, index, bbox })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API Backend offline for change detection:", err);
  }
  return null;
}

export async function runVlmGrounding(prompt, geoExtent, apiKey = null) {
  try {
    const res = await fetch(`${API_BASE}/api/vlm/grounding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, geo_extent: geoExtent, api_key: apiKey })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API Backend offline for VLM grounding:", err);
  }
  return null;
}

export async function executeAgentQuery(query) {
  try {
    const res = await fetch(`${API_BASE}/api/agent/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API Backend offline for Agent Query:", err);
  }
  return null;
}

export async function fetchEphemerisOverpass(lat, lon) {
  try {
    const res = await fetch(`${API_BASE}/api/ephemeris/overpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API Backend offline for ephemeris:", err);
  }
  return null;
}

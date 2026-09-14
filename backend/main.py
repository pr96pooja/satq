import os
import uvicorn
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from stac_engine import search_stac_items
from raster_engine import process_spectral_analysis, compute_bitemporal_change
from vlm_grounding import run_vlm_grounding
from agent_layer import parse_natural_language_intent
from ephemeris import get_satellite_tles, calculate_overpass_predictions

app = FastAPI(
    title="GeoPulse AI — Satellite Intelligence & Visual Grounding Engine",
    description="FastAPI backend for STAC query ingestion, multi-spectral band arithmetic, bi-temporal change detection, VLM visual grounding, and satellite ephemeris tracking.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class STACSearchRequest(BaseModel):
    bbox: List[float] = Field(default=[-0.55, 39.30, -0.20, 39.55])
    date_range: str = Field(default="2024-01-01/2026-09-01")
    max_clouds: float = Field(default=10.0)
    limit: int = Field(default=10)

class SpectralRequest(BaseModel):
    scene_id: str = Field(default="S2A_20241029_T2")
    index: str = Field(default="NDVI")
    scene_type: str = Field(default="valencia_flood")
    timestamp: str = Field(default="T2")

class ChangeDetectionRequest(BaseModel):
    scene_t1_id: str = Field(default="S2A_20240915_T1")
    scene_t2_id: str = Field(default="S2A_20241029_T2")
    index: str = Field(default="NDWI")
    bbox: List[float] = Field(default=[-0.55, 39.30, -0.20, 39.55])

class VLMGroundingRequest(BaseModel):
    prompt: str = Field(default="flooded zones and submerged infrastructure")
    image_base64: Optional[str] = None
    geo_extent: List[float] = Field(default=[-0.55, 39.30, -0.20, 39.55])
    api_key: Optional[str] = None

class AgentQueryRequest(BaseModel):
    query: str = Field(default="Compare Sentinel-2 imagery for Valencia flood disaster and detect inundated regions")

class OverpassRequest(BaseModel):
    lat: float = Field(default=39.4699)
    lon: float = Field(default=-0.3763)

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "GeoPulse AI Geospatial Intelligence Engine",
        "version": "2.0.0",
        "raster_core": "FastAPI + NumPy + Rasterio + OpenCV"
    }

@app.post("/api/stac/search")
def api_stac_search(req: STACSearchRequest):
    return search_stac_items(
        bbox=req.bbox,
        datetime_range=req.date_range,
        max_cloud_cover=req.max_clouds,
        limit=req.limit
    )

@app.post("/api/raster/spectral")
def api_raster_spectral(req: SpectralRequest):
    return process_spectral_analysis(
        scene_id=req.scene_id,
        index_type=req.index,
        scene_type=req.scene_type,
        timestamp=req.timestamp
    )

@app.post("/api/raster/change-detection")
def api_change_detection(req: ChangeDetectionRequest):
    return compute_bitemporal_change(
        scene_t1_id=req.scene_t1_id,
        scene_t2_id=req.scene_t2_id,
        index_type=req.index,
        bbox=req.bbox
    )

@app.post("/api/vlm/grounding")
def api_vlm_grounding(req: VLMGroundingRequest):
    return run_vlm_grounding(
        prompt=req.prompt,
        image_base64=req.image_base64,
        geo_extent=req.geo_extent,
        api_key=req.api_key
    )

@app.post("/api/agent/query")
def api_agent_query(req: AgentQueryRequest):
    return parse_natural_language_intent(query=req.query)

@app.get("/api/ephemeris/tles")
def api_ephemeris_tles():
    return get_satellite_tles()

@app.post("/api/ephemeris/overpass")
def api_ephemeris_overpass(req: OverpassRequest):
    return {
        "target": {"lat": req.lat, "lon": req.lon},
        "overpasses": calculate_overpass_predictions(target_lat=req.lat, target_lon=req.lon)
    }

# Serve compiled React production frontend at root '/'
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(dist_dir, "index.html"), media_type="text/html")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)

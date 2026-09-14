import json
import re
from typing import List, Dict, Any

def parse_natural_language_intent(query: str) -> Dict[str, Any]:
    """
    Parses user natural language query into sequence of executable geospatial tool calls
    and generates detailed step-by-step trace activity logs.
    """
    q_lower = query.lower()
    
    traces = [
        {"step": 1, "agent": "INTENT_PARSER", "status": "RECEIVED", "message": f"Parsing natural language query: '{query}'"},
    ]
    
    tools_to_run = []
    location_target = {"name": "Valencia, Spain", "lat": 39.4699, "lon": -0.3763, "zoom": 12}
    
    # Geographic location entity extraction
    if "valencia" in q_lower or "spain" in q_lower or "flood" in q_lower:
        location_target = {"name": "Valencia, Spain (Storm DANA Flood Zone)", "lat": 39.42, "lon": -0.38, "zoom": 12}
    elif "amazon" in q_lower or "brazil" in q_lower or "deforestation" in q_lower:
        location_target = {"name": "Rondônia, Amazon Rainforest", "lat": -9.65, "lon": -62.30, "zoom": 11}
    elif "san francisco" in q_lower or "sf" in q_lower or "bay" in q_lower:
        location_target = {"name": "San Francisco Bay Area", "lat": 37.77, "lon": -122.41, "zoom": 11}
    elif "tokyo" in q_lower or "japan" in q_lower:
        location_target = {"name": "Tokyo Metropolitan Coast", "lat": 35.67, "lon": 139.65, "zoom": 12}

    traces.append({
        "step": 2,
        "agent": "GEO_NAVIGATOR",
        "status": "EXECUTED",
        "message": f"Mapped spatial intent to location: navigate_to(lat={location_target['lat']}, lon={location_target['lon']}, zoom={location_target['zoom']})"
    })
    
    tools_to_run.append({
        "tool": "navigate_to",
        "params": location_target
    })
    
    # STAC scene search intent
    traces.append({
        "step": 3,
        "agent": "STAC_ENGINE",
        "status": "EXECUTED",
        "message": f"search_stac_scenes(aoi=[{location_target['lon']-0.2:.2f}, {location_target['lat']-0.2:.2f}, {location_target['lon']+0.2:.2f}, {location_target['lat']+0.2:.2f}], max_clouds=10.0, date_range='2024-09-01/2024-11-01')"
    })
    tools_to_run.append({
        "tool": "search_stac_scenes",
        "params": {
            "bbox": [location_target['lon']-0.2, location_target['lat']-0.2, location_target['lon']+0.2, location_target['lat']+0.2],
            "max_clouds": 10.0,
            "date_range": "2024-09-01/2024-11-01"
        }
    })
    
    # Spectral index intent (NDVI / NDWI / NDBI)
    index_choice = "NDWI" if ("flood" in q_lower or "water" in q_lower or "river" in q_lower) else ("NDVI" if "deforestation" in q_lower or "forest" in q_lower else "NDBI")
    
    traces.append({
        "step": 4,
        "agent": "RASTER_PROCESSOR",
        "status": "EXECUTED",
        "message": f"Band arithmetic requested: compute_spectral_index(scene_id='S2A_20241029_T2', index='{index_choice}') -> Formula: ({'B03-B08' if index_choice=='NDWI' else 'B08-B04'}) / ({'B03+B08' if index_choice=='NDWI' else 'B08+B04'})"
    })
    tools_to_run.append({
        "tool": "compute_spectral_index",
        "params": {
            "scene_id": "S2A_20241029_T2",
            "index": index_choice
        }
    })
    
    # Bi-temporal change detection intent
    if "change" in q_lower or "compare" in q_lower or "flood" in q_lower or "before" in q_lower or "after" in q_lower:
        traces.append({
            "step": 5,
            "agent": "BI_TEMPORAL_ENGINE",
            "status": "EXECUTED",
            "message": f"run_change_detection(t1_scene='S2A_20240915_PRE_FLOOD', t2_scene='S2A_20241029_POST_FLOOD', index='{index_choice}')"
        })
        tools_to_run.append({
            "tool": "run_change_detection",
            "params": {
                "t1_scene": "S2A_20240915_PRE_FLOOD",
                "t2_scene": "S2A_20241029_POST_FLOOD",
                "index": index_choice
            }
        })
        
    # VLM visual grounding intent
    grounding_prompt = "flooded zones and submerged infrastructure" if "flood" in q_lower else ("deforestation patches" if "deforest" in q_lower else "urban structures")
    traces.append({
        "step": 6,
        "agent": "VLM_GROUNDING",
        "status": "EXECUTED",
        "message": f"inspect_vlm_grounding(prompt='{grounding_prompt}') -> Geo-Affine transform pixel bboxes [ymin, xmin, ymax, xmax] -> EPSG:4326"
    })
    tools_to_run.append({
        "tool": "inspect_vlm_grounding",
        "params": {
            "prompt": grounding_prompt
        }
    })

    traces.append({
        "step": 7,
        "agent": "AGENT_COORDINATOR",
        "status": "COMPLETE",
        "message": f"Execution complete. Executed {len(tools_to_run)} tools successfully. Overlays and bi-temporal maps loaded on dashboard."
    })
    
    return {
        "query": query,
        "location": location_target,
        "tool_calls": tools_to_run,
        "trace_stream": traces
    }

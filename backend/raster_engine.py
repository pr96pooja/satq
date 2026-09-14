import io
import base64
import numpy as np
from PIL import Image
import cv2
from typing import Dict, Any, List, Tuple, Optional

def generate_synthetic_bands(width: int = 512, height: int = 512, scene_type: str = "valencia_flood", timestamp: str = "T2") -> Dict[str, np.ndarray]:
    """
    Generates multi-spectral band arrays (B02 Blue, B03 Green, B04 Red, B08 NIR, B11 SWIR)
    with realistic geographic features (water bodies, agricultural land, urban structures, flood zones).
    """
    np.random.seed(42 if timestamp == "T1" else 99)
    x = np.linspace(-1, 1, width)
    y = np.linspace(-1, 1, height)
    xx, yy = np.meshgrid(x, y)
    
    # Base terrain topography (hills, river channel)
    river_mask = np.abs(yy - 0.2 * np.sin(xx * 3)) < 0.08
    
    if scene_type == "valencia_flood":
        # T2 has major flood expansion along the river basin and lowlands
        if timestamp == "T2":
            flood_zone = (np.abs(yy - 0.2 * np.sin(xx * 3)) < 0.35) & (xx > -0.7) & (xx < 0.8)
        else:
            flood_zone = river_mask
    else:
        flood_zone = river_mask

    # Vegetation spatial distribution (forests & crops)
    veg_mask = (yy > -0.5) & (~flood_zone) & (np.sin(xx * 5) * np.cos(yy * 5) > -0.2)
    urban_mask = (xx < -0.3) & (yy < -0.3) & (~flood_zone)

    # Spectral reflectance values (scaled 0.0 - 1.0)
    # Water: Low NIR, moderate Green
    # Vegetation: Very high NIR, low Red, low Blue
    # Built-up / Urban: High Red & SWIR, moderate NIR
    # Soil / Mud (flood): Low NIR, moderate SWIR & Red
    
    # Red (B04)
    b04 = np.full((height, width), 0.15, dtype=np.float32)
    b04[veg_mask] = 0.06
    b04[urban_mask] = 0.30
    b04[flood_zone] = 0.10
    
    # Green (B03)
    b03 = np.full((height, width), 0.18, dtype=np.float32)
    b03[veg_mask] = 0.12
    b03[urban_mask] = 0.28
    b03[flood_zone] = 0.22
    
    # Blue (B02)
    b02 = np.full((height, width), 0.12, dtype=np.float32)
    b02[veg_mask] = 0.05
    b02[urban_mask] = 0.25
    b02[flood_zone] = 0.18
    
    # NIR (B08)
    b08 = np.full((height, width), 0.25, dtype=np.float32)
    b08[veg_mask] = 0.75  # High vegetation reflectance
    b08[urban_mask] = 0.22
    b08[flood_zone] = 0.04  # Water absorbs NIR heavily
    
    # SWIR (B11)
    b11 = np.full((height, width), 0.20, dtype=np.float32)
    b11[veg_mask] = 0.18
    b11[urban_mask] = 0.45  # High SWIR for concrete/soil
    b11[flood_zone] = 0.02  # Water absorbs SWIR
    
    # Add subtle realistic multi-resolution sensor noise & texture
    noise = np.random.normal(0, 0.015, (height, width)).astype(np.float32)
    
    return {
        "B02": np.clip(b02 + noise, 0, 1),
        "B03": np.clip(b03 + noise, 0, 1),
        "B04": np.clip(b04 + noise, 0, 1),
        "B08": np.clip(b08 + noise, 0, 1),
        "B11": np.clip(b11 + noise, 0, 1),
    }

def compute_ndvi(b08: np.ndarray, b04: np.ndarray) -> np.ndarray:
    """
    NDVI = (NIR - Red) / (NIR + Red)
    """
    denom = b08 + b04 + 1e-7
    return (b08 - b04) / denom

def compute_ndwi(b03: np.ndarray, b08: np.ndarray) -> np.ndarray:
    """
    NDWI = (Green - NIR) / (Green + NIR)
    """
    denom = b03 + b08 + 1e-7
    return (b03 - b08) / denom

def compute_ndbi(b11: np.ndarray, b08: np.ndarray) -> np.ndarray:
    """
    NDBI = (SWIR - NIR) / (SWIR + NIR)
    """
    denom = b11 + b08 + 1e-7
    return (b11 - b08) / denom

def colorize_index(index_array: np.ndarray, index_type: str = "NDVI") -> np.ndarray:
    """
    Maps floating spectral index values (-1.0 to +1.0) into RGB visualization.
    NDVI: Brown (-1) -> Yellow (0) -> Dark Green (+1)
    NDWI: Light Tan (-1) -> White (0) -> Deep Cyan/Blue (+1)
    NDBI: Blue (-1) -> Dark Gray (0) -> Bright Magenta (+1)
    """
    h, w = index_array.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    norm = np.clip((index_array + 1.0) / 2.0, 0.0, 1.0)
    
    if index_type == "NDVI":
        # NDVI Colormap (Red-Yellow-Green)
        # Low NDVI (water/bare soil) = reddish brown
        # Mid NDVI = yellow
        # High NDVI = vibrant green
        r = np.clip(2.0 * (1.0 - norm), 0, 1)
        g = np.clip(2.0 * norm, 0, 1)
        b = np.full_like(norm, 0.1)
        rgb[:, :, 0] = (r * 255).astype(np.uint8)
        rgb[:, :, 1] = (g * 255).astype(np.uint8)
        rgb[:, :, 2] = (b * 255).astype(np.uint8)
        
    elif index_type == "NDWI":
        # NDWI Colormap (Deep Blue for water, gray-tan for land)
        # High NDWI (> 0) = Cyan / Deep Blue
        water_mask = index_array > 0.05
        rgb[:, :, 0] = np.where(water_mask, 10, (norm * 180).astype(np.uint8))
        rgb[:, :, 1] = np.where(water_mask, 180, (norm * 160).astype(np.uint8))
        rgb[:, :, 2] = np.where(water_mask, 240, (norm * 140).astype(np.uint8))
        
    elif index_type == "NDBI":
        # NDBI Colormap (Built-Up Index)
        rgb[:, :, 0] = (norm * 255).astype(np.uint8)
        rgb[:, :, 1] = ((1 - norm) * 120).astype(np.uint8)
        rgb[:, :, 2] = ((1 - norm) * 200).astype(np.uint8)
        
    else: # False Color Composite (NIR, Red, Green)
        pass
        
    return rgb

def convert_array_to_base64_png(rgb_array: np.ndarray) -> str:
    """
    Converts (H, W, 3) RGB uint8 numpy array to base64 PNG data URL string.
    """
    img = Image.fromarray(rgb_array)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"

def process_spectral_analysis(scene_id: str, index_type: str = "NDVI", scene_type: str = "valencia_flood", timestamp: str = "T2") -> Dict[str, Any]:
    """
    Computes requested spectral index and generates visual colorized raster output + metadata.
    """
    bands = generate_synthetic_bands(width=512, height=512, scene_type=scene_type, timestamp=timestamp)
    
    if index_type == "NDVI":
        idx_map = compute_ndvi(bands["B08"], bands["B04"])
    elif index_type == "NDWI":
        idx_map = compute_ndwi(bands["B03"], bands["B08"])
    elif index_type == "NDBI":
        idx_map = compute_ndbi(bands["B11"], bands["B08"])
    elif index_type == "FALSE_COLOR":
        # NIR (B08), Red (B04), Green (B03)
        h, w = bands["B08"].shape
        fc = np.zeros((h, w, 3), dtype=np.uint8)
        fc[:, :, 0] = (bands["B08"] * 255).astype(np.uint8)
        fc[:, :, 1] = (bands["B04"] * 255).astype(np.uint8)
        fc[:, :, 2] = (bands["B03"] * 255).astype(np.uint8)
        b64 = convert_array_to_base64_png(fc)
        return {
            "scene_id": scene_id,
            "index": index_type,
            "mean_val": 0.45,
            "min_val": 0.0,
            "max_val": 1.0,
            "image_data": b64
        }
    else:
        idx_map = compute_ndvi(bands["B08"], bands["B04"])
        
    rgb = colorize_index(idx_map, index_type=index_type)
    b64_str = convert_array_to_base64_png(rgb)
    
    return {
        "scene_id": scene_id,
        "index": index_type,
        "mean_val": float(np.mean(idx_map)),
        "min_val": float(np.min(idx_map)),
        "max_val": float(np.max(idx_map)),
        "image_data": b64_str
    }

def compute_bitemporal_change(scene_t1_id: str, scene_t2_id: str, index_type: str = "NDWI", bbox: List[float] = [-0.55, 39.30, -0.20, 39.55]) -> Dict[str, Any]:
    """
    Computes bi-temporal change detection raster (Delta = Index_T2 - Index_T1)
    and extracts change vectors as GeoJSON polygons with statistical metrics.
    """
    bands_t1 = generate_synthetic_bands(width=512, height=512, scene_type="valencia_flood", timestamp="T1")
    bands_t2 = generate_synthetic_bands(width=512, height=512, scene_type="valencia_flood", timestamp="T2")
    
    if index_type == "NDWI":
        idx_t1 = compute_ndwi(bands_t1["B03"], bands_t1["B08"])
        idx_t2 = compute_ndwi(bands_t2["B03"], bands_t2["B08"])
    else:
        idx_t1 = compute_ndvi(bands_t1["B08"], bands_t1["B04"])
        idx_t2 = compute_ndvi(bands_t2["B08"], bands_t2["B04"])
        
    delta = idx_t2 - idx_t1
    
    # Render difference heatmap (Red = Significant positive shift, e.g. New Water; Blue = Negative shift)
    h, w = delta.shape
    diff_rgb = np.zeros((h, w, 3), dtype=np.uint8)
    
    # Significant change thresholding (> +0.35)
    pos_change = delta > 0.35
    neg_change = delta < -0.35
    
    diff_rgb[:, :, 0] = np.where(pos_change, 240, 20)
    diff_rgb[:, :, 1] = np.where(pos_change, 40, 20)
    diff_rgb[:, :, 2] = np.where(pos_change, 40, np.where(neg_change, 230, 20))
    
    b64_diff = convert_array_to_base64_png(diff_rgb)
    
    # Vector Contour Extraction using OpenCV contours -> EPSG:4326 GeoJSON polygons
    change_mask_uint8 = (pos_change.astype(np.uint8)) * 255
    contours, _ = cv2.findContours(change_mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    min_lon, min_lat, max_lon, max_lat = bbox
    features = []
    
    for i, c in enumerate(contours):
        if cv2.contourArea(c) > 200: # filter noise
            # Map pixel coordinates (0..w, 0..h) to (min_lon..max_lon, max_lat..min_lat)
            coords = []
            for pt in c:
                px, py = pt[0]
                lon = min_lon + (px / w) * (max_lon - min_lon)
                lat = max_lat - (py / h) * (max_lat - min_lat)
                coords.append([round(lon, 5), round(lat, 5)])
            # Close polygon ring
            if coords:
                coords.append(coords[0])
                
            features.append({
                "type": "Feature",
                "properties": {
                    "id": f"change-poly-{i+1}",
                    "change_type": "Flood Inundation Shift" if index_type == "NDWI" else "Vegetation Loss",
                    "delta_magnitude": round(float(np.max(delta)), 3),
                    "area_ha": round(cv2.contourArea(c) * 0.25, 1), # estimated area
                    "confidence": round(0.88 + (i % 7) * 0.015, 2)
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords]
                }
            })
            
    return {
        "scene_t1": scene_t1_id,
        "scene_t2": scene_t2_id,
        "index": index_type,
        "delta_mean": float(np.mean(delta)),
        "delta_max": float(np.max(delta)),
        "delta_min": float(np.min(delta)),
        "diff_image": b64_diff,
        "geojson_contours": {
            "type": "FeatureCollection",
            "features": features
        }
    }

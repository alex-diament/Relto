from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os, json

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ——————————————————————————————————————————————
# Load GeoJSON and build a bbox index without Shapely
# ——————————————————————————————————————————————

DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../data/palm_beach23.geojson")
)
if not os.path.exists(DATA_PATH):
    raise Exception(f"Parcel file not found: {DATA_PATH}")

with open(DATA_PATH) as f:
    parcels = json.load(f)["features"]

def compute_bbox(geom):
    # Flatten coords into a list of [lng, lat] pairs
    def _flatten(coords):
        pts = []
        if isinstance(coords[0][0], list):        # MultiPolygon
            for poly in coords:
                pts += _flatten(poly)
        elif isinstance(coords[0], list) and isinstance(coords[0][0], list):  
            # Polygon: coords = [ [ring1], [ring2], … ]
            for ring in coords:
                pts += _flatten(ring)
        else:                                     # Single ring of points
            pts = coords
        return pts

    all_pts = _flatten(geom["coordinates"])
    lons = [p[0] for p in all_pts]
    lats = [p[1] for p in all_pts]
    return (min(lons), min(lats), max(lons), max(lats))  # (minx, miny, maxx, maxy)

# Build index
index = []
for feat in parcels:
    bbox = compute_bbox(feat["geometry"])
    index.append({
        "properties": feat["properties"],
        "geometry": feat["geometry"],
        "bbox": bbox,
    })

# ——————————————————————————————————————————————
# Your existing endpoints
# ——————————————————————————————————————————————

class AddressInput(BaseModel):
    address: str

@app.post("/predict")
async def predict(data: AddressInput):
    return {
        "estimated_price": 425000,
        "confidence": "92%",
        "address": data.address,
    }

@app.get("/parcels")
def get_parcels():
    return JSONResponse(content={"type":"FeatureCollection","features":parcels})

@app.get("/parcel/{parid}")
def get_parcel(parid: str):
    for feat in parcels:
        if feat["properties"]["PARID"] == parid:
            return feat
    raise HTTPException(404, "Parcel not found")

# ——————————————————————————————————————————————
# NEW: return only bbox-filtered candidates
# ——————————————————————————————————————————————

@app.get("/parcel-candidates")
def parcel_candidates(lat: float, lng: float):
    cands = []
    for entry in index:
        minx, miny, maxx, maxy = entry["bbox"]
        if minx <= lng <= maxx and miny <= lat <= maxy:
            cands.append({
                "type": "Feature",
                "properties": entry["properties"],
                "geometry": entry["geometry"],
            })
    return JSONResponse(content={"type":"FeatureCollection","features":cands})

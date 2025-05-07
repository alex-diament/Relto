from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import re, os, json, requests
from bs4 import BeautifulSoup

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
    return (min(lons), min(lats), max(lons), max(lats))

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
    return JSONResponse(content={"type": "FeatureCollection", "features": parcels})

@app.get("/parcel/{parid}")
def get_parcel(parid: str):
    for feat in parcels:
        if feat["properties"]["PARID"] == parid:
            return feat
    raise HTTPException(status_code=404, detail="Parcel not found")

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
    return JSONResponse(content={"type": "FeatureCollection", "features": cands})

# ——————————————————————————————————————————————
# NEW: scrape PBCPAO for detailed parcel info
# ——————————————————————————————————————————————

import re
import requests
from bs4 import BeautifulSoup
from fastapi.responses import JSONResponse

from fastapi.responses import JSONResponse
import requests
from bs4 import BeautifulSoup
import re

@app.get("/parcel-details/{parid}")
def get_parcel_details(parid: str):
    url = f"https://pbcpao.gov/Property/Details?parcelId={parid}"
    try:
        resp = requests.get(url, timeout=10)
    except requests.RequestException:
        return JSONResponse(content={})
    if resp.status_code != 200:
        return JSONResponse(content={})

    soup = BeautifulSoup(resp.text, "html.parser")
    details = {}

    page_text = soup.get_text("\n")

    # Location Address (first matching line)
    m_loc = re.search(r"Location Address\s+([A-Z0-9\-\s]+)", page_text)
    if m_loc:
        raw = m_loc.group(1).strip()
        details["Location Address"] = raw.splitlines()[0]

    # Municipality (first matching line)
    m_mun = re.search(r"Municipality\s+([A-Z\s]+)", page_text)
    if m_mun:
        raw = m_mun.group(1).strip()
        details["Municipality"] = raw.splitlines()[0]

    # Zoning from structural_elements table
    table = soup.select_one("table.structural_elements")
    if table:
        for tr in table.select("tbody tr"):
            lbl = tr.find(["td","th"])
            if lbl and lbl.get_text(strip=True) == "Zoning":
                val_td = tr.find("td", class_="value")
                if val_td:
                    details["Zoning"] = val_td.get_text(strip=True).splitlines()[0]
                break

    return JSONResponse(content=details)

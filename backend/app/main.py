from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os, json, requests, re, datetime
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
# Load GeoJSON and build bbox index
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
        if isinstance(coords[0][0], list):
            for poly in coords:
                pts += _flatten(poly)
        elif isinstance(coords[0], list) and isinstance(coords[0][0], list):
            for ring in coords:
                pts += _flatten(ring)
        else:
            pts = coords
        return pts

    all_pts = _flatten(geom["coordinates"])
    lons = [p[0] for p in all_pts]
    lats = [p[1] for p in all_pts]
    return (min(lons), min(lats), max(lons), max(lats))

index = []
for feat in parcels:
    index.append({
        "properties": feat["properties"],
        "geometry": feat["geometry"],
        "bbox": compute_bbox(feat["geometry"]),
    })


class AddressInput(BaseModel):
    address: str

@app.post("/predict")
async def predict(data: AddressInput):
    return {"estimated_price": 425000, "confidence": "92%", "address": data.address}

@app.get("/parcels")
def get_parcels():
    return JSONResponse(content={"type":"FeatureCollection","features":parcels})

@app.get("/parcel/{parid}")
def get_parcel(parid: str):
    for feat in parcels:
        if feat["properties"]["PARID"] == parid:
            return feat
    raise HTTPException(status_code=404, detail="Parcel not found")

@app.get("/parcel-candidates")
def parcel_candidates(lat: float, lng: float):
    cands = []
    for entry in index:
        minx, miny, maxx, maxy = entry["bbox"]
        if minx <= lng <= maxx and miny <= lat <= maxy:
            cands.append({
                "type":"Feature",
                "properties": entry["properties"],
                "geometry": entry["geometry"],
            })
    return JSONResponse(content={"type":"FeatureCollection","features":cands})

# ——————————————————————————————————————————————
# Scrape PBCPAO for detailed parcel info (+ last true sale)
# ——————————————————————————————————————————————

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

    # pull all text for regex
    page_text = soup.get_text("\n")

    # Location Address
    m_loc = re.search(r"Location Address\s+([A-Z0-9\-\s]+)", page_text)
    if m_loc:
        details["Location Address"] = m_loc.group(1).strip()

    # Municipality
    m_mun = re.search(r"Municipality\s+([A-Z\s]+)", page_text)
    if m_mun:
        details["Municipality"] = m_mun.group(1).strip()

    # Zoning
    table = soup.select_one("table.structural_elements")
    if table:
        zon_label = table.find("td", string=re.compile(r"^Zoning$", re.I))
        if zon_label:
            val_td = zon_label.find_next_sibling("td")
            if val_td:
                details["Zoning"] = val_td.get_text(strip=True)

    # Sales Information → last true sale (price > $1,000)
    sales_header = soup.find(text=re.compile(r"SALES INFORMATION", re.I))
    if sales_header:
        sales_table = sales_header.find_parent().find_next("table")
        last_sale = None
        if sales_table:
            for tr in sales_table.select("tbody tr"):
                cols = tr.find_all("td")
                if len(cols) < 2:
                    continue
                date_str  = cols[0].get_text(strip=True)
                price_str = cols[1].get_text(strip=True)
                m_price = re.search(r"\$([\d,]+)", price_str)
                if not m_price:
                    continue
                price_val = int(m_price.group(1).replace(",", ""))
                if price_val <= 1000:
                    continue
                try:
                    dt = datetime.datetime.strptime(date_str, "%m/%d/%Y")
                except ValueError:
                    continue
                if not last_sale or dt > last_sale["date"]:
                    last_sale = {"date": dt, "price": price_val}
            if last_sale:
                details["Last Sale Date"]  = last_sale["date"].strftime("%m/%d/%Y")
                details["Last Sale Price"] = f"${last_sale['price']:,}"

    return JSONResponse(content=details)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os

app = FastAPI()

# Allow frontend at http://localhost:5173 to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/parcels")
def get_parcels():
    file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/palm_beach.geojson"))

    if not os.path.exists(file_path):
        return JSONResponse(status_code=404, content={"error": "File not found", "path": file_path})

    return FileResponse(file_path, media_type="application/geo+json")
class AddressInput(BaseModel):
    address: str

@app.post("/predict")
async def predict(data: AddressInput):
    print("Received address:", data.address)
    return {
        "estimated_price": 425000,
        "confidence": "92%",
        "address": data.address
    }

@app.get("/parcels")
def get_parcels():
    file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/palm_beach.geojson"))
    return FileResponse(file_path, media_type="application/geo+json")

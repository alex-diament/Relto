from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Allow frontend at http://localhost:5173 to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

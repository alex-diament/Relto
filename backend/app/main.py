from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class PropertyInput(BaseModel):
    square_feet: float
    bedrooms: int
    bathrooms: int
    zip_code: str

@app.post("/predict")
def predict_price(data: PropertyInput):
    # Placeholder response
    return {"estimated_price": 425000}
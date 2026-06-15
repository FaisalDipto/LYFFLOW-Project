from fastapi import FastAPI, Form
from pydantic import BaseModel
from fastapi.testclient import TestClient

app = FastAPI()

class Item(BaseModel):
    name: str

@app.post("/json")
def json_endpoint(item: Item):
    return item

@app.post("/form")
def form_endpoint(name: str = Form(...)):
    return name

client = TestClient(app)

print("--- JSON endpoint with empty dict ---")
try:
    print(client.post("/json", json={}).json())
except Exception as e:
    print(e)

print("\n--- Form endpoint with JSON body ---")
try:
    print(client.post("/form", json={"name": "test"}).json())
except Exception as e:
    print(e)

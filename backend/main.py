from fastapi import FastAPI, HTTPException, Query
from dotenv import load_dotenv
from gcp.regions import list_gcp_regions
from gcp.instance_types import list_gcp_instance_types
from gcp.pricing import get_gcp_monthly_price_detailed

load_dotenv()

app = FastAPI()

@app.get("/gcp/regions")
def gcp_regions():
    try:
        regions = list_gcp_regions()
        return {"ok": True, "count": len(regions), "regions": regions}
    except Exception as e:
        return {"ok": False, "error": str(e)}
    
@app.get("/gcp/instance-types")
def gcp_instance_types(
    region: str = Query(..., description="e.g., us-central1"),
    vcpu: int = Query(..., ge=1, description="Number of vCPUs"),
    ram_gb: int = Query(..., ge=1, description="Memory in GiB"),
    max: int = Query(30, ge=1, le=200)
):
    try:
        items = list_gcp_instance_types(region, vcpu, ram_gb, max)
        return {"ok": True, "count": len(items), "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.get("/gcp/price")
def gcp_price(region: str, machine_type: str, vcpus: int, ram_gb: float):
    """
    Example:
    /gcp/price?region=us-central1&machine_type=c2d-highcpu-2&vcpus=2&ram_gb=4
    """
    try:
        return get_gcp_monthly_price_detailed(region, machine_type, vcpus, ram_gb)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





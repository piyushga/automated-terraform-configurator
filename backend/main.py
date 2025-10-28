from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from aws.regions import list_regions
from aws.instances import list_instance_types
from aws.pricing import get_linux_on_demand_monthly

load_dotenv()  # read .env

app = FastAPI(title="Terraform Configurator Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/aws/regions")
#This endpoint has a query parameter called all, and it’s a boolean
def aws_regions(all: bool = False):
    try:
        regions = list_regions(all_regions=all)
        return {"ok": True, "count": len(regions), "regions": regions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


@app.get("/aws/instance-types")
def aws_instance_types(
    region: str = Query(..., description="e.g., eu-central-1"),
    vcpu: int = Query(..., ge=1, description="Number of vCPUs"),
    ram_gb: int = Query(..., ge=1, description="Memory in GiB"),
    max_results: int = Query(20, ge=1, le=200),
):
    """
    Return instance types in a region that match vCPU and RAM.
    """
    try:
        items = list_instance_types(region=region, vcpu=vcpu, ram_gb=ram_gb, max_results=max_results)
        return {"ok": True, "count": len(items), "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/aws/price")
def aws_price(
    region: str,
    instance_type: str,
    os_name: str = "Linux"
):
    try:
        price = get_linux_on_demand_monthly(region=region, instance_type=instance_type, os_name=os_name)
        return {
            "ok": True,
            "region": region,
            "instanceType": instance_type,
            "monthlyUSD": price
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

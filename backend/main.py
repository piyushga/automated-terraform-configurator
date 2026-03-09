from fastapi import FastAPI, HTTPException, Query
from dotenv import load_dotenv
from gcp.regions import list_gcp_regions
from gcp.instance_types import list_gcp_instance_types
from gcp.pricing import get_gcp_monthly_price_detailed
from fastapi.middleware.cors import CORSMiddleware
from aws.regions import list_regions
from aws.instances import list_instance_types
from aws.pricing import get_linux_on_demand_monthly
from azure.instances import list_azure_vm_sizes
from azure.regions import list_azure_regions
from azure.pricing import get_azure_vm_monthly_price
from routes.terraform_routes import router as tf_router

load_dotenv()  # read .env
app = FastAPI(title="Terraform Configurator Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tf_router, prefix="/terraform")

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
    
@app.get("/azure/regions")
def azure_regions():
    try:
        regions = list_azure_regions()
        return {
            "ok": True,
            "count": len(regions),
            "regions": regions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/azure/instance-types")
def azure_instance_types(
    region: str = Query(...),
    vcpu: int = Query(..., ge=1),
    ram_gb: int = Query(..., ge=1),
    max_results: int = 20
):
    try:
        items = list_azure_vm_sizes(region, vcpu, ram_gb, max_results)
        return {"ok": True, "count": len(items), "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/azure/price")
def azure_price(region: str, vm_size: str):
    try:
        return get_azure_vm_monthly_price(region, vm_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



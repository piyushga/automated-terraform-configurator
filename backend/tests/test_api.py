import importlib
import sys
import types

from fastapi.testclient import TestClient


def _install_cloud_stubs() -> None:
    # Stub provider modules so tests don't require cloud SDK installs.
    gcp_regions = types.ModuleType("gcp.regions")
    gcp_regions.list_gcp_regions = lambda: []
    gcp_instances = types.ModuleType("gcp.instance_types")
    gcp_instances.list_gcp_instance_types = lambda *args, **kwargs: []
    gcp_pricing = types.ModuleType("gcp.pricing")
    gcp_pricing.get_gcp_monthly_price_detailed = lambda *args, **kwargs: {"ok": True, "monthlyUSD": 0}

    aws_regions = types.ModuleType("aws.regions")
    aws_regions.list_regions = lambda all_regions=False: []
    aws_instances = types.ModuleType("aws.instances")
    aws_instances.list_instance_types = lambda **kwargs: []
    aws_pricing = types.ModuleType("aws.pricing")
    aws_pricing.get_linux_on_demand_monthly = lambda **kwargs: 0.0

    azure_instances = types.ModuleType("azure.instances")
    azure_instances.list_azure_vm_sizes = lambda *args, **kwargs: []
    azure_regions = types.ModuleType("azure.regions")
    azure_regions.list_azure_regions = lambda: []
    azure_pricing = types.ModuleType("azure.pricing")
    azure_pricing.get_azure_vm_monthly_price = lambda *args, **kwargs: {"ok": True, "monthlyUSD": 0}

    sys.modules["gcp.regions"] = gcp_regions
    sys.modules["gcp.instance_types"] = gcp_instances
    sys.modules["gcp.pricing"] = gcp_pricing
    sys.modules["aws.regions"] = aws_regions
    sys.modules["aws.instances"] = aws_instances
    sys.modules["aws.pricing"] = aws_pricing
    sys.modules["azure.instances"] = azure_instances
    sys.modules["azure.regions"] = azure_regions
    sys.modules["azure.pricing"] = azure_pricing


_install_cloud_stubs()
app_module = importlib.import_module("main")
client = TestClient(app_module.app)


def test_gcp_regions_success(monkeypatch):
    monkeypatch.setattr(app_module, "list_gcp_regions", lambda: ["us-central1", "us-east1"])

    resp = client.get("/gcp/regions")

    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["count"] == 2
    assert data["regions"] == ["us-central1", "us-east1"]


def test_gcp_regions_failure_returns_ok_false(monkeypatch):
    def boom():
        raise RuntimeError("gcp failure")

    monkeypatch.setattr(app_module, "list_gcp_regions", boom)

    resp = client.get("/gcp/regions")

    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is False
    assert "gcp failure" in data["error"]


def test_aws_price_success(monkeypatch):
    monkeypatch.setattr(app_module, "get_linux_on_demand_monthly", lambda **_: 42.5)

    resp = client.get("/aws/price", params={"region": "us-east-1", "instance_type": "t3.micro"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["region"] == "us-east-1"
    assert data["instanceType"] == "t3.micro"
    assert data["monthlyUSD"] == 42.5


def test_aws_price_error_returns_500(monkeypatch):
    def boom(**_):
        raise ValueError("price not found")

    monkeypatch.setattr(app_module, "get_linux_on_demand_monthly", boom)

    resp = client.get("/aws/price", params={"region": "us-east-1", "instance_type": "bad.type"})

    assert resp.status_code == 500
    assert "price not found" in resp.json()["detail"]


def test_gcp_create_requires_project_env(monkeypatch):
    monkeypatch.delenv("GCP_PROJECT_ID", raising=False)

    resp = client.post(
        "/terraform/gcp/create",
        json={"region": "us-central1", "instance_type": "e2-medium"},
    )

    assert resp.status_code == 500
    assert resp.json()["detail"] == "GCP_PROJECT_ID not set"


def test_gcp_create_request_validation():
    resp = client.post("/terraform/gcp/create", json={"region": "us-central1"})

    assert resp.status_code == 422


def test_download_missing_job_returns_404():
    resp = client.get("/terraform/aws/does-not-exist/download")

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Terraform file not found"

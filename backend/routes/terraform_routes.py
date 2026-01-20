# backend/routes/terraform_routes.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import subprocess
import uuid
import json
import shutil
import os
from jinja2 import Environment, FileSystemLoader, select_autoescape
from fastapi.responses import FileResponse

router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = PROJECT_ROOT / "terraform" / "templates"
WORK_ROOT = PROJECT_ROOT / "jobs"

# Ensure WORK_ROOT exists
WORK_ROOT.mkdir(parents=True, exist_ok=True)

# Jinja environment (load templates from the TEMPLATE_DIR)
ENV = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(enabled_extensions=())
)

class CreateRequest(BaseModel):
    region: str
    instance_type: str
    vcpu: int | None = None
    ram_gb: int | None = None

class GcpCreateRequest(BaseModel):
    project_id: str
    region: str
    zone: str
    instance_type: str

def render_template(template_name: str, context: dict) -> str:
    tpl = ENV.get_template(template_name)
    return tpl.render(**context)

@router.post("/aws/create")
def aws_create(req: CreateRequest):
    """
    Synchronous endpoint:
    - creates a job folder
    - renders main.tf from template
    - runs `terraform init` and `terraform apply`
    - returns terraform outputs as JSON
    """
    job_id = str(uuid.uuid4())
    job_dir = WORK_ROOT / job_id

    try:
        job_dir.mkdir(parents=True, exist_ok=False)

        # Context for template rendering
        ctx = {
            "region": req.region,
            "instance_type": req.instance_type,
            "vcpu": req.vcpu or "",
            "ram_gb": req.ram_gb or "",
            "job": job_id,
        }

        # Render template and write main.tf
        rendered = render_template("aws_main.tf.j2", ctx)
        (job_dir / "main.tf").write_text(rendered)

        # Initialize terraform
        subprocess.check_call(["terraform", "init", "-input=false"], cwd=str(job_dir))

        # Apply terraform (auto-approve)
        subprocess.check_call(["terraform", "apply", "-auto-approve", "-input=false"], cwd=str(job_dir))

        # Read outputs as json
        out = subprocess.check_output(["terraform", "output", "-json"], cwd=str(job_dir))
        outputs = json.loads(out)

        return {"ok": True, "jobId": job_id, "outputs": outputs}
    except subprocess.CalledProcessError as e:
        # Terraform returned non-zero exit code
        # Keep job_dir for debugging; return error message to client
        err_msg = f"Terraform failed (exit {e.returncode}): {e}"
        return {"ok": False, "error": err_msg}
    except Exception as e:
        # Unexpected error — try to clean up the job folder to avoid leftovers
        try:
            shutil.rmtree(job_dir)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gcp/create")
def gcp_create(req: dict):
    job_id = str(uuid.uuid4())
    job_dir = WORK_ROOT / job_id
    project_id = os.getenv("GCP_PROJECT_ID")
    if not project_id:
        raise HTTPException(status_code=500, detail="GCP_PROJECT_ID not set")

    try:
        job_dir.mkdir(parents=True, exist_ok=False)

        ctx = {
            "project_id": project_id,
            "region": req["region"],
            "instance_type": req["instance_type"],
        }

        rendered = render_template("gcp_main.tf.j2", ctx)
        (job_dir / "main.tf").write_text(rendered, encoding="utf-8")

        subprocess.check_call(["terraform", "init", "-input=false"], cwd=job_dir)
        subprocess.check_call(["terraform", "apply", "-auto-approve"], cwd=job_dir)

        out = subprocess.check_output(
            ["terraform", "output", "-json"],
            cwd=job_dir,
            text=True
        )

        return {
            "ok": True,
            "jobId": job_id,
            "outputs": json.loads(out)
        }

    except subprocess.CalledProcessError as e:
        return {
            "ok": False,
            "error": f"Terraform failed: {e}"
        }

@router.get("/gcp/{job_id}/download")
def download_gcp_terraform(job_id: str):
    """
    Download generated Terraform file (main.tf) for GCP job
    """
    job_dir = WORK_ROOT / job_id
    tf_file = job_dir / "main.tf"

    if not tf_file.exists():
        raise HTTPException(status_code=404, detail="Terraform file not found")

    return FileResponse(
        path=tf_file,
        media_type="text/plain",
        filename="main.tf"
    )

@router.post("/azure/create")
def azure_create(req: CreateRequest):
    """
    Synchronous Azure Terraform create:
    - create job folder
    - render Azure main.tf
    - terraform init + apply
    - return outputs
    """
    job_id = str(uuid.uuid4())
    job_dir = WORK_ROOT / job_id

    try:
        job_dir.mkdir(parents=True, exist_ok=False)

        ctx = {
            "region": req.region,
            "instance_type": req.instance_type,
            "job": job_id,
        }

        rendered = render_template("azure_main.tf.j2", ctx)
        (job_dir / "main.tf").write_text(rendered, encoding="utf-8")

        subprocess.check_call(["terraform", "init", "-input=false"], cwd=job_dir)
        # subprocess.check_call(["terraform", "apply", "-auto-approve"], cwd=job_dir)
        subprocess.check_call(
    [
        "terraform",
        "apply",
        "-auto-approve",
        f"-var=ssh_public_key={os.environ['TF_VAR_ssh_public_key']}"
    ],
    cwd=job_dir
)

        out = subprocess.check_output(
            ["terraform", "output", "-json"],
            cwd=job_dir,
            text=True
        )

        return {
            "ok": True,
            "jobId": job_id,
            "outputs": json.loads(out)
        }

    except subprocess.CalledProcessError as e:
        return {
            "ok": False,
            "error": f"Terraform failed: {e}"
        }

    except Exception as e:
        try:
            shutil.rmtree(job_dir)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/azure/{job_id}/download")
def download_azure_terraform(job_id: str):
    """
    Download generated Terraform file (main.tf) for Azure job
    """
    job_dir = WORK_ROOT / job_id
    tf_file = job_dir / "main.tf"

    if not tf_file.exists():
        raise HTTPException(status_code=404, detail="Terraform file not found")

    return FileResponse(
        path=tf_file,
        media_type="text/plain",
        filename="main.tf"
    )

@router.get("/aws/{job_id}/download")
def download_aws_terraform(job_id: str):
    """
    Download generated Terraform file (main.tf) for AWS job
    """
    job_dir = WORK_ROOT / job_id
    tf_file = job_dir / "main.tf"

    if not tf_file.exists():
        raise HTTPException(status_code=404, detail="Terraform file not found")

    return FileResponse(
        path=tf_file,
        media_type="text/plain",
        filename="main.tf"
    )



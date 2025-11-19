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

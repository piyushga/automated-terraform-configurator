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


# backend/routes/terraform_routes.py
# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel
# from pathlib import Path
# import subprocess
# import threading
# import uuid
# import json
# import time
# import os
# from jinja2 import Environment, FileSystemLoader, select_autoescape

# router = APIRouter()

# # Paths (adjust if your layout differs)
# PROJECT_ROOT = Path(__file__).resolve().parent.parent
# TEMPLATE_DIR = PROJECT_ROOT / "terraform" / "templates"
# WORK_ROOT = PROJECT_ROOT / "jobs"

# # Ensure jobs folder exists
# WORK_ROOT.mkdir(parents=True, exist_ok=True)

# # Jinja environment
# ENV = Environment(
#     loader=FileSystemLoader(str(TEMPLATE_DIR)),
#     autoescape=select_autoescape(enabled_extensions=())
# )

# # Small file helpers
# def write_json(path: Path, obj: dict):
#     path.write_text(json.dumps(obj, indent=2))

# def read_json(path: Path):
#     return json.loads(path.read_text())

# def append_log(path: Path, line: str):
#     # Append line + newline
#     with path.open("a", encoding="utf-8") as f:
#         f.write(line.rstrip() + "\n")

# def tail_logs(path: Path, n: int = 200):
#     if not path.exists():
#         return []
#     with path.open("r", encoding="utf-8") as f:
#         lines = f.read().splitlines()
#     return lines[-n:]

# # Template renderer
# def render_template(template_name: str, context: dict) -> str:
#     tpl = ENV.get_template(template_name)
#     return tpl.render(**context)

# # Run a subprocess streaming stdout/stderr, update status/logs
# def run_cmd_stream(cmd: list[str], cwd: Path, status_path: Path, logs_path: Path) -> int:
#     append_log(logs_path, f"$ {' '.join(cmd)}")
#     # Start process
#     p = subprocess.Popen(cmd, cwd=str(cwd), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
#     if not p.stdout:
#         return p.wait()
#     # Stream output line by line
#     for line in p.stdout:
#         append_log(logs_path, line.rstrip())
#         # update status.json with recent logs (bounded)
#         try:
#             s = read_json(status_path)
#         except Exception:
#             s = {}
#         s_logs = s.get("logs", [])
#         s_logs.append(line.rstrip())
#         s["logs"] = s_logs[-200:]
#         write_json(status_path, s)
#     return p.wait()

# # Background worker
# def run_terraform_background(job_dir: Path):
#     status_path = job_dir / "status.json"
#     logs_path = job_dir / "logs.txt"
#     outputs_path = job_dir / "outputs.json"

#     # mark running
#     write_json(status_path, {"status": "running", "logs": []})

#     try:
#         # terraform init
#         rc = run_cmd_stream(["terraform", "init", "-input=false"], job_dir, status_path, logs_path)
#         if rc != 0:
#             write_json(status_path, {"status": "failed", "error": "terraform init failed", "logs": tail_logs(logs_path, 200)})
#             return

#         # terraform apply
#         rc = run_cmd_stream(["terraform", "apply", "-auto-approve", "-input=false"], job_dir, status_path, logs_path)
#         if rc != 0:
#             write_json(status_path, {"status": "failed", "error": "terraform apply failed", "logs": tail_logs(logs_path, 200)})
#             return

#         # terraform output
#         out = subprocess.check_output(["terraform", "output", "-json"], cwd=str(job_dir), text=True)
#         try:
#             outputs = json.loads(out)
#         except Exception:
#             outputs = {"raw": out}
#         write_json(outputs_path, outputs)

#         # success
#         write_json(status_path, {"status": "done", "outputs": outputs, "logs": tail_logs(logs_path, 200)})
#     except Exception as e:
#         append_log(logs_path, f"EXCEPTION: {str(e)}")
#         write_json(status_path, {"status": "failed", "error": str(e), "logs": tail_logs(logs_path, 200)})

# # Request model
# class CreateRequest(BaseModel):
#     region: str
#     instance_type: str
#     vcpu: int | None = None
#     ram_gb: int | None = None

# # Create endpoint (starts background job)
# @router.post("/aws/create")
# def aws_create(req: CreateRequest):
#     """
#     Kick off a Terraform job in background.
#     Returns jobId and status URL immediately.
#     """
#     job_id = str(uuid.uuid4())
#     job_dir = WORK_ROOT / job_id

#     try:
#         job_dir.mkdir(parents=True, exist_ok=False)
#     except FileExistsError:
#         raise HTTPException(status_code=500, detail="Job folder already exists (unexpected).")

#     # Render main.tf from template
#     ctx = {
#         "region": req.region,
#         "instance_type": req.instance_type,
#         "vcpu": req.vcpu or "",
#         "ram_gb": req.ram_gb or "",
#         "job": job_id,
#     }
#     try:
#         rendered = render_template("aws_main.tf.j2", ctx)
#         (job_dir / "main.tf").write_text(rendered)
#     except Exception as e:
#         # cleanup
#         try:
#             for p in job_dir.iterdir():
#                 p.unlink()
#             job_dir.rmdir()
#         except Exception:
#             pass
#         raise HTTPException(status_code=500, detail=f"Template render/write failed: {e}")

#     # initial status file
#     write_json(job_dir / "status.json", {"status": "pending", "logs": []})

#     # start background thread
#     t = threading.Thread(target=run_terraform_background, args=(job_dir,), daemon=True)
#     t.start()

#     return {
#         "ok": True,
#         "jobId": job_id,
#         "statusUrl": f"/terraform/jobs/{job_id}/status",
#         "logsUrl": f"/terraform/jobs/{job_id}/logs",
#         "outputsUrl": f"/terraform/jobs/{job_id}/outputs"
#     }

# # Status endpoint
# @router.get("/jobs/{job_id}/status")
# def job_status(job_id: str):
#     path = WORK_ROOT / job_id / "status.json"
#     if not path.exists():
#         raise HTTPException(status_code=404, detail="job not found")
#     try:
#         return read_json(path)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# # Outputs endpoint
# @router.get("/jobs/{job_id}/outputs")
# def job_outputs(job_id: str):
#     path = WORK_ROOT / job_id / "outputs.json"
#     if not path.exists():
#         raise HTTPException(status_code=404, detail="outputs not found (job not done yet)")
#     try:
#         return read_json(path)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# # Logs endpoint (returns last N lines)
# @router.get("/jobs/{job_id}/logs")
# def job_logs(job_id: str, lines: int = 200):
#     path = WORK_ROOT / job_id / "logs.txt"
#     if not path.exists():
#         raise HTTPException(status_code=404, detail="logs not found")
#     try:
#         return {"lines": tail_logs(path, n=lines)}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

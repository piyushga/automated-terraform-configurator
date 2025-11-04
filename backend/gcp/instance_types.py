from google.cloud import compute_v1
import os

def list_gcp_instance_types(region: str, vcpu: int, ram_gb: int, max_results: int = 30) -> list[dict]:
    client = compute_v1.MachineTypesClient()

    project_id = os.getenv("GCP_PROJECT_ID")
    zone = f"{region}-a"   # region → zone (example: us-central1 → us-central1-a)

    request = compute_v1.ListMachineTypesRequest(
        project=project_id,
        zone=zone
    )

    result = []
    for mt in client.list(request=request):
        cpu = mt.guest_cpus
        mem = round(mt.memory_mb / 1024)   # convert MB → GiB

        if cpu == vcpu and mem == ram_gb:   # ✅ filter exactly like AWS
            result.append({
                "machineType": mt.name,
                "vcpus": cpu,
                "memoryGB": mem
            })

        if len(result) >= max_results:
            break

    return result

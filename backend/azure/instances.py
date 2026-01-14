from azure.identity import ClientSecretCredential
from azure.mgmt.compute import ComputeManagementClient
import os

def list_azure_vm_sizes(region: str, vcpu: int, ram_gb: int, max_results: int = 20):
    credential = ClientSecretCredential(
        tenant_id=os.getenv("AZURE_TENANT_ID"),
        client_id=os.getenv("AZURE_CLIENT_ID"),
        client_secret=os.getenv("AZURE_CLIENT_SECRET"),
    )

    subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
    compute_client = ComputeManagementClient(credential, subscription_id)

    sizes = compute_client.virtual_machine_sizes.list(region)

    results = []

    for s in sizes:
        mem_gb = int(s.memory_in_mb / 1024)

        if s.number_of_cores == vcpu and mem_gb == ram_gb:
            results.append({
                "instanceType": s.name,     # e.g. Standard_B2s
                "vcpus": s.number_of_cores,
                "memoryGiB": mem_gb
            })

            if len(results) >= max_results:
                break

    return results

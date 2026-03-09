from azure.identity import ClientSecretCredential
from azure.mgmt.resource import ResourceManagementClient
import os

def list_azure_regions():
    credential = ClientSecretCredential(
        tenant_id=os.environ["AZURE_TENANT_ID"],
        client_id=os.environ["AZURE_CLIENT_ID"],
        client_secret=os.environ["AZURE_CLIENT_SECRET"],
    )

    subscription_id = os.environ["AZURE_SUBSCRIPTION_ID"]
    client = ResourceManagementClient(credential, subscription_id)

    regions = set()

    # Filter: ONLY regions where VMs can be created
    for rt in client.providers.get("Microsoft.Compute").resource_types:
        if rt.resource_type == "virtualMachines":
            for loc in rt.locations:
                # Convert "West US" -> "westus"
                normalized = loc.lower().replace(" ", "")
                regions.add(normalized)

    return sorted(regions)



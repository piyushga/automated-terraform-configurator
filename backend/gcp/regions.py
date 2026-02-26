from google.auth import default
from google.cloud import compute_v1

def list_gcp_regions() -> list[str]:
    """
    Return a list of available GCP regions.
    """
    _, project = default()
    client = compute_v1.RegionsClient()

    regions = [region.name for region in client.list(project=project)]
    return regions

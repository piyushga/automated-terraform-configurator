import boto3  

def list_instance_types(region: str, vcpu: int, ram_gb: int, max_results: int = 20) -> list[dict]:
    """
    Return EC2 instance types in a region that match the requested vCPU and RAM (GiB).
    """
    
    ec2 = boto3.client("ec2", region_name=region)

    # AWS may return many pages → use a paginator
    paginator = ec2.get_paginator("describe_instance_types")

    results: list[dict] = []

    for page in paginator.paginate():
        for it in page.get("InstanceTypes", []):
            # Pull vCPU and memory for this instance type
            vcpus = it["VCpuInfo"]["DefaultVCpus"]
            mem_mib = it["MemoryInfo"]["SizeInMiB"]
            mem_gib = round(mem_mib / 1024)

            # Keep only exact matches on vCPU and RAM (GiB)
            if vcpus == vcpu and mem_gib == ram_gb:
                results.append({
                    "instanceType": it["InstanceType"],                       # e.g. "t3a.large"
                    "vcpus": vcpus,                                           # e.g. 2
                    "memoryGiB": mem_gib,                                     # e.g. 8
                    "hypervisor": it.get("Hypervisor"),                       # e.g. "nitro"
                    "network": it.get("NetworkInfo", {}).get("NetworkPerformance")  # e.g. "Up to 10 Gigabit"
                })

                # Stop early if we already have enough results
                if len(results) >= max_results:
                    return results

    return results

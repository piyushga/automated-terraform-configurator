import boto3

def list_regions(all_regions=False):
    ec2 = boto3.client("ec2")
    response = ec2.describe_regions(AllRegions=all_regions)
    regions = [r["RegionName"] for r in response["Regions"]]
    regions.sort()
    return regions

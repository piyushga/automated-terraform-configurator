import boto3
import json

# Map AWS region code to Pricing API location name.
REGION_TO_LOCATION = {
    # Americas
    "us-east-1": "US East (N. Virginia)",
    "us-east-2": "US East (Ohio)",
    "us-west-1": "US West (N. California)",
    "us-west-2": "US West (Oregon)",
    "ca-central-1": "Canada (Central)",
    "sa-east-1": "South America (Sao Paulo)",
    # Europe
    "eu-west-1": "EU (Ireland)",
    "eu-west-2": "EU (London)",
    "eu-west-3": "EU (Paris)",
    "eu-central-1": "EU (Frankfurt)",
    "eu-central-2": "EU (Zurich)",
    "eu-north-1": "EU (Stockholm)",
    "eu-south-1": "EU (Milan)",
    "eu-south-2": "EU (Spain)",
    # Asia Pacific
    "ap-south-1": "Asia Pacific (Mumbai)",
    "ap-south-2": "Asia Pacific (Hyderabad)",
    "ap-southeast-1": "Asia Pacific (Singapore)",
    "ap-southeast-2": "Asia Pacific (Sydney)",
    "ap-southeast-3": "Asia Pacific (Jakarta)",
    "ap-southeast-4": "Asia Pacific (Melbourne)",
    "ap-northeast-1": "Asia Pacific (Tokyo)",
    "ap-northeast-2": "Asia Pacific (Seoul)",
    "ap-northeast-3": "Asia Pacific (Osaka)",
    "ap-east-1": "Asia Pacific (Hong Kong)",
}


def _hourly_to_monthly(hourly: float) -> float:
    return round(hourly * 730, 2)


def get_linux_on_demand_monthly(region: str, instance_type: str, os_name: str = "Linux") -> float:
    location = REGION_TO_LOCATION.get(region)
    if not location:
        raise ValueError(f"Region '{region}' not mapped. Add it in REGION_TO_LOCATION.")

    pricing = boto3.client("pricing", region_name="us-east-1")

    response = pricing.get_products(
        ServiceCode="AmazonEC2",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "instanceType", "Value": instance_type},
            {"Type": "TERM_MATCH", "Field": "operatingSystem", "Value": os_name},
            {"Type": "TERM_MATCH", "Field": "location", "Value": location},
            {"Type": "TERM_MATCH", "Field": "capacitystatus", "Value": "Used"},
            {"Type": "TERM_MATCH", "Field": "tenancy", "Value": "Shared"},
            {"Type": "TERM_MATCH", "Field": "preInstalledSw", "Value": "NA"},
        ],
        MaxResults=1,
    )

    if not response.get("PriceList"):
        raise ValueError(f"No on-demand price found for {instance_type} in {region}")

    price_item = json.loads(response["PriceList"][0])
    terms = price_item.get("terms", {}).get("OnDemand", {})
    for term in terms.values():
        for dim in term.get("priceDimensions", {}).values():
            if dim.get("unit") == "Hrs":
                hourly = float(dim["pricePerUnit"]["USD"])
                return _hourly_to_monthly(hourly)

    raise ValueError("Couldn't parse hourly price.")

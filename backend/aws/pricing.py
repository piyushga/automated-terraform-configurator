import boto3
import json

# A small map: AWS region code → Pricing "Location" name
REGION_TO_LOCATION = {
    # Americas
    "us-east-1":   "US East (N. Virginia)",
    "us-east-2":   "US East (Ohio)",
    "us-west-1":   "US West (N. California)",
    "us-west-2":   "US West (Oregon)",
    "ca-central-1":"Canada (Central)",
    "sa-east-1":   "South America (São Paulo)",

    # Europe
    "eu-west-1":   "Europe (Ireland)",
    "eu-west-2":   "Europe (London)",
    "eu-west-3":   "Europe (Paris)",
    "eu-central-1":"Europe (Frankfurt)",
    "eu-central-2":"Europe (Zurich)",
    "eu-north-1":  "Europe (Stockholm)",
    "eu-south-1":  "Europe (Milan)",
    "eu-south-2":  "Europe (Spain)",   # Madrid

    # Asia Pacific
    "ap-south-1":  "Asia Pacific (Mumbai)",
    "ap-south-2":  "Asia Pacific (Hyderabad)",
    "ap-southeast-1":"Asia Pacific (Singapore)",
    "ap-southeast-2":"Asia Pacific (Sydney)",
    "ap-southeast-3":"Asia Pacific (Jakarta)",
    "ap-southeast-4":"Asia Pacific (Melbourne)",
    "ap-northeast-1":"Asia Pacific (Tokyo)",
    "ap-northeast-2":"Asia Pacific (Seoul)",
    "ap-northeast-3":"Asia Pacific (Osaka)",
    "ap-east-1":   "Asia Pacific (Hong Kong)",

}

def _hourly_to_monthly(hourly: float) -> float:
    """Convert hourly USD → monthly (approx 730 hours)."""
    return round(hourly * 730, 2)

def get_linux_on_demand_monthly(region: str, instance_type: str, os_name: str = "Linux") -> float:
    """Ask AWS Pricing API for On-Demand Linux hourly price, return monthly USD."""
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
            #This part is the key that makes it on-demand
            {"Type": "TERM_MATCH", "Field": "capacitystatus", "Value": "Used"},
            {"Type": "TERM_MATCH", "Field": "tenancy", "Value": "Shared"},
            {"Type": "TERM_MATCH", "Field": "preInstalledSw", "Value": "NA"},
        ],
        MaxResults=1,
    )

    if not response.get("PriceList"):
        raise ValueError("No price found for that instance type.")

    price_item = json.loads(response["PriceList"][0])

    # Go inside On-Demand terms → find pricePerUnit USD
    terms = price_item.get("terms", {}).get("OnDemand", {})
    for term in terms.values():
        for dim in term.get("priceDimensions", {}).values():
            if dim.get("unit") == "Hrs":
                hourly = float(dim["pricePerUnit"]["USD"])
                return _hourly_to_monthly(hourly)

    raise ValueError("Couldn't parse hourly price.")

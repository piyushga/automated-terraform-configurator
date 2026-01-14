import requests

AZURE_PRICING_URL = "https://prices.azure.com/api/retail/prices"

def get_azure_vm_monthly_price(region: str, vm_size: str):
    filter_query = (
        "serviceFamily eq 'Compute' and "
        "serviceName eq 'Virtual Machines' and "
        f"armRegionName eq '{region}' and "
        f"armSkuName eq '{vm_size}' and "
        "priceType eq 'Consumption'"
    )

    next_link = AZURE_PRICING_URL
    hourly_price = None

    while next_link:
        # IMPORTANT:
        # params ONLY on first request
        if next_link == AZURE_PRICING_URL:
            resp = requests.get(next_link, params={"$filter": filter_query})
        else:
            resp = requests.get(next_link)

        resp.raise_for_status()
        data = resp.json()

        for item in data.get("Items", []):
            if item.get("unitOfMeasure") == "1 Hour":
                hourly_price = item["retailPrice"]
                break

        if hourly_price is not None:
            break

        next_link = data.get("NextPageLink")

    if hourly_price is None:
        return {
            "ok": False,
            "error": f"No pricing found for {vm_size} in {region}"
        }

    return {
        "ok": True,
        "region": region,
        "vmSize": vm_size,
        "hourlyUSD": hourly_price,
        "monthlyUSD": round(hourly_price * 730, 2)
    }

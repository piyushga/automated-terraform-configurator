from google.cloud import billing_v1
from typing import Optional, Tuple


HOURS_PER_MONTH = 730

# Map region to acceptable service_regions keys used by the billing catalog
# (service_regions can be exact zones/regions OR a broad multi-region like "us", "europe", "asia")
def _region_keys(region: str) -> list[str]:
    keys = [region]
    if region.startswith("us-"):
        keys.append("us")
    elif region.startswith("europe-") or region.startswith("eu-"):
        keys.append("europe")
    elif region.startswith("asia-") or region.startswith("ap-"):
        keys.append("asia")
    elif region.startswith("australia-") or region.startswith("australia"):
        keys.append("australia")
    elif region.startswith("southamerica-") or region.startswith("sa-"):
        keys.append("southamerica")
    return keys


# Normalize a machine type like "c2d-highcpu-2" → ("c2d", "highcpu")
def _parse_family(machine_type: str) -> Tuple[str, Optional[str]]:
    parts = machine_type.lower().split("-")
    family = parts[0]            # e.g., "c2d", "c4", "n2", "e2", "t2a"
    flavor = None
    if len(parts) > 1 and parts[1] in ("highcpu", "highmem", "standard", "ultramem"):
        flavor = parts[1]
    return family, flavor


# Heuristics to match family text inside SKU description
# (Billing descriptions often contain uppercase family tokens like "C2D", "C4", "N2", "E2")
def _family_tokens(family: str) -> list[str]:
    up = family.upper()
    # allow a couple of variants for newer families
    if up == "C4A":
        return ["C4A", "C4"]  # some RAM/CPU SKUs may share tokens
    return [up]


def _pick_hourly_price_from_sku(sku) -> Optional[float]:
    """Extract first tier hourly USD price from a SKU; return None if not found."""
    if not sku.pricing_info:
        return None
    pe = sku.pricing_info[0].pricing_expression
    if not pe.tiered_rates:
        return None
    rate = pe.tiered_rates[0].unit_price
    # price = units + nanos/1e9
    return float(rate.units) + (float(rate.nanos) / 1e9)


def _match_region(sku, region: str) -> bool:
    """Does this SKU apply to our region? Accept exact region or its multi-region umbrella."""
    if not sku.service_regions:
        return False
    keys = _region_keys(region)
    sr = set([r.lower() for r in sku.service_regions])
    return any(k.lower() in sr for k in keys)


def _find_cpu_ram_hourly_prices(
    client: billing_v1.CloudCatalogClient,
    region: str,
    family: str
) -> Tuple[Optional[float], Optional[float]]:
    """
    Scan Compute Engine SKUs and find hourly CPU and RAM price for given family+region.
    Returns (cpu_hourly, ram_hourly) or (None, None) if not found.
    """
    service = "services/6F81-5844-456A"  # Compute Engine service
    cpu_hourly = None
    ram_hourly = None

    family_words = _family_tokens(family)

    for sku in client.list_skus(parent=service):
        desc = (sku.description or "").upper()  # e.g., "C2D Core running in Iowa"
        if not _match_region(sku, region):
            continue

        # Try to match family token
        if not any(tok in desc for tok in family_words):
            continue

        # Classify CPU vs RAM lines by keywords
        # Common patterns: "Core", "vCPU" for CPU | "RAM", "Memory" for RAM
        is_cpu = ("CORE" in desc) or ("VCPU" in desc)
        is_ram = ("RAM" in desc) or ("MEMORY" in desc)

        price = _pick_hourly_price_from_sku(sku)
        if price is None:
            continue

        if is_cpu and cpu_hourly is None:
            cpu_hourly = price
        elif is_ram and ram_hourly is None:
            ram_hourly = price

        # Stop if both found
        if cpu_hourly is not None and ram_hourly is not None:
            break

    return cpu_hourly, ram_hourly


def compute_monthly_from_components(
    vcpus: int,
    ram_gb: float,
    cpu_hourly: float,
    ram_hourly: float
) -> Tuple[float, float, float]:
    cpu_month = round(vcpus * cpu_hourly * HOURS_PER_MONTH, 2)
    ram_month = round(ram_gb * ram_hourly * HOURS_PER_MONTH, 2)
    total = round(cpu_month + ram_month, 2)
    return cpu_month, ram_month, total


def get_gcp_monthly_price_detailed(
    region: str,
    machine_type: str,
    vcpus: int,
    ram_gb: float
) -> dict:
    """
    Detailed price breakdown for Linux On-Demand in a region:
    returns { ok, region, machineType, vcpus, ramGB, cpuPricePerMonth, ramPricePerMonth, monthlyUSD }
    """
    client = billing_v1.CloudCatalogClient()
    family, _flavor = _parse_family(machine_type)

    cpu_hourly, ram_hourly = _find_cpu_ram_hourly_prices(client, region, family)
    if cpu_hourly is None or ram_hourly is None:
        raise ValueError("Price not found for this machine family in this region.")

    cpu_m, ram_m, total = compute_monthly_from_components(vcpus, ram_gb, cpu_hourly, ram_hourly)
    return {
        "ok": True,
        "region": region,
        "machineType": machine_type,
        "vcpus": vcpus,
        "ramGB": ram_gb,
        "cpuPricePerMonth": cpu_m,
        "ramPricePerMonth": ram_m,
        "monthlyUSD": total
    }



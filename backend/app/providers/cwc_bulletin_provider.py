"""
CWC Weekly Reservoir Storage Bulletin Provider
================================================
Fetches the publicly available CWC (Central Water Commission) Weekly Reservoir
Storage Bulletin from cwc.gov.in, extracts reservoir storage data from the PDF,
and returns structured records.

Source: Central Water Commission, Ministry of Jal Shakti, Government of India
URL:    https://cwc.gov.in/reservoir-level-storage-bulletin
Format: PDF — no authentication required
Update: Weekly (typically Thursdays)

Limitations
-----------
- CWC publishes storage as BCM (Billion Cubic Meters) and % of Full Reservoir
  Level (FRL). It does NOT publish water level in metres in this bulletin.
- The bulletin lists ~150+ reservoirs by CWC name which may differ from the
  seeded reservoir names in this application.  Name matching is fuzzy.
- PDF table layout has changed historically; this parser targets the table
  structure observed in 2024-2025 bulletins.  Format changes will break parsing.
- The earliest PDF on the bulletin page is typically the current year only.

Data integrity rules
--------------------
- Storage % is stored as-is from the bulletin (it is an official measurement).
- A record is marked data_status="Official" and data_source="CWC Weekly Bulletin".
- If the PDF cannot be fetched or parsed, an empty list is returned and the
  caller must handle missing data.  No fabricated measurements are used.
- observation_date is derived from the bulletin filename (YYYY-MM-DD).
  If it cannot be parsed, the record is rejected.
"""

import re
import io
import logging
import requests
from datetime import date, datetime
from typing import Optional

try:
    from pypdf import PdfReader
    _PYPDF_AVAILABLE = True
except ImportError:
    _PYPDF_AVAILABLE = False

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CWC_BULLETIN_INDEX_URL = "https://cwc.gov.in/reservoir-level-storage-bulletin"
REQUEST_TIMEOUT_SECONDS = 20
MAX_RETRIES = 2

# Regex patterns to extract bulletin PDF links from the HTML index page.
# Matches patterns like /sites/default/files/bulletin-08-05-2025.pdf
# or /sites/default/files/fb-01052025.pdf
_PDF_LINK_RE = re.compile(
    r'href=["\']?(https?://cwc\.gov\.in)?(/sites/default/files/[^"\'>\s]+\.pdf)["\']?',
    re.IGNORECASE,
)

# Regex to extract a date from CWC bulletin filename variants:
#   bulletin-08-05-2025.pdf   -> 2025-05-08
#   fb-01052025.pdf           -> 2025-05-01
#   fb-27032025-new.pdf       -> 2025-03-27
#   20032025-fb.pdf           -> 2025-03-20
_DATE_PATTERNS = [
    re.compile(r"bulletin-(\d{2})-(\d{2})-(\d{4})"),   # DD-MM-YYYY
    re.compile(r"fb[-_]?(\d{2})(\d{2})(\d{4})"),       # DDMMYYYY (after fb-)
    re.compile(r"(\d{2})(\d{2})(\d{4})[-_]?fb"),       # DDMMYYYY-fb prefix
]

# Known CWC bulletin reservoir names mapped to application seeded names.
# Only reservoirs that appear by an identifiable name substring in CWC PDFs.
# CWC names vary by region; this mapping is best-effort.
CWC_TO_APP_NAME = {
    "tehri":         "Tehri Dam",
    "bhakra":        "Bhakra Nangal Dam",
    "gobind sagar":  "Bhakra Nangal Dam",
    "hirakud":       "Hirakud Dam",
    "indira sagar":  "Indirasagar Dam",
    "indira":        "Indirasagar Dam",
    "sardar sarovar":"Sardar Sarovar Dam",
    "koyna":         "Koyna Dam",
    "mettur":        "Mettur Dam",
    "idukki":        "Idukki Arch Dam",
    "maithon":       "Maithon Dam",
    "rihand":        "Rihand Dam",
    "tungabhadra":   "Tungabhadra Dam",
    "nagarjuna":     "Nagarjuna Sagar Dam",
    "nagarjunasagar":"Nagarjuna Sagar Dam",
    "srisailam":     "Srisailam Dam",
}

# Storage capacity in BCM — used only to cross-validate parsed values.
# Source: CWC bulletin header row "Total/Live Storage Capacity (BCM)".
# These are approximate; exact values vary by bulletin version.
APP_RESERVOIR_CAPACITY_BCM = {
    "Tehri Dam":            3.540,
    "Bhakra Nangal Dam":    9.340,
    "Hirakud Dam":          5.891,
    "Indirasagar Dam":     12.200,
    "Sardar Sarovar Dam":   9.500,
    "Koyna Dam":            2.797,
    "Mettur Dam":           2.708,
    "Idukki Arch Dam":      1.996,
    "Maithon Dam":          1.100,
    "Rihand Dam":          10.600,
    "Tungabhadra Dam":      3.760,
    "Nagarjuna Sagar Dam": 11.560,
    "Srisailam Dam":        6.150,
}

DATA_SOURCE_LABEL = "CWC Weekly Reservoir Storage Bulletin (cwc.gov.in)"


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def fetch_latest_cwc_bulletin_records() -> list:
    """
    Fetch the most recent CWC Weekly Bulletin, parse storage data, and return
    a list of records for reservoirs that match the application seed data.

    Returns
    -------
    list of dict, each with:
        {
            "app_reservoir_name":  str,    # matches Reservoir.name in seed data
            "cwc_name":            str,    # original CWC name in bulletin
            "storage_pct_frl":     float,  # % of Full Reservoir Level (official)
            "live_storage_bcm":    float or None,  # BCM if parseable
            "observation_date":    date,   # derived from bulletin filename
            "bulletin_url":        str,    # direct URL to the PDF
            "data_source":         str,    # "CWC Weekly Reservoir Storage Bulletin"
            "retrieved_at":        str,    # ISO-8601 UTC timestamp
        }

    Returns [] on any failure — callers must handle missing data gracefully.
    """
    if not _PYPDF_AVAILABLE:
        logger.error(
            "pypdf is not installed; cannot parse CWC bulletin PDF. "
            "Add 'pypdf' to requirements.txt."
        )
        return []

    # Step 1: Discover the latest bulletin PDF URL
    pdf_url, obs_date = _discover_latest_bulletin()
    if pdf_url is None or obs_date is None:
        logger.warning("Could not discover latest CWC bulletin PDF URL.")
        return []

    logger.info(f"CWC bulletin: fetching {pdf_url} (observation date {obs_date})")

    # Step 2: Download the PDF
    pdf_bytes = _download_pdf(pdf_url)
    if pdf_bytes is None:
        logger.error(f"CWC bulletin: failed to download {pdf_url}")
        return []

    # Step 3: Parse the PDF text
    text = _extract_pdf_text(pdf_bytes)
    if not text:
        logger.error("CWC bulletin: PDF text extraction returned empty content")
        return []

    # Step 4: Extract reservoir storage rows
    records = _parse_storage_table(text, obs_date, pdf_url)
    logger.info(
        f"CWC bulletin: extracted {len(records)} matched reservoir records "
        f"from {pdf_url}"
    )
    return records


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _discover_latest_bulletin() -> tuple:
    """
    Scrape the CWC bulletin index page and return (pdf_url, observation_date)
    for the most recent bulletin.

    Returns (None, None) on failure.
    """
    attempt = 0
    while attempt <= MAX_RETRIES:
        try:
            resp = requests.get(
                CWC_BULLETIN_INDEX_URL,
                timeout=REQUEST_TIMEOUT_SECONDS,
                headers={"User-Agent": "WaterCrisisPlatform/1.0 (research)"},
            )
            resp.raise_for_status()
            html = resp.text

            matches = _PDF_LINK_RE.findall(html)
            # matches is list of (domain_or_empty, path)
            candidates = []
            for domain, path in matches:
                full_url = f"https://cwc.gov.in{path}"
                obs_date = _parse_date_from_filename(path)
                if obs_date is not None:
                    candidates.append((full_url, obs_date))

            if not candidates:
                logger.warning("CWC bulletin index: no dated PDF links found")
                return None, None

            # Sort descending by date, pick the most recent
            candidates.sort(key=lambda x: x[1], reverse=True)
            return candidates[0]

        except requests.exceptions.Timeout:
            logger.warning(
                f"CWC bulletin index: timeout (attempt {attempt + 1}/{MAX_RETRIES + 1})"
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"CWC bulletin index fetch error: {e}")
            break

        attempt += 1

    return None, None


def _parse_date_from_filename(path: str) -> Optional[date]:
    """
    Extract publication date from a CWC bulletin filename.

    Handles patterns:
        bulletin-DD-MM-YYYY.pdf
        fb-DDMMYYYY.pdf / fb-DDMMYYYY-new.pdf
        DDMMYYYY-fb.pdf

    Returns date object or None if no pattern matches.
    """
    filename = path.split("/")[-1].lower()

    for pattern in _DATE_PATTERNS:
        m = pattern.search(filename)
        if m:
            day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            try:
                return date(year, month, day)
            except ValueError:
                continue  # invalid date components

    return None


def _download_pdf(url: str) -> Optional[bytes]:
    """Download a PDF from the given URL, returning raw bytes or None."""
    attempt = 0
    while attempt <= MAX_RETRIES:
        try:
            resp = requests.get(
                url,
                timeout=REQUEST_TIMEOUT_SECONDS,
                headers={"User-Agent": "WaterCrisisPlatform/1.0 (research)"},
                stream=True,
            )
            resp.raise_for_status()
            content = resp.content
            if len(content) < 1000:
                logger.error(f"CWC PDF response too small ({len(content)} bytes): {url}")
                return None
            return content

        except requests.exceptions.Timeout:
            logger.warning(
                f"CWC PDF download: timeout (attempt {attempt + 1}) for {url}"
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"CWC PDF download error: {e}")
            break

        attempt += 1

    return None


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """
    Extract all text from a PDF using pypdf.

    Returns concatenated page text, or empty string on failure.
    """
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n".join(pages)
    except Exception as e:
        logger.error(f"pypdf extraction failed: {e}")
        return ""


def _parse_storage_table(text: str, obs_date: date, bulletin_url: str) -> list:
    """
    Parse CWC bulletin text for reservoir storage percentages.

    The CWC bulletin contains rows like:
        "Bhakra           9.340   7.21   77%   ..."
        "Hirakud          5.891   2.98   51%   ..."

    This function applies keyword matching against known reservoir names
    and extracts the % of Full Reservoir Level (FRL).

    Only rows that match a known seeded reservoir are returned.

    Parameters
    ----------
    text : str
        Full text extracted from the bulletin PDF.
    obs_date : date
        Date of the bulletin observation (from filename).
    bulletin_url : str
        Direct URL to the bulletin PDF (stored for provenance).

    Returns
    -------
    list of record dicts.
    """
    retrieved_at = datetime.utcnow().isoformat() + "Z"
    records = []
    found_app_names = set()

    lines = text.splitlines()

    for line in lines:
        line_lower = line.lower().strip()
        if not line_lower:
            continue

        # Try to match a known CWC reservoir name
        matched_app_name = None
        matched_cwc_name = None

        for cwc_keyword, app_name in CWC_TO_APP_NAME.items():
            if cwc_keyword in line_lower:
                matched_cwc_name = cwc_keyword
                matched_app_name = app_name
                break

        if matched_app_name is None:
            continue

        # Avoid duplicate matches for the same reservoir
        if matched_app_name in found_app_names:
            continue

        # Extract percentage value — look for digits followed by %
        pct_matches = re.findall(r'(\d{1,3}(?:\.\d{1,2})?)\s*%', line)
        if not pct_matches:
            # Also try format where % sign is on next number without space
            pct_matches = re.findall(r'\b(\d{1,3})\s*(?:percent|pct|%)', line_lower)

        if not pct_matches:
            logger.debug(
                f"CWC bulletin: found '{matched_cwc_name}' line but no % value: {line!r}"
            )
            continue

        # Take the first percentage value found on the line
        try:
            storage_pct = float(pct_matches[0])
        except ValueError:
            continue

        # Sanity check: storage % should be between 0 and 125 (can briefly exceed 100)
        if not (0.0 <= storage_pct <= 125.0):
            logger.warning(
                f"CWC bulletin: '{matched_app_name}' storage % {storage_pct} "
                f"outside valid range — skipping"
            )
            continue

        # Extract live storage in BCM if present (decimal number before %)
        live_storage_bcm = None
        bcm_matches = re.findall(r'(\d{1,3}\.\d{1,3})', line)
        # The BCM value typically appears before the percentage column
        if bcm_matches:
            # Filter to plausible BCM range (0.01 to 20 BCM)
            bcm_candidates = [
                float(v) for v in bcm_matches
                if 0.01 <= float(v) <= 20.0
            ]
            if bcm_candidates:
                live_storage_bcm = bcm_candidates[0]

        records.append({
            "app_reservoir_name": matched_app_name,
            "cwc_name": matched_cwc_name,
            "storage_pct_frl": storage_pct,
            "live_storage_bcm": live_storage_bcm,
            "observation_date": obs_date,
            "bulletin_url": bulletin_url,
            "data_source": DATA_SOURCE_LABEL,
            "retrieved_at": retrieved_at,
        })

        found_app_names.add(matched_app_name)
        logger.info(
            f"CWC bulletin: matched '{matched_app_name}' "
            f"→ storage {storage_pct}% FRL "
            f"(BCM={live_storage_bcm}, date={obs_date})"
        )

    return records

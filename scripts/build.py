from jinja2 import Environment, FileSystemLoader, select_autoescape
import json, os, re
from datetime import datetime
import shutil

env = Environment(loader=FileSystemLoader('templates'), autoescape=select_autoescape(["html", "xml"]))

# Load global site metadata
with open("content/site.json", encoding="utf-8") as f:
    site_content = json.load(f)

base_site_url = site_content.get("meta", {}).get("site_url", "").rstrip("/")

_DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
_DAY_NAMES = {
    "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday", "Thu": "Thursday",
    "Fri": "Friday", "Sat": "Saturday", "Sun": "Sunday"
}


def _expand_day_range(key):
    """Turn 'Wed-Thu' into ['Wednesday', 'Thursday'] and 'Fri' into ['Friday']."""
    if "-" in key:
        start, end = [p.strip() for p in key.split("-", 1)]
        start_i, end_i = _DAY_ORDER.index(start), _DAY_ORDER.index(end)
        return [_DAY_NAMES[_DAY_ORDER[i]] for i in range(start_i, end_i + 1)]
    return [_DAY_NAMES[key.strip()]]


def _to_24h(time_str):
    """Turn '5pm' or '10:30am' into '17:00' / '10:30' for schema.org time values."""
    m = re.match(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)", time_str.strip(), re.IGNORECASE)
    if not m:
        return None
    hour, minute, ampm = int(m.group(1)), m.group(2) or "00", m.group(3).lower()
    if ampm == "pm" and hour != 12:
        hour += 12
    if ampm == "am" and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute}"


def build_restaurant_schema(site_content, base_site_url):
    """Build a schema.org Restaurant JSON-LD payload from footer contact info already in site.json."""
    contact = site_content.get("footer", {}).get("contact", {})
    address_str = contact.get("address", "")
    parts = [p.strip() for p in address_str.split(",")]
    street = parts[0] if len(parts) > 0 else ""
    locality = parts[1] if len(parts) > 1 else ""
    region, _, postal = (parts[2] if len(parts) > 2 else "").strip().partition(" ")

    opening_hours = []
    for key, val in contact.get("hours", {}).items():
        try:
            days = _expand_day_range(key)
            start_str, end_str = [p.strip() for p in val.split("-", 1)]
            opens, closes = _to_24h(start_str), _to_24h(end_str)
        except Exception:
            continue
        if opens and closes:
            opening_hours.append({
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": days,
                "opens": opens,
                "closes": closes
            })

    same_as = [s.get("url") for s in site_content.get("footer", {}).get("socials", []) if s.get("url")]
    og_image = site_content.get("meta", {}).get("og_image", "")
    image_url = og_image if og_image.startswith("http") else f"{base_site_url}/{og_image.lstrip('/')}"

    return {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "name": contact.get("name") or site_content.get("title"),
        "image": image_url,
        "url": base_site_url,
        "telephone": contact.get("phone"),
        "address": {
            "@type": "PostalAddress",
            "streetAddress": street,
            "addressLocality": locality,
            "addressRegion": region,
            "postalCode": postal,
            "addressCountry": "US"
        },
        "openingHoursSpecification": opening_hours,
        "sameAs": same_as,
        "menu": f"{base_site_url}/menu.html" if base_site_url else "menu.html",
        "acceptsReservations": True
    }


schema_json = json.dumps(build_restaurant_schema(site_content, base_site_url)) if base_site_url else ""

def enrich_events(events):
    """Extract month, day, and day of week from date field. Skip events without a valid date."""
    enriched = []
    for event in events:
        date_str = event.get("date")
        if not date_str:
            # skip events that don't have a date
            continue
        try:
            event_date = datetime.strptime(date_str, "%Y-%m-%d")
        except Exception:
            # skip events with malformed dates
            continue
        enriched.append({
            **event,
            "month": event_date.strftime("%B"),
            "day": event_date.strftime("%d").lstrip("0"),
            "dow": event_date.strftime("A") if False else event_date.strftime("%A")
        })
    return enriched

# Load all events once
with open("content/events.json", encoding="utf-8") as f:
    all_events = json.load(f)

# Enrich all events with date parts
all_events["events"] = enrich_events(all_events.get("events", []))
# Sort all events by date ascending (closest date first)
all_events["events"] = sorted(all_events["events"], key=lambda e: datetime.strptime(e.get("date"), "%Y-%m-%d"))

# Pages to render
page_files = [
    {"json": "index.json", "template": "index.html", "output": "index.html"},
    {"json": "menu.json", "template": "menu.html", "output": "menu.html"},
    {"json": "team.json", "template": "team.html", "output": "team.html"},
    {"json": "private-events.json", "template": "private-events.html", "output": "private-events.html"},
    {"json": "membership.json", "template": "membership.html", "output": "membership.html"},
    {"json": "events.json", "template": "events.html", "output": "events.html"},
    {"json": "contact.json", "template": "contact.html", "output": "contact.html"},
    {"json": "contact-thanks.json", "template": "contact-thanks.html", "output": "contact-thanks.html", "sitemap": False}
]

pages = []

for page in page_files:
    with open(f"content/{page['json']}", encoding="utf-8") as f:
        page_content = json.load(f)

    # Include all events in pages (client-side JS will hide expired events)
    page_events = page_content.get("events", [])
    # Use enriched & sorted global events for index and events pages.
    # Index should show only the next 3 upcoming events (exclude past events); events page shows all.
    if page['json'] == 'index.json':
        # Include all events for the index page and let client-side JS pick the next 3 upcoming
        page_events = all_events.get("events", [])
    elif page['json'] == 'events.json':
        page_events = all_events.get("events", [])
    else:
        # enrich and sort any page-specific events by date ascending
        if page_events:
            page_events = sorted(enrich_events(page_events), key=lambda e: datetime.strptime(e.get("date"), "%Y-%m-%d"))

    pages.append({
        "template": page["template"],   # use the template you want
        "output": page["output"],       # use the output you defined
        "sitemap": page.get("sitemap", True),
        "context": {
            "site": site_content,
            "meta": site_content["meta"],
            "seo": page_content.get("seo", {}),
            "canonical_url": (
                base_site_url
                if page["output"] == "index.html"
                else f"{base_site_url}/{page['output']}"
            ) if base_site_url else "",
            "footer": site_content.get("footer", {}),
            "hero": page_content.get("hero", ""),
            "title": page_content.get("title"),
            "menu": page_content,
            "panels": page_content.get("panels", {}),
            "extra_scripts": page_content.get("extra_scripts", []),
            "extra_styles": page_content.get("extra_styles", []),
            "team": page_content.get("team", []),
            "memberships": page_content.get("memberships", []),
            "events": page_events,
            "today": datetime.now().strftime("%Y-%m-%d"),
            "happy_hour": page_content.get("happy_hour", {}),
            "reviews": page_content.get("reviews", []),
            "holiday_hours": page_content.get("holiday_hours", []),
            "hide_footer": True if page['json'] == 'index.json' else False,
            "schema_json": schema_json
        }
    })

if os.path.exists("dist"):
    shutil.rmtree("dist")
os.makedirs("dist", exist_ok=True)

for page in pages:
    template = env.get_template(page["template"])
    html = template.render(page["context"])
    with open(os.path.join("dist", page["output"]), "w", encoding="utf-8") as f:
        f.write(html)

# Copy static assets
shutil.copytree("static/css", "dist/css", dirs_exist_ok=True)
shutil.copytree("static/js", "dist/js", dirs_exist_ok=True)
shutil.copytree("static/images", "dist/images", dirs_exist_ok=True)

# Generate robots.txt and sitemap.xml so search engines can discover all pages
if base_site_url:
    with open(os.path.join("dist", "robots.txt"), "w", encoding="utf-8") as f:
        f.write(f"User-agent: *\nAllow: /\n\nSitemap: {base_site_url}/sitemap.xml\n")

    today = datetime.now().strftime("%Y-%m-%d")
    urls = []
    for page in pages:
        if not page.get("sitemap", True):
            continue
        loc = base_site_url if page["output"] == "index.html" else f"{base_site_url}/{page['output']}"
        urls.append(f"  <url>\n    <loc>{loc}</loc>\n    <lastmod>{today}</lastmod>\n  </url>")
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls) +
        "\n</urlset>\n"
    )
    with open(os.path.join("dist", "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sitemap)

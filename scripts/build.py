from jinja2 import Environment, FileSystemLoader, select_autoescape
import json, os
from datetime import datetime
import shutil

env = Environment(loader=FileSystemLoader('templates'), autoescape=select_autoescape(["html", "xml"]))

# Load global site metadata
with open("content/site.json", encoding="utf-8") as f:
    site_content = json.load(f)

base_site_url = site_content.get("meta", {}).get("site_url", "").rstrip("/")

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
    {"json": "events.json", "template": "events.html", "output": "events.html"}
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
            "hide_footer": True if page['json'] == 'index.json' else False
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

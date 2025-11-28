from jinja2 import Environment, FileSystemLoader, select_autoescape
import json, csv, os
from collections import defaultdict
from datetime import datetime
import shutil

env = Environment(loader=FileSystemLoader('templates'), autoescape=select_autoescape(["html", "xml"]))

# Load global site metadata
with open("content/site.json", encoding="utf-8") as f:
    site_content = json.load(f)

def load_menu_csv(path):
    # panel → category → subtitle → {items: []}
    panels = defaultdict(
        lambda: defaultdict(
            lambda: defaultdict(lambda: {"items": []})
        )
    )
    with open(path, newline='', encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            panel = row["panel"]
            category = row["category"]
            subtitle = row["subtitle"]
            dish = row["dish"]
            price_glass = row["price_glass"]
            price_bottle = row["price_bottle"]

            panels[panel][category][subtitle]["items"].append({
                "dish": dish,
                "price_glass": price_glass,
                "price_bottle": price_bottle
            })
    return panels

menu_data = load_menu_csv("data/menu.csv")

# Pages to render
page_files = [
    {"json": "index.json", "template": "index.html", "output": "index.html"},
    {"json": "menu.json", "template": "menu.html", "output": "menu.html"},
    {"json": "team.json", "template": "team.html", "output": "team.html"},
    {"json": "private-events.json", "template": "private-events.html", "output": "private-events.html"},
    {"json": "membership.json", "template": "membership.html", "output": "membership.html"}
]

pages = []

for page in page_files:
    with open(f"content/{page['json']}", encoding="utf-8") as f:
        page_content = json.load(f)

    pages.append({
        "template": page["template"],   # use the template you want
        "output": page["output"],       # use the output you defined
        "context": {
            "site": site_content,
            "meta": site_content["meta"],
            "footer": site_content.get("footer", {}),
            "hero": page_content.get("hero", ""),
            "title": page_content.get("title"),
            "menu": menu_data,
            "panels": page_content.get("panels", {}),
            "extra_scripts": page_content.get("extra_scripts", []),
            "extra_styles": page_content.get("extra_styles", []),
            "team": page_content.get("team", []),
            "memberships": page_content.get("memberships", []),
            "events": page_content.get("events", []),
            "happy_hour": page_content.get("happy_hour", {}),
            "reviews": page_content.get("reviews", []),
            "holiday_hours": page_content.get("holiday_hours", [])
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

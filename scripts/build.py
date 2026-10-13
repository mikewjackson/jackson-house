from jinja2 import Environment, FileSystemLoader, select_autoescape
import json, os, re
from datetime import datetime
import shutil
import subprocess

env = Environment(loader=FileSystemLoader('templates'), autoescape=select_autoescape(["html", "xml"]))

_PREFORMATTED_OUTPUT_BLOCKS = re.compile(
    r"(<(?:pre|script|style|textarea)\b[^>]*>.*?</(?:pre|script|style|textarea)\s*>)",
    re.IGNORECASE | re.DOTALL
)


def _collapse_duplicate_blank_lines(text):
    """Keep rendered HTML readable without changing preformatted content."""
    def _collapse(segment):
        collapsed = []
        previous_blank = False
        for line in segment.splitlines(keepends=True):
            is_blank = not line.strip()
            if is_blank and previous_blank:
                continue
            collapsed.append("\n" if is_blank else line)
            previous_blank = is_blank
        return "".join(collapsed)

    parts = _PREFORMATTED_OUTPUT_BLOCKS.split(text)
    return "".join(
        part if index % 2 else _collapse(part)
        for index, part in enumerate(parts)
    )


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


def _source_last_modified(paths):
    """Return the latest source change date for accurate sitemap lastmod values."""
    try:
        dirty = subprocess.run(
            ["git", "diff", "--quiet", "HEAD", "--", *paths],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False
        )
        if dirty.returncode == 1:
            return datetime.now().strftime("%Y-%m-%d")

        result = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", *paths],
            capture_output=True,
            text=True,
            check=False
        )
    except OSError:
        return None

    last_modified = result.stdout.strip()
    return last_modified if re.fullmatch(r"\d{4}-\d{2}-\d{2}", last_modified) else None


# Geocoded once for the physical address in content/site.json (OpenStreetMap/Nominatim).
# Update this if the business ever changes location.
_RESTAURANT_GEO = {"latitude": 47.7538836, "longitude": -122.1620827}


def _parse_address(address_str):
    """Split a 'street, city, ST zip' string into schema.org PostalAddress parts."""
    parts = [p.strip() for p in address_str.split(",")]
    street = parts[0] if len(parts) > 0 else ""
    locality = parts[1] if len(parts) > 1 else ""
    region, _, postal = (parts[2] if len(parts) > 2 else "").strip().partition(" ")
    return {
        "@type": "PostalAddress",
        "streetAddress": street,
        "addressLocality": locality,
        "addressRegion": region,
        "postalCode": postal,
        "addressCountry": "US"
    }


def build_restaurant_schema(site_content, base_site_url):
    """Build a schema.org Restaurant JSON-LD payload from footer contact info already in site.json."""
    contact = site_content.get("footer", {}).get("contact", {})
    address = _parse_address(contact.get("address", ""))

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

    schema = {
        "@type": "Restaurant",
        "@id": f"{base_site_url}/#restaurant" if base_site_url else "#restaurant",
        "name": contact.get("name") or site_content.get("title"),
        "image": image_url,
        "url": base_site_url,
        "telephone": contact.get("phone_link") or contact.get("phone"),
        "priceRange": "$$$",
        "servesCuisine": ["Pacific Northwest", "American", "Small Plates", "Craft Cocktails"],
        "currenciesAccepted": "USD",
        "address": address,
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": _RESTAURANT_GEO["latitude"],
            "longitude": _RESTAURANT_GEO["longitude"]
        },
        "openingHoursSpecification": opening_hours,
        "sameAs": same_as,
        "hasMenu": f"{base_site_url}/menu.html" if base_site_url else "menu.html",
        "acceptsReservations": True
    }

    return schema


def _menu_item_offers(item):
    """Build one or more schema.org Offer entries from an item's various price fields."""
    def _num(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    named_prices = [
        (None, item.get("price")),
        ("Glass", item.get("price_glass")),
        ("Bottle", item.get("price_bottle")),
        ("1oz", item.get("price_1oz")),
        ("2oz", item.get("price_2oz")),
    ]
    for option in item.get("options", []) + item.get("add_ons", []):
        if isinstance(option, dict):
            named_prices.append((option.get("name"), option.get("price")))

    offers = []
    for name, raw_price in named_prices:
        price = _num(raw_price)
        if price is None:
            continue
        offer = {"@type": "Offer", "price": price, "priceCurrency": "USD"}
        if name:
            offer["name"] = name
        offers.append(offer)
    return offers


def build_menu_schema(menu_content, panels, base_site_url):
    """Build a schema.org Menu JSON-LD payload from the menu page content (panels/groups/items)."""
    sections = []
    for panel_key, panel_label in panels.items():
        panel_data = menu_content.get(panel_key, {})
        tagline = panel_data.get("tagline")
        if isinstance(tagline, list):
            tagline = " ".join(tagline)

        menu_items = []
        menu_sections = []
        for group in panel_data.get("groups", []):
            group_items = []
            for item in group.get("items", []):
                dish = item.get("dish")
                if not dish:
                    continue
                menu_item = {"@type": "MenuItem", "name": dish}
                item_description = item.get("description", "")
                tasting_notes = item.get("tasting_notes", "")
                if tasting_notes:
                    item_description = (
                        f"{item_description}. Tasting notes: {tasting_notes}"
                        if item_description else f"Tasting notes: {tasting_notes}"
                    )
                if item_description:
                    menu_item["description"] = item_description
                offers = _menu_item_offers(item)
                if len(offers) == 1:
                    menu_item["offers"] = offers[0]
                elif offers:
                    menu_item["offers"] = offers
                group_items.append(menu_item)

            if not group_items:
                continue

            group_name = group.get("name") or group.get("description")
            if group_name:
                group_section = {
                    "@type": "MenuSection",
                    "name": group_name,
                    "hasMenuItem": group_items
                }
                if group.get("name") and group.get("description"):
                    group_section["description"] = group["description"]
                menu_sections.append(group_section)
            else:
                menu_items.extend(group_items)

        if not menu_items and not menu_sections:
            continue
        section = {"@type": "MenuSection", "name": panel_label}
        if tagline:
            section["description"] = tagline
        if menu_items:
            section["hasMenuItem"] = menu_items
        if menu_sections:
            section["hasMenuSection"] = menu_sections
        sections.append(section)

    menu_url = f"{base_site_url}/menu.html" if base_site_url else "menu.html"
    season = menu_content.get("season")
    menu_schema = {
        "@type": "Menu",
        "@id": f"{base_site_url}/menu.html#menu" if base_site_url else "#menu",
        "name": f"Jackson House {season} Menu" if season else "Jackson House Menu",
        "url": menu_url,
        "hasMenuSection": sections
    }
    if base_site_url:
        menu_schema["isPartOf"] = {"@id": f"{base_site_url}/#restaurant"}
    return menu_schema


def build_restaurant_week_schema(restaurant_week, site_content, base_site_url):
    """Build Event JSON-LD for the current Seattle Restaurant Week promotion."""
    title = restaurant_week.get("title")
    if not title:
        return None

    event_url = f"{base_site_url}/#restaurant-week"
    restaurant_id = f"{base_site_url}/#restaurant"
    schema = {
        "@type": "Event",
        "@id": event_url,
        "name": f"{title} at {site_content.get('title', 'Jackson House')}",
        "url": event_url,
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {"@id": restaurant_id},
        "organizer": {"@id": restaurant_id}
    }

    if restaurant_week.get("summary"):
        schema["description"] = restaurant_week["summary"]
    if restaurant_week.get("start_date"):
        schema["startDate"] = restaurant_week["start_date"]
    if restaurant_week.get("end_date"):
        schema["endDate"] = restaurant_week["end_date"]

    image = restaurant_week.get("promo_image")
    if image:
        schema["image"] = image if image.startswith("http") else f"{base_site_url}/{image.lstrip('/')}"

    reservation_url = site_content.get("reservations_url")
    price = restaurant_week.get("price")
    if reservation_url or price is not None:
        offer = {"@type": "Offer"}
        if reservation_url:
            offer["url"] = reservation_url
        if price is not None:
            offer["price"] = price
            offer["priceCurrency"] = "USD"
        schema["offers"] = offer

    return schema


def _render_schema_graph(schemas):
    """Wrap one or more schema.org node dicts into valid JSON-LD (single object or @graph)."""
    schemas = [s for s in schemas if s]
    if not schemas:
        return ""
    if len(schemas) == 1:
        return json.dumps({"@context": "https://schema.org", **schemas[0]})
    return json.dumps({"@context": "https://schema.org", "@graph": schemas})


def build_llms_txt(site_content, content_by_json, future_events, base_site_url):
    """Build a plain-text llms.txt summary (per llmstxt.org) so AI assistants and chatbots
    can quickly find accurate facts about the business without parsing rendered HTML/JS."""
    footer = site_content.get("footer", {})
    contact = footer.get("contact", {})
    meta = site_content.get("meta", {})
    title = site_content.get("title", "")
    socials = [social for social in footer.get("socials", []) if social.get("url")]

    def _url(path):
        return f"{base_site_url}/{path}" if base_site_url else path

    def _format_price(value):
        if isinstance(value, str) and value.lower() in {"mkt", "market price"}:
            return "market price"
        try:
            amount = float(value)
        except (TypeError, ValueError):
            return None
        return f"${amount:.0f}" if amount.is_integer() else f"${amount:.2f}"

    def _menu_item_summary(item):
        prices = []
        for key, label in [
            ("price", None),
            ("price_glass", "glass"),
            ("price_bottle", "bottle"),
            ("price_1oz", "1 oz"),
            ("price_2oz", "2 oz"),
        ]:
            formatted_price = _format_price(item.get(key))
            if formatted_price:
                prices.append(f"{formatted_price} {label}" if label else formatted_price)

        details = []
        if item.get("description"):
            details.append(item["description"])
        if item.get("tasting_notes"):
            details.append(f"Tasting notes: {item['tasting_notes']}")

        for field, label in [("options", "Options"), ("add_ons", "Add-ons")]:
            choices = []
            for choice in item.get(field, []):
                if not isinstance(choice, dict) or not choice.get("name"):
                    continue
                choice_price = _format_price(choice.get("price"))
                choices.append(
                    f"{choice['name']} ({choice_price})"
                    if choice_price else choice["name"]
                )
            if choices:
                details.append(f"{label}: {', '.join(choices)}")

        summary = item["dish"]
        if prices:
            summary += f" ({'; '.join(prices)})"
        if details:
            summary += f": {'; '.join(details)}"
        return summary

    lines = [
        f"# {title}",
        "",
        f"> {meta.get('description', '')}",
        "",
        f"Last updated: {datetime.now().strftime('%Y-%m-%d')}",
        ""
    ]

    hours = contact.get("hours", {})
    if hours:
        lines.append("Hours: " + "; ".join(f"{day} {time}" for day, time in hours.items()))
    happy_hour = content_by_json.get("index.json", {}).get("happy_hour", {}).get("hours", {})
    if happy_hour:
        lines.append("Happy Hour: " + "; ".join(f"{day} {time}" for day, time in happy_hour.items()))
    if contact.get("address"):
        lines.append(f"Address: {contact['address']}")
    if contact.get("phone"):
        lines.append(f"Phone: {contact['phone']}")
    if contact.get("email"):
        lines.append(f"Email: {contact['email']}")
    lines.append("")

    hero_paragraphs = content_by_json.get("index.json", {}).get("hero", {}).get("paragraphs", [])
    if hero_paragraphs:
        lines.extend(hero_paragraphs)
        lines.append("")

    visit_questions = content_by_json.get("index.json", {}).get("visit_questions", [])
    if visit_questions:
        lines.append("## Planning Your Visit")
        for item in visit_questions:
            lines.append(f"- {item['question']} {item['answer']}")
        lines.append("")

    restaurant_week = content_by_json.get("index.json", {}).get("restaurant_week", {})
    if restaurant_week.get("title"):
        lines.append(f"## {restaurant_week['title']}")
        if restaurant_week.get("dates"):
            lines.append(f"- Dates: {restaurant_week['dates']}")
        if restaurant_week.get("summary"):
            lines.append(f"- {restaurant_week['summary']}")
        for menu in restaurant_week.get("menus", []):
            if not menu.get("name"):
                continue
            price = restaurant_week.get("price")
            price_label = f" (${price})" if price is not None else ""
            description = f" - {menu['description']}" if menu.get("description") else ""
            lines.append(f"### {menu['name']}{price_label}{description}")
            for item in menu.get("items", []):
                lines.append(f"- {item}")
        reservation_url = site_content.get("reservations_url")
        if reservation_url:
            lines.append(f"- [Reserve a table]({reservation_url})")
        if restaurant_week.get("booking_note"):
            lines.append(f"- Booking note: {restaurant_week['booking_note']}")
        lines.append("")

    menu_content = content_by_json.get("menu.json", {})
    panels = menu_content.get("panels", {})
    if panels:
        menu_season = menu_content.get("season")
        season_prefix = f"{menu_season} " if menu_season else ""
        lines.append("## Menu")
        lines.append(
            f"- [Full menu]({_url('menu.html')}): {season_prefix}menu featuring "
            f"{', '.join(panels.values())}, with current dishes and prices."
        )
        lines.append("")
        lines.append("## Current Menu Details")
        for panel_key, panel_label in panels.items():
            panel_data = menu_content.get(panel_key, {})
            lines.append(f"### {panel_label}")

            tagline = panel_data.get("tagline")
            if isinstance(tagline, list):
                tagline = " ".join(tagline)
            if tagline:
                lines.append(tagline)

            for group in panel_data.get("groups", []):
                group_name = group.get("name") or group.get("description")
                if group_name:
                    group_description = (
                        group.get("description")
                        if group.get("name") and group.get("description") else ""
                    )
                    lines.append(
                        f"#### {group_name}"
                        + (f" - {group_description}" if group_description else "")
                    )
                for item in group.get("items", []):
                    if item.get("dish"):
                        lines.append(f"- {_menu_item_summary(item)}")
            lines.append("")

    lines.append("## Events")
    event_summaries = [
        f"{event.get('date')}: {event.get('title')} ({event.get('time')})"
        for event in future_events[:20]
    ]
    if len(future_events) > 20:
        event_summaries.append(f"{len(future_events) - 20} additional upcoming events")
    event_details = "; ".join(event_summaries) or "Current event calendar."
    lines.append(f"- [All upcoming events]({_url('events.html')}): {event_details}")
    lines.append("")

    memberships = content_by_json.get("membership.json", {}).get("memberships", [])
    if memberships:
        details = "; ".join(
            f"{membership.get('name')} ({membership.get('price')}): "
            f"{'; '.join(membership.get('benefits', []))}"
            for membership in memberships
            if membership.get("name")
        )
        lines.append("## Membership")
        lines.append(f"- [Membership]({_url('membership.html')}): {details}")
        lines.append("")

    team = content_by_json.get("team.json", {}).get("team", [])
    if team:
        details = "; ".join(
            f"{member.get('name')}, {member.get('title')}"
            for member in team
            if member.get("name") and member.get("title")
        )
        lines.append("## Team")
        lines.append(f"- [Meet the team]({_url('team.html')}): {details}")
        lines.append("")

    lines.append("## Contact")
    lines.append(f"- [Contact us]({_url('contact.html')})")
    if socials:
        lines.append("")
        lines.append("## Optional")
        for social in socials:
            lines.append(f"- [{social.get('platform') or social['url']}]({social['url']})")

    return "\n".join(lines).rstrip() + "\n"


restaurant_schema = build_restaurant_schema(site_content, base_site_url)

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

# Future/today events only for the AI-friendly event summary.
_today_midnight = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
future_events_all = [
    e for e in all_events["events"]
    if datetime.strptime(e["date"], "%Y-%m-%d") >= _today_midnight
]

# Pages to render
page_files = [
    {"json": "index.json", "template": "index.html", "output": "index.html"},
    {"json": "menu.json", "template": "menu.html", "output": "menu.html"},
    {"json": "team.json", "template": "team.html", "output": "team.html"},
    {"json": "private-events.json", "template": "private-events.html", "output": "private-events.html", "sitemap": False},
    {"json": "membership.json", "template": "membership.html", "output": "membership.html"},
    {"json": "events.json", "template": "events.html", "output": "events.html"},
    {"json": "contact.json", "template": "contact.html", "output": "contact.html"},
    {"json": "contact-thanks.json", "template": "contact-thanks.html", "output": "contact-thanks.html", "sitemap": False}
]

_SHARED_PAGE_SOURCES = [
    "content/site.json",
    "scripts/build.py",
    "templates/base.html",
    "templates/head.html",
    "templates/header.html",
    "templates/footer.html",
]


def _page_last_modified(page):
    """Return the latest significant source change for a rendered page."""
    sources = _SHARED_PAGE_SOURCES + [
        f"content/{page['json']}",
        f"templates/{page['template']}"
    ]
    if page["json"] == "index.json":
        sources.append("content/events.json")
    return _source_last_modified(sources)


pages = []
content_by_json = {}

for page in page_files:
    with open(f"content/{page['json']}", encoding="utf-8") as f:
        page_content = json.load(f)
    content_by_json[page["json"]] = page_content

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

    page_schema_extra = []
    if page["json"] == "menu.json":
        page_schema_extra = [build_menu_schema(page_content, page_content.get("panels", {}), base_site_url)]
    elif page["json"] == "index.json" and page_content.get("restaurant_week"):
        page_schema_extra = [build_restaurant_week_schema(page_content["restaurant_week"], site_content, base_site_url)]
    page_schema_json = _render_schema_graph([restaurant_schema] + page_schema_extra) if base_site_url else ""

    pages.append({
        "template": page["template"],   # use the template you want
        "output": page["output"],       # use the output you defined
        "sitemap": page.get("sitemap", True),
        "lastmod": _page_last_modified(page),
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
            "restaurant_week": page_content.get("restaurant_week", {}),
            "hide_footer": True if page['json'] == 'index.json' else False,
            "schema_json": page_schema_json
        }
    })

if os.path.exists("dist"):
    shutil.rmtree("dist")
os.makedirs("dist", exist_ok=True)

for page in pages:
    template = env.get_template(page["template"])
    html = _collapse_duplicate_blank_lines(template.render(page["context"]))
    with open(os.path.join("dist", page["output"]), "w", encoding="utf-8") as f:
        f.write(html)

# Copy static assets
shutil.copytree("static/css", "dist/css", dirs_exist_ok=True)
shutil.copytree("static/js", "dist/js", dirs_exist_ok=True)
shutil.copytree("static/images", "dist/images", dirs_exist_ok=True)

# Generate robots.txt, sitemap.xml, and llms.txt so search engines and AI assistants
# can discover and accurately summarize all pages
if base_site_url:
    with open(os.path.join("dist", "robots.txt"), "w", encoding="utf-8") as f:
        f.write(
            f"User-agent: *\nAllow: /\n\n"
            f"Sitemap: {base_site_url}/sitemap.xml\n\n"
            f"# AI assistant summary: {base_site_url}/llms.txt\n"
        )

    urls = []
    for page in pages:
        if not page.get("sitemap", True):
            continue
        loc = base_site_url if page["output"] == "index.html" else f"{base_site_url}/{page['output']}"
        lastmod = page.get("lastmod")
        lastmod_element = f"\n    <lastmod>{lastmod}</lastmod>" if lastmod else ""
        urls.append(f"  <url>\n    <loc>{loc}</loc>{lastmod_element}\n  </url>")
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls) +
        "\n</urlset>\n"
    )
    with open(os.path.join("dist", "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sitemap)

    llms_txt = build_llms_txt(site_content, content_by_json, future_events_all, base_site_url)
    with open(os.path.join("dist", "llms.txt"), "w", encoding="utf-8") as f:
        f.write(llms_txt)

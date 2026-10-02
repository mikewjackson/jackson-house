Steps to update Jackson House website

In the content folder:
  index.json -> The text that appears on the home page
  membership.json -> The text that appears on the membership page
  menu.json -> The menu itself
  private-events.json -> The text that appears on the private events page
  team.json -> The text that appears on the team page. 

The private events page is still built for direct access, but is marked
`noindex,follow` and omitted from sitemap.xml and llms.txt. Do not block it in
robots.txt: crawlers need access to read the noindex directive.

Menu tabs support shareable fragments: `menu.html#dining`, `#lounge`,
`#after_dinner`, `#whiskey`, `#cocktail`, `#beer`, `#wine`, and `#happy-hour`.
Selecting a tab updates the URL; opening a link or using Back/Forward restores
the selected menu. Unknown fragments fall back to Dining.

Visit questions are edited in `content/index.json` under `visit_questions`.
They appear only in the generated llms.txt summary, not in homepage HTML.
AI tools may use this public file; inclusion does not guarantee AI use or
search indexing.

To make a change run the following commands in Windows Terminal:

cd \jackson-house
git pull
<make changes>
python .\scripts\build.py
<validate changes>

Once everything looks good run the following commands:

git add *
git commit -m "add a brief description of your changes here"
git push

after that, change should be live in ~1 minute

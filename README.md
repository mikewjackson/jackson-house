Steps to update Jackson House website

In the content folder:
  index.json -> The text that appears on the home page
  membership.json -> The text that appears on the membership page
  menu.json -> The menu itself
  private-events.json -> The text that appears on the private events page
  team.json -> The text that appears on the team page. 

In the data folder:
  menu.csv -> The items that appear on the menu page.

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

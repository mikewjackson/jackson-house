document.addEventListener('DOMContentLoaded', function() {
  function toDateOnly(d) {
    if (!d) return null;
    var parts = d.split('-');
    if (parts.length !== 3) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  var today = new Date();
  today.setHours(0,0,0,0);

  // Collect event items with parsed dates
  var eventNodeList = document.querySelectorAll('.event-item[data-date]');
  var events = [];
  eventNodeList.forEach(function(el){
    var ds = el.getAttribute('data-date');
    var ed = toDateOnly(ds);
    if (!ed) return; // drop malformed
    ed.setHours(0,0,0,0);
    events.push({ el: el, date: ed });
  });

  // Hide past events and keep future/today events array
  var futureEvents = events.filter(function(e){ return e.date >= today; });

  // Sort future events by date ascending (closest first)
  futureEvents.sort(function(a,b){ return a.date - b.date; });

  // If on the index page, show only the next 3 upcoming; otherwise show all future events
  var path = window.location.pathname || '';
  var onIndex = path === '/' || path.endsWith('index.html');
  var toShow = onIndex ? futureEvents.slice(0,3) : futureEvents;

  // First hide everything, then un-hide the desired ones
  events.forEach(function(e){ e.el.style.display = 'none'; });
  toShow.forEach(function(e){ e.el.style.display = ''; });

  // Hide upcoming-events section if no visible items and show message on events page
  var upcomingSection = document.getElementById('upcoming-events-section');
  var totalVisibleCount = toShow.length;

  if (upcomingSection) {
    var visibleCount = 0;
    upcomingSection.querySelectorAll('.event-item').forEach(function(el){
      if (el.offsetParent !== null) visibleCount += 1; // visible in layout
    });
    if (visibleCount === 0) upcomingSection.style.display = 'none';
  }

  // Show a friendly message on the events page if no events are visible
  var noMsg = document.getElementById('no-events-message');
  if (noMsg) {
    if (totalVisibleCount === 0) {
      noMsg.style.display = '';
    } else {
      noMsg.style.display = 'none';
    }
  }

  // For events page, hide hp-tl-track if no visible
  var tracks = document.querySelectorAll('.hp-tl-track');
  tracks.forEach(function(track){
    var visibleCount = 0;
    track.querySelectorAll('.event-item').forEach(function(el){
      if (el.offsetParent !== null) visibleCount += 1;
    });
    if (visibleCount === 0) track.style.display = 'none';
  });
});
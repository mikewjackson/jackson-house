document.addEventListener('DOMContentLoaded', function() {
  function toDateOnly(d) {
    if (!d) return null;
    var parts = d.split('-');
    if (parts.length !== 3) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  var today = new Date();
  today.setHours(0,0,0,0);

  var eventItems = document.querySelectorAll('.event-item[data-date]');
  var anyVisible = false;

  eventItems.forEach(function(el) {
    var ds = el.getAttribute('data-date');
    var ed = toDateOnly(ds);
    if (!ed) {
      el.style.display = 'none';
      return;
    }
    ed.setHours(0,0,0,0);
    if (ed >= today) {
      el.style.display = '';
      anyVisible = true;
    } else {
      el.style.display = 'none';
    }
  });

  // Hide upcoming-events section if no visible items and show message on events page
  var upcomingSection = document.getElementById('upcoming-events-section');
  var totalVisibleCount = 0;
  eventItems.forEach(function(el){
    if (el.offsetParent !== null) totalVisibleCount += 1;
  });

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
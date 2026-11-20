function calendarRow(title, date, venue, location, url) {
  const instant = new Date(date);
  const format = options => instant.toLocaleString('en-US', { timeZone: 'America/New_York', ...options });
  const place = [...new Set([venue, location].filter(Boolean))].join(' · ');
  const when = format({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return { title, date, location: place, when, details: [when, place].filter(Boolean).join(' · '), url, month: format({month:'short'}), day: format({day:'numeric'}) };
}

window.aibgRecruitment = {
  async loadEvents(page) {
    try {
      const response = await fetch('/api/events', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const records = await response.json();
      const rows = records.filter(e => Date.parse(e.eventDate || e.date) >= Date.now())
        .sort((a,b) => Date.parse(a.eventDate || a.date) - Date.parse(b.eventDate || b.date))
        .map(e => calendarRow(e.title, e.eventDate || e.date, e.venue, e.location,
          '/events/' + encodeURIComponent(e.slug || e.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))));
      page.setState({ calendar: rows, calendarMessage: rows.length ? '' : 'No upcoming events have been posted.' });
    } catch {
      page.setState({ calendarMessage: 'Upcoming events could not be loaded.' });
    }
  },
  async load(page) {
    if (page.pvAllowed) return;
    try {
      const response = await fetch('/api/public/recruitment-cycle', { cache: 'no-store' });
      if (!response.ok) return;
      const cycle = await response.json();
      const now = Date.now();
      const opens = Date.parse(cycle.portalOpenAt);
      const closes = Math.min(Date.parse(cycle.applicationDueAt), Date.parse(cycle.portalCloseAt) || Infinity);
      let state = 'closed';
      if ((cycle.isActive || cycle.isUpcoming) && opens > now) state = 'opening-soon';
      else if (cycle.isActive && now < closes) state = closes - now < 72 * 3600000 ? 'closing-soon' : 'open';
      const events = (cycle.events || []).filter(e => Date.parse(e.startAt) >= now)
        .sort((a,b) => Date.parse(a.startAt) - Date.parse(b.startAt));
      const recruitmentEvents = events.map(e => calendarRow(e.title, e.startAt, e.venue, e.location, '/portal/events'));
      const milestones = [['Applications open', cycle.portalOpenAt], ['Application due', cycle.applicationDueAt], ['Portal closes', cycle.portalCloseAt]]
        .filter(([,date]) => Number.isFinite(Date.parse(date)))
        .map(([title,date]) => calendarRow(title,date,'','','/portal'));
      page.liveCycle = { opensAt: cycle.portalOpenAt, closesAt: Number.isFinite(closes) ? new Date(closes).toISOString() : null, cycle: cycle.cycleName || '', infoSessions: recruitmentEvents.filter((_,i) => events[i].eventType === "info_session").map(e => ({date:e.when,location:e.location})), timeline: [] };
      page.setState({ recruitmentEvents, milestones, st: { ...page.state.st, r: state } });
    } catch {
      // Keep the application link closed if the public cycle cannot be loaded.
    }
  },
  async subscribe(email) {
    const response = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase(), source: 'recruitment' })
    });
    if (!response.ok) throw new Error('Subscription failed');
  }
};

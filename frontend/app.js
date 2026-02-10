// Ticketing platform – frontend (events, venues, tickets, ETL). Serve via http://localhost:3000.
const API = '';
const FETCH_TIMEOUT_MS = 10000;

// Hide app when opened as file:// (API would fail)
if (window.location.protocol === 'file:') {
  document.getElementById('file-open-warning').classList.remove('d-none');
  document.getElementById('app-content').classList.add('d-none');
} else {
  document.getElementById('file-open-warning').classList.add('d-none');
}

function $(id) { return document.getElementById(id); }
function escapeHtml(s) {
  if (s == null) return '—';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
function formatDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
}

// Success toast (auto-dismiss 4s); used after add event / sell ticket
function showSuccessToast(title, message) {
  const container = $('toast-container');
  if (!container) return;
  const id = 'toast-' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'toast-success';
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <span class="toast-icon" aria-hidden="true"><i class="bi bi-check-lg"></i></span>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
  `;
  container.appendChild(el);
  const dismiss = () => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 320);
  };
  setTimeout(dismiss, 4000);
}

function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

// Stats strip (events, venues, tickets counts)
let statsCounts = { events: null, venues: null, tickets: null };
function updateStatsStrip() {
  const strip = $('stats-strip');
  if (!strip) return;
  if (statsCounts.events === null && statsCounts.venues === null && statsCounts.tickets === null) return;
  strip.classList.remove('d-none');
  const n = (v) => (v == null ? '—' : v);
  const el = $('stats-events'), vl = $('stats-venues'), tl = $('stats-tickets');
  if (el) el.textContent = n(statsCounts.events);
  if (vl) vl.textContent = n(statsCounts.venues);
  if (tl) tl.textContent = n(statsCounts.tickets);
}

// Events
async function loadEvents() {
  $('events-loading').classList.remove('d-none');
  $('events-error').classList.add('d-none');
  try {
    const r = await fetchWithTimeout(API + '/api/events');
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    $('events-loading').classList.add('d-none');
    const tbody = $('events-table').querySelector('tbody');
    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No events yet.</td></tr>';
    } else {
      tbody.innerHTML = data.map(e => `
        <tr>
          <td>${escapeHtml(e.Title)}</td>
          <td>${escapeHtml(e.VenueName)}</td>
          <td>${formatDate(e.EventDate)}</td>
          <td><span class="badge bg-success">${escapeHtml(e.Status)}</span></td>
        </tr>
      `).join('');
      fillEventDropdowns(data);
    }
    statsCounts.events = Array.isArray(data) ? data.length : 0;
    updateStatsStrip();
    $('events-table').classList.remove('d-none');
  } catch (e) {
    $('events-loading').classList.add('d-none');
    $('events-error').classList.remove('d-none');
    $('events-error').textContent = 'Could not load events. Open http://localhost:3000 in your browser.';
  }
}

function fillEventDropdowns(events) {
  const sel = $('ticket-event');
  const was = sel.value;
  sel.innerHTML = events.map(e => `<option value="${e.Id}">${escapeHtml(e.Title)}</option>`).join('');
  if (was) sel.value = was;
  else if (events.length) sel.value = events[0].Id;
}

// Venues
async function loadVenues() {
  $('venues-loading').classList.remove('d-none');
  $('venues-error').classList.add('d-none');
  try {
    const r = await fetchWithTimeout(API + '/api/venues');
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    $('venues-loading').classList.add('d-none');
    const tbody = $('venues-table').querySelector('tbody');
    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted">No venues yet.</td></tr>';
    } else {
      tbody.innerHTML = data.map(v => `
        <tr>
          <td>${escapeHtml(v.Name)}</td>
          <td>${escapeHtml(v.City || '—')}</td>
          <td>${v.Capacity != null ? v.Capacity.toLocaleString() : '—'}</td>
        </tr>
      `).join('');
    }
    statsCounts.venues = Array.isArray(data) ? data.length : 0;
    updateStatsStrip();
    $('venues-table').classList.remove('d-none');
  } catch (e) {
    $('venues-loading').classList.add('d-none');
    $('venues-error').classList.remove('d-none');
    $('venues-error').textContent = 'Could not load venues. Open http://localhost:3000 in your browser.';
  }
}

// Events & ticket sales (summary + View tickets detail)
let ticketEventTickets = [];

async function loadTicketEventSummary() {
  const loadingEl = $('ticket-event-loading');
  const errorEl = $('ticket-event-error');
  const contentEl = $('ticket-event-content');
  if (!loadingEl || !contentEl) return;
  loadingEl.classList.remove('d-none');
  errorEl.classList.add('d-none');
  contentEl.classList.add('d-none');
  try {
    const [summaryRes, ticketsRes] = await Promise.all([
      fetchWithTimeout(API + '/api/events/ticket-summary'),
      fetchWithTimeout(API + '/api/tickets'),
    ]);
    if (!summaryRes.ok || !ticketsRes.ok) throw new Error('Failed to load');
    const summary = await summaryRes.json();
    ticketEventTickets = await ticketsRes.json();
    loadingEl.classList.add('d-none');
    const tbody = $('ticket-event-tbody');
    if (!summary || !summary.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-muted">No events yet.</td></tr>';
    } else {
      tbody.innerHTML = summary.map(e => `
        <tr data-event-id="${e.Id}">
          <td>${escapeHtml(e.Title)}</td>
          <td>${escapeHtml(e.VenueName)}</td>
          <td>${formatDate(e.EventDate)}</td>
          <td class="text-end">${e.TicketCount != null ? e.TicketCount : 0}</td>
          <td class="text-end">£${Number(e.TotalRevenue || 0).toFixed(2)}</td>
          <td>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-view-tickets" data-event-id="${e.Id}" data-event-title="${escapeHtml(e.Title)}">
              View tickets
            </button>
          </td>
        </tr>
      `).join('');
      tbody.querySelectorAll('.btn-view-tickets').forEach(btn => {
        btn.addEventListener('click', () => showTicketsForEvent(parseInt(btn.dataset.eventId, 10), btn.dataset.eventTitle));
      });
    }
    contentEl.classList.remove('d-none');
  } catch (e) {
    loadingEl.classList.add('d-none');
    errorEl.classList.remove('d-none');
    errorEl.textContent = 'Could not load events & ticket summary.';
  }
}

function showTicketsForEvent(eventId, eventTitle) {
  const detail = $('ticket-event-detail');
  const detailTitle = $('ticket-event-detail-title');
  const detailTbody = $('ticket-event-detail-tbody');
  if (!detail || !detailTbody) return;
  const forEvent = ticketEventTickets.filter(t => t.EventId === eventId);
  detailTitle.textContent = eventTitle || 'Event';
  if (!forEvent.length) {
    detailTbody.innerHTML = '<tr><td colspan="3" class="text-muted">No tickets sold for this event yet.</td></tr>';
  } else {
    detailTbody.innerHTML = forEvent.map(t => `
      <tr>
        <td>${escapeHtml(t.CustomerName || '—')}</td>
        <td>${t.Quantity}</td>
        <td>£${Number(t.Total).toFixed(2)}</td>
      </tr>
    `).join('');
  }
  detail.classList.remove('d-none');
}

function closeTicketEventDetail() {
  const detail = $('ticket-event-detail');
  if (detail) detail.classList.add('d-none');
}
$('ticket-event-detail-close')?.addEventListener('click', closeTicketEventDetail);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const detail = $('ticket-event-detail');
    if (detail && !detail.classList.contains('d-none')) closeTicketEventDetail();
  }
});

$('refresh-events')?.addEventListener('click', () => loadEvents());
$('refresh-venues')?.addEventListener('click', () => loadVenues());
$('refresh-tickets')?.addEventListener('click', () => loadTickets());
$('refresh-ticket-event')?.addEventListener('click', () => loadTicketEventSummary());

// Tickets
async function loadTickets() {
  $('tickets-loading').classList.remove('d-none');
  $('tickets-error').classList.add('d-none');
  try {
    const r = await fetchWithTimeout(API + '/api/tickets');
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    $('tickets-loading').classList.add('d-none');
    const tbody = $('tickets-table').querySelector('tbody');
    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No tickets yet.</td></tr>';
    } else {
      tbody.innerHTML = data.map(t => `
        <tr>
          <td>${escapeHtml(t.EventTitle)}</td>
          <td>${escapeHtml(t.CustomerName || '—')}</td>
          <td>${t.Quantity}</td>
          <td>£${Number(t.Total).toFixed(2)}</td>
        </tr>
      `).join('');
    }
    statsCounts.tickets = Array.isArray(data) ? data.length : 0;
    updateStatsStrip();
    $('tickets-table').classList.remove('d-none');
  } catch (e) {
    $('tickets-loading').classList.add('d-none');
    $('tickets-error').classList.remove('d-none');
    $('tickets-error').textContent = 'Could not load tickets. Open http://localhost:3000 in your browser.';
  }
}

// Add event
$('event-add').addEventListener('click', async () => {
  const venueId = $('event-venue').value;
  const title = $('event-title').value.trim();
  const eventDate = $('event-date').value;
  const msg = $('event-message');
  if (!title || !eventDate) {
    msg.textContent = 'Please enter event title and date.';
    msg.className = 'small mt-2 mb-0 text-danger';
    return;
  }
  msg.textContent = 'Adding…';
  msg.className = 'small mt-2 mb-0 text-muted';
  try {
    const r = await fetch(API + '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: parseInt(venueId, 10), title, eventDate }),
    });
    const data = await r.json();
    if (r.ok && data.Id) {
      msg.textContent = 'Event added.';
      msg.className = 'small mt-2 mb-0 text-success';
      $('event-title').value = '';
      loadEvents();
      showSuccessToast('Event added', 'Your event has been added successfully.');
    } else {
      msg.textContent = data.error || 'Could not add event.';
      msg.className = 'small mt-2 mb-0 text-danger';
    }
  } catch (_) {
    msg.textContent = 'Something went wrong.';
    msg.className = 'small mt-2 mb-0 text-danger';
  }
});

// Default date: tomorrow 19:00
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(19, 0, 0, 0);
$('event-date').value = tomorrow.toISOString().slice(0, 16);

// Sell ticket
$('ticket-add').addEventListener('click', async () => {
  const eventId = $('ticket-event').value;
  const customerName = $('ticket-customer').value.trim();
  const quantity = parseInt($('ticket-qty').value, 10) || 1;
  const totalRaw = $('ticket-total').value.trim();
  const total = parseFloat(totalRaw);
  const msg = $('ticket-message');
  if (!eventId || !customerName) {
    msg.textContent = 'Please select an event and enter customer name.';
    msg.className = 'small mt-2 mb-0 text-danger';
    return;
  }
  if (totalRaw === '' || isNaN(total) || total < 0) {
    msg.textContent = 'Please enter a valid total amount (0 or more).';
    msg.className = 'small mt-2 mb-0 text-danger';
    return;
  }
  msg.textContent = 'Selling…';
  msg.className = 'small mt-2 mb-0 text-muted';
  try {
    const r = await fetch(API + '/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: parseInt(eventId, 10), customerName, quantity, total: Number(total) }),
    });
    const data = await r.json();
    if (r.ok && data.Id) {
      msg.textContent = 'Ticket sold.';
      msg.className = 'small mt-2 mb-0 text-success';
      $('ticket-customer').value = '';
      $('ticket-total').value = '';
      loadTickets();
      loadTicketEventSummary();
      showSuccessToast('Ticket sold', 'Ticket sale completed successfully.');
    } else {
      msg.textContent = data.error || 'Could not sell ticket.';
      msg.className = 'small mt-2 mb-0 text-danger';
    }
  } catch (_) {
    msg.textContent = 'Something went wrong.';
    msg.className = 'small mt-2 mb-0 text-danger';
  }
});

// Import events (ETL)
$('import-btn').addEventListener('click', async () => {
  let arr;
  try {
    arr = JSON.parse($('import-input').value);
  } catch (e) {
    $('import-response').textContent = 'Invalid JSON. Use an array of { venueId, title, eventDate }.';
    return;
  }
  const list = Array.isArray(arr) ? arr : [arr];
  $('import-result').textContent = 'Importing…';
  $('import-result').className = 'ms-2 small text-muted';
  try {
    const r = await fetch(API + '/api/etl/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list),
    });
    const data = await r.json();
    $('import-response').textContent = JSON.stringify(data, null, 2);
    if (r.ok && data.loaded) {
      $('import-result').textContent = 'Imported ' + data.loaded + ' event(s).';
      $('import-result').className = 'ms-2 small text-success';
      loadEvents();
    } else {
      $('import-result').textContent = 'Error';
      $('import-result').className = 'ms-2 small text-danger';
    }
  } catch (_) {
    $('import-response').textContent = 'Request failed.';
    $('import-result').textContent = 'Error';
    $('import-result').className = 'ms-2 small text-danger';
  }
});

if (window.location.protocol !== 'file:') {
  loadEvents();
  loadVenues();
  loadTickets();
  loadTicketEventSummary();
}

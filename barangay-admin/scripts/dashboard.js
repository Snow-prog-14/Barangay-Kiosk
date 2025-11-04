import { fmtDate, getCurrentUser } from './app.js';

export function renderDashboard(REQUESTS, CITIZENS) {
  // Get current user
  const user = getCurrentUser();
  const isAdmin = user && user.role === 'Admin';

  // KPIs
  document.getElementById('kpiCitizens').textContent = CITIZENS.length;
  document.getElementById('kpiRequests').textContent = REQUESTS.length;
  document.getElementById('kpiProcessing').textContent = REQUESTS.filter(r => r.status === 'processing').length;
  document.getElementById('kpiReleased').textContent = REQUESTS.filter(r => r.status === 'released').length;

  // 🧾 Recent Requests Table
  const recent = [...REQUESTS]
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))
    .slice(0, 6);

  const pill = s => ({
    pending: 'pill-pending',
    received: 'pill-received',
    processing: 'pill-processing',
    ready_for_pickup: 'pill-rfp',
    released: 'pill-released',
    rejected: 'pill-rejected'
  }[s] || 'pill-rejected');

  const recentRows = document.getElementById('recentRows');
  if (recentRows) {
    recentRows.innerHTML = recent.map(r => `
      <tr>
        <td>${r.id}</td>
        <td><span class="badge badge-ref">${r.ref}</span></td>
        <td>${r.citizen}</td>
        <td>${r.type}</td>
        <td><span class="pill ${pill(r.status)}">${r.status}</span></td>
        <td>${fmtDate(r.updated)}</td>
      </tr>
    `).join('');
  }

  // 📊 Charts
  const brand = getComputedStyle(document.documentElement)
    .getPropertyValue('--brand-500')
    .trim() || '#28a745'; // green theme

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const barData = months.map(() => Math.floor(Math.random() * 80) + 20);
  const lineData = months.map(() => Math.floor(Math.random() * 60) + 20);

  const chartBarEl = document.getElementById('chartBar');
  if (chartBarEl) {
    new Chart(chartBarEl, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{ label: 'Requests', data: barData, backgroundColor: brand }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  const chartLineEl = document.getElementById('chartLine');
  if (chartLineEl) {
    new Chart(chartLineEl, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Completed %',
          data: lineData,
          borderColor: brand,
          tension: 0.35,
          fill: false
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100 } }
      }
    });
  }

  // 🕵️‍♂️ --- AUDIT LOGS SECTION ---
  const auditSection = document.querySelector('.audit-section');
  if (auditSection) {
    // Hide for non-admins
    if (!isAdmin) {
      auditSection.style.display = 'none';
      return;
    }

    // Example logs (these could come from API later)
    const auditLogs = [
      { date: '2025-11-04 09:32', user: 'Admin', action: 'login', details: 'Logged into the admin portal' },
      { date: '2025-11-04 09:35', user: 'Clerk01', action: 'update', details: 'Updated request #102' },
      { date: '2025-11-04 10:00', user: 'Admin', action: 'delete', details: 'Deleted outdated records' },
      { date: '2025-11-04 10:10', user: 'Resident_Jane', action: 'request', details: 'Submitted Barangay Clearance' },
    ];

    const auditRows = document.getElementById('auditRows');
    const auditSearch = document.getElementById('auditSearch');
    const auditFilter = document.getElementById('auditFilter');

    const renderAuditLogs = logs => {
      auditRows.innerHTML = '';
      if (logs.length === 0) {
        auditRows.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No logs found.</td></tr>`;
        return;
      }
      logs.forEach(log => {
        const color =
          log.action === 'login' ? 'info' :
          log.action === 'update' ? 'warning' :
          log.action === 'delete' ? 'danger' :
          log.action === 'request' ? 'secondary' : 'light';

        auditRows.innerHTML += `
          <tr>
            <td>${log.date}</td>
            <td>${log.user}</td>
            <td><span class="badge bg-${color} text-dark">${log.action}</span></td>
            <td>${log.details}</td>
          </tr>
        `;
      });
    };

    const filterAuditLogs = () => {
      const query = auditSearch?.value.toLowerCase() || '';
      const type = auditFilter?.value || 'all';
      const filtered = auditLogs.filter(log => {
        const matchesType = type === 'all' || log.action === type;
        const matchesQuery =
          log.user.toLowerCase().includes(query) ||
          log.details.toLowerCase().includes(query);
        return matchesType && matchesQuery;
      });
      renderAuditLogs(filtered);
    };

    auditSearch?.addEventListener('input', filterAuditLogs);
    auditFilter?.addEventListener('change', filterAuditLogs);

    renderAuditLogs(auditLogs);
  }
}

window.renderDashboard = renderDashboard;

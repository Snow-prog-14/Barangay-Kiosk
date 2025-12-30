import { guard, wireLogout, applyRoleBasedUI, API_URL, getCurrentUser } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {

  guard();

  const u = getCurrentUser();
  if (!u || u.role !== 'app_admin') {
    location.replace('dashboard.html');
    return;
  }

  applyRoleBasedUI();
  wireLogout('logoutBtn');
  await fetchAuditLogs();
});

async function fetchAuditLogs() {
  try {
    const res = await fetch(`${API_URL}/audit.php`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    const data = await res.json();
    renderAuditLogs(data);
  } catch (err) {
    console.error('Error loading audit logs:', err);
  }
}

function renderAuditLogs(logs) {
  const tbody = document.getElementById('auditRows');
  if (!logs || !logs.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No logs available.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>${formatDate(log.timestamp)}</td>
      <td>${log.user}</td>
      <td><span class="badge bg-${getBadgeColor(log.action_type)}">${log.action_type}</span></td>
      <td>${log.details}</td>
    </tr>
  `).join('');
}

function getBadgeColor(type) {
  return { login:'primary', update:'warning', delete:'danger', request:'success' }[type] || 'secondary';
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-PH', {
    year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
  });
}

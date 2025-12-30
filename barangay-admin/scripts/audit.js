// scripts/audit.js
import { guard, wireLogout, applyRoleBasedUI, API_URL } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Make sure user is authenticated
  guard();
  

  // Hide/show admin-only UI
  applyRoleBasedUI();

  // Wire logout button
  wireLogout('logoutBtn');

  // Fetch and display logs
  await fetchAuditLogs();
});

import { getCurrentUser } from './app.js';

const u = getCurrentUser();
if (!u || u.role !== 'app_admin') {
  location.href = 'dashboard.html';
  return;
}

async function fetchAuditLogs() {
  try {
    const res = await fetch(`${API_URL}/audit.php`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');

    const data = await res.json();
    renderAuditLogs(data);
  } catch (err) {
    console.error('❌ Error loading audit logs:', err);
  }
}

function renderAuditLogs(logs) {
  const tbody = document.getElementById('auditRows');
  if (!logs || !logs.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">
          No logs available.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>${formatDate(log.timestamp)}</td>
      <td>${log.user}</td>
      <td>
        <span class="badge bg-${getBadgeColor(log.action_type)}">
          ${log.action_type}
        </span>
      </td>
      <td>${log.details}</td>
    </tr>
  `).join('');
}

function getBadgeColor(type) {
  const colors = {
    login: 'primary',
    update: 'warning',
    delete: 'danger',
    request: 'success'
  };
  return colors[type] || 'secondary';
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

import { guard, wireLogout, applyRoleBasedUI, API_URL } from './app.js?v=4';

guard();
wireLogout('btnLogout');
applyRoleBasedUI();

const archiveRows = document.getElementById('archiveRows');
const archiveSearch = document.getElementById('archiveSearch');
const archiveFilter = document.getElementById('archiveFilter');

async function fetchArchives() {
  try {
    const res = await fetch(`${API_URL}/archive.php`);
    if (!res.ok) throw new Error('Failed to fetch archives');
    const data = await res.json();
    renderArchives(data);
  } catch (err) {
    console.error(err);
    archiveRows.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading archives.</td></tr>`;
  }
}

function renderArchives(archives) {
  if (!archives.length) {
    archiveRows.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No archived records found.</td></tr>`;
    return;
  }

  const filterVal = archiveFilter.value;
  const searchVal = archiveSearch.value.toLowerCase();

  const filtered = archives.filter(item => {
    const matchesFilter = filterVal === 'all' || item.category.toLowerCase() === filterVal;
    const matchesSearch = Object.values(item).some(v =>
      String(v).toLowerCase().includes(searchVal)
    );
    return matchesFilter && matchesSearch;
  });

  archiveRows.innerHTML = filtered.map(a => `
    <tr>
      <td>${new Date(a.date_archived).toLocaleString()}</td>
      <td><span class="badge bg-success text-light">${a.category}</span></td>
      <td>${a.details}</td>
      <td>${a.archived_by}</td>
      <td><button class="btn btn-success btn-sm" data-id="${a.id}" data-cat="${a.category}"><i class="bi bi-arrow-counterclockwise"></i> Restore</button></td>
    </tr>
  `).join('') || `<tr><td colspan="5" class="text-center text-muted">No matching results.</td></tr>`;

  // Attach restore handlers
  document.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Restore this record?')) return;
      const id = btn.dataset.id;
      const category = btn.dataset.cat;
      try {
        const res = await fetch(`${API_URL}/archive_restore.php`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ id, category })
        });
        if (!res.ok) throw new Error('Restore failed');
        alert('Record successfully restored!');
        fetchArchives();
      } catch (err) {
        alert('Failed to restore record.');
        console.error(err);
      }
    });
  });
}

// Search & filter
archiveSearch.addEventListener('input', fetchArchives);
archiveFilter.addEventListener('change', fetchArchives);

// Initial load
fetchArchives();

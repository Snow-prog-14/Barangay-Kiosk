// scripts/citizens.js
import { paginate } from './app.js';

window.renderCitizens = function(DATA){
  const state = { page:0, per:6, q:'' };
  const toast = new bootstrap.Toast(document.getElementById('toastOk'));

  const filtered = () => {
    let rows = [...DATA];
    if (state.q) {
      const q = state.q.toLowerCase();
      rows = rows.filter(r => (r.name+' '+(r.address||'')+' '+(r.contact||'')).toLowerCase().includes(q));
    }
    rows.sort((a,b) => a.name.localeCompare(b.name));
    return rows;
  };

  const draw = () => {
    const all = filtered();
    const { slice, start, total } = paginate(all, state.page, state.per);
    document.getElementById('countLbl').textContent = total ? `${start+1}-${Math.min(start+state.per, total)} of ${total}` : '0 of 0';
    document.getElementById('prev').disabled = state.page === 0;
    document.getElementById('next').disabled = start + state.per >= total;
    document.getElementById('rows').innerHTML = slice.map(r => `
      <tr>
        <td>${r.id}</td>
        <td class="fw-semibold">${r.name}</td>
        <td>${r.address||''}</td>
        <td>${r.contact||''}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-primary" data-view="${r.id}"><i class="bi bi-eye"></i> View</button></td>
      </tr>
    `).join('');
  };

  // Search & pagination
  document.getElementById('q').addEventListener('input', e => { state.q = e.target.value.trim(); state.page = 0; draw(); });
  document.getElementById('btnClear').addEventListener('click', () => { document.getElementById('q').value=''; state.q=''; state.page=0; draw(); });
  document.getElementById('prev').addEventListener('click', () => { state.page--; draw(); });
  document.getElementById('next').addEventListener('click', () => { state.page++; draw(); });

  // Add new citizen
  document.getElementById('formAdd').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('aName').value.trim();
    const address = document.getElementById('aAddr').value.trim();
    const contact = document.getElementById('aContact').value.trim();
    if (!name) return;

    const nextId = (Math.max(...DATA.map(x=>x.id))||0) + 1;
    DATA.push({id: nextId, name, address, contact});
    document.getElementById('aName').value=''; document.getElementById('aAddr').value=''; document.getElementById('aContact').value='';
    new bootstrap.Modal(document.getElementById('mdlAdd')).hide();
    document.getElementById('toastMsg').textContent='Citizen added.'; toast.show();
    state.page = 0; draw();
  });

  // View citizen
  document.addEventListener('click', (e) => {
    const v = e.target.closest('[data-view]');
    if (!v) return;
    const id = +v.dataset.view;
    const c = DATA.find(x=>x.id===id);
    if (!c) return;
    document.getElementById('viewBody').innerHTML = `
      <div class="border rounded p-3 mb-2 bg-light"><div class="small text-muted">Full Name</div><div class="fw-semibold">${c.name}</div></div>
      <div class="border rounded p-3 mb-2"><div class="small text-muted">Address</div><div>${c.address||'<span class="text-muted">—</span>'}</div></div>
      <div class="border rounded p-3"><div class="small text-muted">Contact</div><div>${c.contact||'<span class="text-muted">—</span>'}</div></div>
    `;
    new bootstrap.Modal(document.getElementById('mdlView')).show();
  });

  draw();
};

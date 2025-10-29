import { paginate } from './app.js';

window.renderUsers = function(DATA){
  const state = { page:0, per:6, q:'' };
  const toast = new bootstrap.Toast(document.getElementById('toastOk'));
  const form = document.getElementById('formAdd');

  const filtered = ()=>{
    let rows = [...DATA];
    if (state.q){
      const q = state.q.toLowerCase();
      rows = rows.filter(r => (r.name+' '+r.username+' '+r.role).toLowerCase().includes(q));
    }
    rows.sort((a,b)=> a.name.localeCompare(b.name));
    return rows;
  };

  const draw = ()=>{
    const all = filtered();
    const {slice, start, total} = paginate(all, state.page, state.per);
    document.getElementById('countLbl').textContent = total ? `${start+1}-${Math.min(start+state.per, total)} of ${total}` : '0 of 0';
    document.getElementById('prev').disabled = state.page===0;
    document.getElementById('next').disabled = start + state.per >= total;
    document.getElementById('rows').innerHTML = slice.map(r=>`
      <tr>
        <td>${r.id}</td>
        <td class="fw-semibold">${r.name}</td>
        <td>${r.username}</td>
        <td>${r.role}</td>
        <td>${r.active?'<span class="badge text-bg-success">Active</span>':'<span class="badge text-bg-secondary">Disabled</span>'}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" data-toggle="${r.id}">${r.active?'Disable':'Enable'}</button>
            <button class="btn btn-outline-primary" data-edit="${r.id}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-warning" data-reset="${r.id}"><i class="bi bi-key"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  // Events
  document.getElementById('q').addEventListener('input', e=>{ state.q=e.target.value.trim(); state.page=0; draw(); });
  document.getElementById('btnClear').addEventListener('click', ()=>{ document.getElementById('q').value=''; state.q=''; state.page=0; draw(); });
  document.getElementById('prev').addEventListener('click', ()=>{ state.page--; draw(); });
  document.getElementById('next').addEventListener('click', ()=>{ state.page++; draw(); });

  // Add/Edit submit
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = document.getElementById('aName').value.trim();
    const username = document.getElementById('aUser').value.trim();
    const role = document.getElementById('aRole').value;
    const active = parseInt(document.getElementById('aActive').value,10);
    if (!name || !username) return;

    const editId = form.dataset.editId ? parseInt(form.dataset.editId,10) : null;
    if (editId){
      const i = DATA.findIndex(x=>x.id===editId); if (i>=0){ DATA[i].name=name; DATA[i].username=username; DATA[i].role=role; DATA[i].active=active; }
      form.dataset.editId = '';
      document.getElementById('toastMsg').textContent='User updated.';
    } else {
      const nextId = (Math.max(...DATA.map(x=>x.id))||0)+1;
      DATA.push({id:nextId, name, username, role, active});
      document.getElementById('toastMsg').textContent='User added.';
    }
    document.getElementById('aName').value=''; document.getElementById('aUser').value=''; document.getElementById('aRole').value='Staff'; document.getElementById('aActive').value='1';
    new bootstrap.Modal(document.getElementById('mdlAdd')).hide();
    new bootstrap.Toast(document.getElementById('toastOk')).show();
    state.page=0; draw();
  });

  // Delegated actions
  document.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-toggle]');
    if (t){ const id = +t.dataset.toggle; const i = DATA.findIndex(x=>x.id===id); if (i>=0){ DATA[i].active = DATA[i].active?0:1; document.getElementById('toastMsg').textContent = DATA[i].active?'User enabled.':'User disabled.'; new bootstrap.Toast(document.getElementById('toastOk')).show(); draw(); } }
    const ed = e.target.closest('[data-edit]');
    if (ed){ const id = +ed.dataset.edit; const u = DATA.find(x=>x.id===id); if (!u) return; document.getElementById('mdlTitle').textContent='Edit User'; document.getElementById('aName').value=u.name; document.getElementById('aUser').value=u.username; document.getElementById('aRole').value=u.role; document.getElementById('aActive').value=String(u.active); form.dataset.editId=String(id); new bootstrap.Modal(document.getElementById('mdlAdd')).show(); }
    const rs = e.target.closest('[data-reset]');
    if (rs){ const id = +rs.dataset.reset; const u = DATA.find(x=>x.id===id); if (!u) return; alert(`Password reset link would be sent for ${u.username} (mock).`); }
  });

  draw();
};

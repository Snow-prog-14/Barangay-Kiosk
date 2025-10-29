import { paginate } from './app.js';

window.renderTypes = function(DATA){
  const state = { page:0, per:6, q:'' };
  const toast = new bootstrap.Toast(document.getElementById('toastOk'));

  const filtered = ()=>{
    let rows = [...DATA];
    if (state.q){ const q = state.q.toLowerCase(); rows = rows.filter(r=> r.name.toLowerCase().includes(q)); }
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
        <td>₱ ${Number(r.fee).toFixed(2)}</td>
        <td>${r.active?'<span class="badge text-bg-success">Active</span>':'<span class="badge text-bg-secondary">Inactive</span>'}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" data-toggle="${r.id}">${r.active?'Disable':'Enable'}</button>
            <button class="btn btn-outline-primary" data-edit="${r.id}"><i class="bi bi-pencil"></i></button>
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

  // Add/Edit
  const form = document.getElementById('formAdd');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = document.getElementById('aName').value.trim();
    const fee  = parseFloat(document.getElementById('aFee').value||'0');
    const active = parseInt(document.getElementById('aActive').value,10);
    if (!name) return;

    const editId = form.dataset.editId ? parseInt(form.dataset.editId,10) : null;
    if (editId){
      const i = DATA.findIndex(x=>x.id===editId); if (i>=0){ DATA[i].name=name; DATA[i].fee=fee; DATA[i].active=active; }
      form.dataset.editId = '';
      document.getElementById('toastMsg').textContent='Type updated.';
    } else {
      const nextId = (Math.max(...DATA.map(x=>x.id))||0)+1;
      DATA.push({id:nextId, name, fee:isNaN(fee)?0:fee, active});
      document.getElementById('toastMsg').textContent='Type added.';
    }
    document.getElementById('aName').value=''; document.getElementById('aFee').value='0'; document.getElementById('aActive').value='1';
    new bootstrap.Modal(document.getElementById('mdlAdd')).hide();
    new bootstrap.Toast(document.getElementById('toastOk')).show();
    state.page=0; draw();
  });

  // Delegate toggles/edits
  document.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-toggle]');
    if (t){ const id = +t.dataset.toggle; const i = DATA.findIndex(x=>x.id===id); if (i>=0){ DATA[i].active = DATA[i].active?0:1; document.getElementById('toastMsg').textContent = DATA[i].active?'Type enabled.':'Type disabled.'; new bootstrap.Toast(document.getElementById('toastOk')).show(); draw(); } }
    const ed = e.target.closest('[data-edit]');
    if (ed){ const id = +ed.dataset.edit; const it = DATA.find(x=>x.id===id); if (!it) return; document.getElementById('aName').value=it.name; document.getElementById('aFee').value=it.fee; document.getElementById('aActive').value=String(it.active); form.dataset.editId=String(id); new bootstrap.Modal(document.getElementById('mdlAdd')).show(); }
  });

  draw();
};

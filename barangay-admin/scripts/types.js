// scripts/types.js
// Admin-only controls are hidden for staff

import { TYPES } from './data.js';
import { isStaff, guard, wireLogout } from './app.js';

document.addEventListener('DOMContentLoaded', ()=>{
  guard(); // will hide admin controls for staff

  const container = document.getElementById('typesList') || document.getElementById('rows');
  if (container) renderTypesGrid(container);

  wireLogout('btnLogout');
});

function renderTypesGrid(container){
  const t = TYPES || [];
  container.innerHTML = t.map(type => `
    <div class="col-md-6 col-lg-4 mb-3">
      <div class="border rounded p-3 h-100">
        <div class="d-flex justify-content-between">
          <div>
            <div class="fw-semibold">${type.name}</div>
            <div class="small text-muted">${type.active ? 'Active' : 'Inactive'}</div>
          </div>
          <div class="text-end">
            <div class="badge badge-ref">₱${Number(type.fee).toFixed(2)}</div>
          </div>
        </div>

        <div class="mt-2 d-flex gap-2">
          ${isStaff() ? '' : `
            <button class="btn btn-sm btn-outline-secondary admin-only">Edit</button>
            <button class="btn btn-sm btn-outline-danger admin-only">Delete</button>
          `}
        </div>

        <div class="small text-muted mt-2">ID: ${type.id}</div>
      </div>
    </div>
  `).join('');
}

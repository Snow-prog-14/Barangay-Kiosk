// scripts/dashboard.js
import { fmtDate } from './app.js';

export function renderDashboard(REQUESTS, CITIZENS){
  // KPIs
  document.getElementById('kpiCitizens').textContent = CITIZENS.length;
  document.getElementById('kpiRequests').textContent = REQUESTS.length;
  document.getElementById('kpiProcessing').textContent = REQUESTS.filter(r=>r.status==='processing').length;
  document.getElementById('kpiReleased').textContent = REQUESTS.filter(r=>r.status==='released').length;

  // Recent Requests Table
  const recent = [...REQUESTS].sort((a,b)=> new Date(b.updated)-new Date(a.updated)).slice(0,6);
  const pill = s=>({pending:'pill-pending',received:'pill-received',processing:'pill-processing',ready_for_pickup:'pill-rfp',released:'pill-released',rejected:'pill-rejected'}[s]||'pill-rejected');
  const recentRows = document.getElementById('recentRows');
  if(recentRows){
    recentRows.innerHTML = recent.map(r=>`
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

  // Charts
  const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand-500').trim() || '#1f74ff';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const barData = months.map(()=> Math.floor(Math.random()*80)+20);
  const lineData = months.map(()=> Math.floor(Math.random()*60)+20);

  const chartBarEl = document.getElementById('chartBar');
  if(chartBarEl){
    new Chart(chartBarEl, {
      type:'bar',
      data:{ labels:months, datasets:[{ label:'Requests', data:barData, backgroundColor:brand }]},
      options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
    });
  }

  const chartLineEl = document.getElementById('chartLine');
  if(chartLineEl){
    new Chart(chartLineEl, {
      type:'line',
      data:{ labels:months, datasets:[{ label:'Completed %', data:lineData, borderColor:brand, tension:.35, fill:false }] },
      options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:100}} }
    });
  }
}

window.renderDashboard = renderDashboard;

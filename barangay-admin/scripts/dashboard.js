import { fmtDate } from './app.js';

window.renderDashboard = function(REQUESTS, CITIZENS){
  // KPIs
  const k = (id,val)=> document.getElementById(id).textContent = val;
  k('kpiCitizens', CITIZENS.length);
  k('kpiRequests', REQUESTS.length);
  k('kpiProcessing', REQUESTS.filter(r=>r.status==='processing').length);
  k('kpiReleased', REQUESTS.filter(r=>r.status==='released').length);

  // Recent table
  const recent = [...REQUESTS].sort((a,b)=> new Date(b.updated)-new Date(a.updated)).slice(0,6);
  const pill = s => ({
    pending:'pill-pending', received:'pill-received', processing:'pill-processing',
    ready_for_pickup:'pill-rfp', released:'pill-released', rejected:'pill-rejected'
  }[s] || 'pill-rejected');
  document.getElementById('recentRows').innerHTML = recent.map(r=>`
    <tr>
      <td>${r.id}</td>
      <td><span class="badge badge-ref">${r.ref}</span></td>
      <td>${r.citizen}</td>
      <td>${r.type}</td>
      <td><span class="pill ${pill(r.status)}">${r.status}</span></td>
      <td>${fmtDate(r.updated)}</td>
    </tr>
  `).join('');

  // Charts
  const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand-500').trim() || '#1f74ff';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const barData = months.map(()=> Math.floor(Math.random()*80)+20);
  const lineData = months.map(()=> Math.floor(Math.random()*60)+20);

  new Chart(document.getElementById('chartBar'), {
    type: 'bar',
    data: { labels: months, datasets: [{ label: 'Requests', data: barData, backgroundColor: brand }]},
    options: { responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
  });

  new Chart(document.getElementById('chartLine'), {
    type: 'line',
    data: { labels: months, datasets: [{ label: 'Completed %', data: lineData, borderColor: brand, tension:.35, fill:false }]},
    options: { responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:100}} }
  });
}

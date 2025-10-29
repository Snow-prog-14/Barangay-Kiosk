// Requests data for the Requests page.
// PDFs must exist at: barangay-admin/forms/<ref>.pdf

export const REQUESTS = [
  { id:201, ref:'BRGY-2025-IJ56KL', citizen:'Pedro Reyes', type:'Barangay Clearance',
    status:'ready_for_pick_up', requested_at:'2025-10-20T08:10:00', updated:'2025-10-23T09:48:00',
    form_url:'./forms/BRGY-2025-IJ56KL.pdf', _postPay:true },

  { id:202, ref:'BRGY-2025-EF34GH', citizen:'Maria Santos', type:'Indigency',
    status:'processing', requested_at:'2025-10-21T10:05:00', updated:'2025-10-23T05:10:00',
    form_url:'./forms/BRGY-2025-EF34GH.pdf', _postPay:false },

  { id:203, ref:'BRGY-2025-AB12CD', citizen:'Juan Dela Cruz', type:'Barangay Clearance',
    status:'released', requested_at:'2025-10-19T13:30:00', updated:'2025-10-22T15:05:00',
    form_url:'./forms/BRGY-2025-AB12CD.pdf', _postPay:true },

  { id:204, ref:'BRGY-2025-XY12ZZ', citizen:'Anna Cruz', type:'Business Permit',
    status:'on_queue', requested_at:'2025-10-23T09:20:00', updated:'2025-10-23T10:20:00',
    form_url:'./forms/BRGY-2025-XY12ZZ.pdf' },

  { id:205, ref:'BRGY-2025-QW98ER', citizen:'Lito Manalo', type:'Residency',
    status:'on_queue', requested_at:'2025-10-22T07:00:00', updated:'2025-10-22T09:00:00',
    form_url:'./forms/BRGY-2025-QW98ER.pdf' },

  { id:206, ref:'BRGY-2025-PL45MN', citizen:'Rosa Diaz', type:'Barangay Clearance',
    status:'processing', requested_at:'2025-10-21T08:40:00', updated:'2025-10-21T14:00:00',
    form_url:'./forms/BRGY-2025-PL45MN.pdf', _postPay:false },

  { id:207, ref:'BRGY-2025-ZA77BC', citizen:'Karlo Dizon', type:'Indigency',
    status:'payment_pending', requested_at:'2025-10-23T09:55:00', updated:'2025-10-23T11:00:00',
    form_url:'./forms/BRGY-2025-ZA77BC.pdf' },

  { id:208, ref:'BRGY-2025-CC22DD', citizen:'Mico Reyes', type:'Residency',
    status:'on_queue', requested_at:'2025-10-23T10:50:00', updated:'2025-10-23T11:30:00',
    form_url:'./forms/BRGY-2025-CC22DD.pdf' },
];

// Note: We DO NOT export STATUSES here. The Requests UI shows only the allowed
// next choices per the flow, so a global STATUSES array isn’t needed.
// Shared data used by other pages (Citizens, Types, Users)

export const CITIZENS = [
  {id:1, name:'Juan Dela Cruz', address:'Purok 1, Ugong', contact:'09171234567'},
  {id:2, name:'Maria Santos', address:'Purok 2, Ugong', contact:'09181234567'},
  {id:3, name:'Pedro Reyes', address:'Purok 3, Ugong', contact:'09191234567'},
  {id:4, name:'Anna Cruz', address:'Purok 4, Ugong', contact:'09170000001'},
  {id:5, name:'Lito Manalo', address:'Purok 5, Ugong', contact:'09170000002'},
  {id:6, name:'Rosa Diaz', address:'Purok 6, Ugong', contact:'09170000003'},
  {id:7, name:'Karlo Dizon', address:'Purok 7, Ugong', contact:'09170000004'},
  {id:8, name:'Mico Reyes', address:'Purok 8, Ugong', contact:'09170000005'},
  {id:9, name:'Ella Kates', address:'Purok 9, Ugong', contact:'09170000006'},
  {id:10, name:'Ace Cabrera', address:'Purok 10, Ugong', contact:'09170000007'}
];

export const TYPES = [
  {id:1, name:'Barangay Clearance', fee:50.00, active:1},
  {id:2, name:'Certificate of Indigency', fee:0.00, active:1},
  {id:3, name:'Residency Certificate', fee:30.00, active:0},
  {id:4, name:'Business Permit Endorsement', fee:150.00, active:1},
  {id:5, name:'Barangay ID', fee:75.00, active:1},
  {id:6, name:'Solo Parent Certification', fee:0.00, active:1},
  {id:7, name:'First-Time Job Seeker', fee:0.00, active:1},
];

export const USERS = [
  {id:1, name:'System Admin', username:'admin', role:'Admin', active:1},
  {id:2, name:'Juan Clerk', username:'jclerk', role:'Staff', active:1},
  {id:3, name:'Kiosk Device 1', username:'kiosk1', role:'Kiosk', active:1},
  {id:4, name:'Maria Staff', username:'mstaff', role:'Staff', active:0},
  {id:5, name:'Records Lead', username:'rlead', role:'Admin', active:1},
  {id:6, name:'Kiosk Device 2', username:'kiosk2', role:'Kiosk', active:1},
  {id:7, name:'Support Staff', username:'sstaff', role:'Staff', active:1},
];


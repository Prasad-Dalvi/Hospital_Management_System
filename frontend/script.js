// script.js - full file (copy-paste ready)
// Local UI + backend sync for patients & caretakers

// -------------------- CONFIG --------------------
const API_URL = '/api'; // use relative path so when served from same origin it works

// -------------------- Helpers --------------------
const $ = (sel, all=false) => all ? Array.from(document.querySelectorAll(sel)) : document.querySelector(sel);
const escapeHtml = s => s==null? '': String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function nowTimestamp(){ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
function pad(n){ return (n<10? '0':'')+n; }
function today(){ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

// -------------------- Local fallback state --------------------
const state = {
  patients: [
    { id:"1", fullName:"Aarav Sharma", dob:"1953-02-20", age:72, gender:"Male", diagnosisDate:"2022-05-10", stage:"Early", contact:"9876543210", email:"aarav.sh@example.com", address:"Flat 12, Sunshine Apartments", city:"Pune", state:"Maharashtra", postal:"411045", bloodGroup:"A+", allergies:"None", notes:"Mobile, independent", registration:"2023-01-12 10:20:00", currentCaretakerId:"101", photo:null, lastVisit:"2025-08-14" },
    { id:"2", fullName:"Maya Iyer", dob:"1946-11-02", age:79, gender:"Female", diagnosisDate:"2020-09-03", stage:"Middle", contact:"9123456780", email:"maya.iy@example.com", address:"6 Lotus Lane", city:"Mumbai", state:"Maharashtra", postal:"400001", bloodGroup:"B+", allergies:"Penicillin", notes:"Hearing aid", registration:"2022-12-05 11:05:00", currentCaretakerId:"102", photo:null, lastVisit:"2025-08-13" }
  ],
  caretakers: [
    { id:"101", fullName:"Neha Deshmukh", dob:"1989-06-08", age:36, gender:"Female", relation:"Daughter", contact:"9876501234", email:"neha.d@example.com", address:"Sunshine Apartments", city:"Pune", state:"Maharashtra", postal:"411045", assignedPatientId:"1", joined:"2023-01-12 10:00:00", photo:null },
    { id:"102", fullName:"Rahul Iyer", dob:"1980-04-24", age:45, gender:"Male", relation:"Son", contact:"9123456780", email:"rahul.i@example.com", address:"Lotus Lane", city:"Mumbai", state:"Maharashtra", postal:"400001", assignedPatientId:"2", joined:"2022-12-06 09:00:00", photo:null }
  ],
  prevCaretakers: [
    { id:"201", patientId:"1", fullName:"Rita Sharma", relation:"Wife", from:"2018-01-01", to:"2022-12-30", notes:"Handled earlier", contact:"9876511111" }
  ],
  medicalHistory: [
    { id:"1", patientId:"1", condition:"Hypertension", diagnosisDate:"2019-03-10", treatment:"Medication", hospital:"City Hospital", doctor:"Dr. S. Rao", followUp:true, notes:"Monitor BP", recordDate:"2019-03-11 09:00:00" }
  ],
  medications: [
    { id:"1", patientId:"1", medicationName:"Donepezil", dosage:"10mg", frequency:"Once daily", startDate:"2025-01-01", endDate:"2026-01-01", prescribedBy:"Dr. Rao", sideEffects:"Nausea", lastUpdated:"2025-01-01 11:00:00" }
  ],
  appointments: [
    { id:"1", patientId:"2", date:"2025-08-25", time:"10:30:00", doctorName:"Dr. Mehta", purpose:"Memory Clinic", status:"Scheduled", location:"Sunrise Clinic", created:"2025-08-01 12:00:00" }
  ],
  locations: [
    { id:"1", patientId:"1", date:"2025-08-11", time:"09:20:00", description:"Walked to garden", lat:18.5204, lng:73.8567, recordedBy:"101", recordedAt:"2025-08-11 09:20:00" }
  ],
  activities: [
    { id:"1", patientId:"1", date:"2025-08-11", time:"08:00:00", description:"Morning walk", mood:"Happy", caretakerId:"101", duration:30, notes:"Good pace", recordedAt:"2025-08-11 08:35:00" }
  ],
  relatives: [
    { id:"1", patientId:"1", name:"Neha Deshmukh", relation:"Daughter", photo:null },
    { id:"2", patientId:"2", name:"Rahul Iyer", relation:"Son", photo:null }
  ],
  nextIds: { patient:3, caretaker:103, prevCaretaker:202, medical:2, medication:2, appointment:2, location:2, activity:2, relative:3 }
};

const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 64 64"><rect width="100%" height="100%" rx="10" fill="#2c3e50"/><text x="50%" y="50%" fill="#fff" font-family="Poppins" font-size="28" text-anchor="middle" dominant-baseline="central">👤</text></svg>`
);

// -------------------- API helpers --------------------
async function loadInitialData(){
  try {
    const [pRes, cRes] = await Promise.all([
      fetch(`${API_URL}/patients`),
      fetch(`${API_URL}/caretakers`)
    ]);
    if (!pRes.ok || !cRes.ok) throw new Error('Server returned error');

    const patients = await pRes.json();
    const caretakers = await cRes.json();

    // normalize ids to strings for consistent UI comparisons
    state.patients = patients.map(r => ({ ...r, id: String(r.id) }));
    state.caretakers = caretakers.map(r => ({ ...r, id: String(r.id) }));

    console.log('Loaded from server:', state.patients.length, 'patients,', state.caretakers.length, 'caretakers');
    renderAll();
  } catch (err) {
    console.warn('Could not load from server — using local fallback state.', err);
    // keep the fallback local state defined above
    renderAll();
  }
}

async function savePatientToServer(patientObj){
  try {
    const res = await fetch(`${API_URL}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientObj)
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Server error ${res.status}: ${txt}`);
    }
    const saved = await res.json();
    // convert id to string
    saved.id = String(saved.id);
    return saved;
  } catch (err) {
    console.warn('savePatientToServer failed:', err);
    throw err;
  }
}

async function saveCaretakerToServer(caretakerObj){
  try {
    const res = await fetch(`${API_URL}/caretakers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caretakerObj)
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Server error ${res.status}: ${txt}`);
    }
    const saved = await res.json();
    saved.id = String(saved.id);
    return saved;
  } catch (err) {
    console.warn('saveCaretakerToServer failed:', err);
    throw err;
  }
}

async function deletePatientOnServer(id){
  try {
    const res = await fetch(`${API_URL}/patients/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('deletePatientOnServer failed', err);
    return false;
  }
}

async function updateCaretakerOnServer(id, partial){
  // Attempts to PUT updated caretaker fields; if your backend doesn't implement PUT, this will likely 404 and we ignore.
  try {
    const res = await fetch(`${API_URL}/caretakers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial)
    });
    return res.ok;
  } catch (err) {
    console.warn('updateCaretakerOnServer failed', err);
    return false;
  }
}

// -------------------- DOM / Navigation --------------------
function showSection(hash){
  const id = (hash || "#overview").replace("#","");
  document.querySelectorAll(".nav-link").forEach(n => n.classList.remove("active"));
  document.querySelector(`.nav-link[href="#${id}"]`)?.classList.add("active");

  document.querySelectorAll(".section").forEach(s => s.hidden = true);
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
    // Navigation Links
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const href = e.currentTarget.getAttribute("href");
            if (href) {
                window.history.pushState({}, '', href);
                showSection(href);
            }
        });
    });

    // Sidebar Toggle Button
    $("#menuBtn")?.addEventListener("click", ()=> $(".sidebar").classList.toggle("show"));

    // Search Input
    $("#searchInput")?.addEventListener("input", (e)=> {
      const q = e.target.value.trim().toLowerCase();
      renderPatients(q);
    });

    // + New Button
    $("#newBtn")?.addEventListener("click", openQuickAddMenu);

    // Add Buttons for Each Section
    $("#addPatientBtn")?.addEventListener("click", ()=> openAddPatientModal());
    $("#addCaregiverBtn")?.addEventListener("click", ()=> openAddCaregiverModal());
    $("#addMedicationBtn")?.addEventListener("click", ()=> openAddMedicationModal());
    $("#addAppointmentBtn")?.addEventListener("click", ()=> openAddAppointmentModal());
    $("#addLocationBtn")?.addEventListener("click", ()=> openAddLocationModal());
    $("#addActivityBtn")?.addEventListener("click", ()=> openAddActivityModal());
    $("#addRelativeBtn")?.addEventListener("click", ()=> openAddRelativeModal());
    
    // Modal Close Button
    $("#closeModal")?.addEventListener("click", closeModal);

    // Modal Overlay
    window.addEventListener("click", (e) => {
        if (e.target === $("#modal")) {
            closeModal();
        }
    });

    // Load from server (if available) and initial render
    loadInitialData();

    // Initial Render on Page Load (will be updated when server responds)
    showSection(window.location.hash);
});

// -------------------- Render functions --------------------
function renderAll(){
  renderOverview();
  renderPatients($("#searchInput")?.value || "");
  renderCaretakers();
  renderMedicalHistory();
  renderMedications();
  renderAppointments();
  renderLocations();
  renderActivities();
  renderRelatives();
}

function renderOverview(){
  $("#statTotal").textContent = state.patients.length;
  $("#statReminders").textContent = state.appointments.filter(a => a.date === today()).length;
  $("#statCaregivers").textContent = state.caretakers.filter(c => c.assignedPatientId).length;
  renderAppointments();
  drawBarChart("adherenceChart", [92,88,94,96,90,87,93]);
}

function renderPatients(filter=""){
  const tbody = $("#patientsTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  state.patients
    .filter(p => (p.fullName + (p.city||'') + (p.contact||'')).toLowerCase().includes((filter||"").toLowerCase()))
    .forEach(p => {
      const caret = state.caretakers.find(c => String(c.id) === String(p.currentCaretakerId));
      const tr = document.createElement("tr");
      const stageBadgeClass = `patient-stage-badge stage-${(p.stage||'').toLowerCase()}`;
      tr.innerHTML = `
        <td>
          <div class="patient-info">
            <div class="avatar">${p.photo ? `<img src="${p.photo}" alt="">` : `<img src="${DEFAULT_AVATAR}" alt="">`}</div>
            <div>
              <div class="name">${escapeHtml(p.fullName)}</div>
              <div class="email">${escapeHtml(p.email||'')}</div>
            </div>
          </div>
        </td>
        <td>${p.age||''}</td>
        <td><div class="${stageBadgeClass}">${escapeHtml(p.stage||'')}</div></td>
        <td>${caret ? escapeHtml(caret.fullName) : '—'}</td>
        <td>${escapeHtml(p.lastVisit||'')}</td>
        <td>
          <button class="ghost-btn" data-action="view-patient" data-id="${p.id}"><i class="fas fa-eye"></i></button>
          <button class="ghost-btn" data-action="assign-caretaker" data-id="${p.id}"><i class="fas fa-user-plus"></i></button>
          <button class="ghost-btn" data-action="delete-patient" data-id="${p.id}"><i class="fas fa-trash"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });

  tbody.querySelectorAll("[data-action='view-patient']").forEach(b => b.addEventListener("click", e => viewPatient(e.currentTarget.dataset.id)));
  tbody.querySelectorAll("[data-action='assign-caretaker']").forEach(b => b.addEventListener("click", e => openAssignCaregiverModal(e.currentTarget.dataset.id)));
  tbody.querySelectorAll("[data-action='delete-patient']").forEach(b => b.addEventListener("click", e => {
    const id = e.currentTarget.dataset.id;
    if (confirm("Delete patient?")) {
      deletePatient(id);
    }
  }));
}

function renderCaretakers(filter=""){
  const card = $("#currentCaregiverCard");
  const list = $("#prevCareList");
  if (!card || !list) return;
  card.innerHTML = "";
  list.innerHTML = "";

  state.patients.forEach(p => {
    const c = state.caretakers.find(x => String(x.id) === String(p.currentCaretakerId));
    const node = document.createElement("div");
    node.className = "caretaker-card";
    node.innerHTML = `
      <div class="info-group">
        <div class="avatar">${c && c.photo ? `<img src="${c.photo}" style="width:56px;height:56px;object-fit:cover">` : `<img src="${DEFAULT_AVATAR}" alt="">`}</div>
        <div>
          <div class="name">${c ? escapeHtml(c.fullName) : '—'}</div>
          <div class="meta">Patient: ${escapeHtml(p.fullName)}</div>
        </div>
      </div>
      <button class="ghost-btn" data-action="change-caretaker" data-pid="${p.id}"><i class="fas fa-exchange-alt"></i> Change</button>
    `;
    card.appendChild(node);
  });

  state.prevCaretakers.forEach(pc => {
    const li = document.createElement("li");
    const p = state.patients.find(x => x.id === pc.patientId);
    li.innerHTML = `<div class="details"><strong>${escapeHtml(pc.fullName)}</strong><div class="meta">${p? escapeHtml(p.fullName):''} • ${escapeHtml(pc.from)} → ${escapeHtml(pc.to)}</div></div><div><button class="ghost-btn" data-action="view-prev" data-id="${pc.id}"><i class="fas fa-info-circle"></i></button></div>`;
    list.appendChild(li);
  });

  card.querySelectorAll("[data-action='change-caretaker']").forEach(b => b.addEventListener("click", e => openAssignCaregiverModal(e.currentTarget.dataset.pid)));
  list.querySelectorAll("[data-action='view-prev']").forEach(b => b.addEventListener("click", e => {
    const id = e.currentTarget.dataset.id;
    const pc = state.prevCaretakers.find(x => x.id === id);
    alert(`Previous Caregiver:\n${pc.fullName}\nFrom: ${pc.from}\nTo: ${pc.to}\nNotes: ${pc.notes || ''}`);
  }));
}

function renderMedicalHistory(){
  const tbody = $("#medicalTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  state.medicalHistory.forEach(m => {
    const p = state.patients.find(x => x.id === m.patientId);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p?escapeHtml(p.fullName):''}</td><td>${escapeHtml(m.condition)}</td><td>${escapeHtml(m.diagnosisDate)}</td><td>${escapeHtml(m.treatment)}</td><td>${escapeHtml(m.doctor)}</td><td>${m.followUp? 'Yes':'No'}</td>`;
    tbody.appendChild(tr);
  });
}

function renderMedications(){
  const tbody = $("#medTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  state.medications.forEach(m => {
    const p = state.patients.find(x=>x.id===m.patientId);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p?escapeHtml(p.fullName):''}</td><td>${escapeHtml(m.medicationName)}</td><td>${escapeHtml(m.dosage)}</td><td>${escapeHtml(m.frequency)}</td><td>${escapeHtml(m.startDate)}</td><td>${escapeHtml(m.endDate)}</td>`;
    tbody.appendChild(tr);
  });
}

function renderAppointments(){
  const ul = $("#apptList");
  const out = $("#appointmentList");
  if (ul) ul.innerHTML = "";
  if (out) out.innerHTML = "";
  state.appointments.forEach(a => {
    const p = state.patients.find(x => x.id === a.patientId);
    const text = `${a.date} ${a.time} • ${p? escapeHtml(p.fullName):''} • ${escapeHtml(a.purpose)}`;
    if (ul){
      const li = document.createElement("li");
      li.innerHTML = `<span class="details">${text}</span><span class="meta">${escapeHtml(a.doctorName)}</span>`;
      ul.appendChild(li);
    }
    if (out){
      const li = document.createElement("li");
      li.innerHTML = `<div class="details">${text}</div><div><button class="ghost-btn" data-id="${a.id}" data-action="delete-appoint"><i class="fas fa-trash"></i></button></div>`;
      out.appendChild(li);
    }
  });

  $("#appointmentList")?.querySelectorAll("[data-action='delete-appoint']").forEach(b => b.addEventListener("click", e => {
    const id = e.currentTarget.dataset.id;
    if (confirm("Delete appointment?")) {
      deleteAppointment(id);
    }
  }));
}

function renderLocations(){
  const tbody = $("#locTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  state.locations.forEach(l => {
    const p = state.patients.find(x=>x.id===l.patientId);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p?escapeHtml(p.fullName):''}</td><td>${escapeHtml(l.date)}</td><td>${escapeHtml(l.time)}</td><td>${escapeHtml(l.description)}</td><td>${l.lat}</td><td>${l.lng}</td>`;
    tbody.appendChild(tr);
  });
}

function renderActivities(){
  const tbody = $("#actTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  state.activities.forEach(a => {
    const p = state.patients.find(x=>x.id===a.patientId);
    const c = state.caretakers.find(x=>x.id===a.caretakerId);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p?escapeHtml(p.fullName):''}</td><td>${escapeHtml(a.date)}</td><td>${escapeHtml(a.time)}</td><td>${escapeHtml(a.description)}</td><td>${escapeHtml(a.mood)}</td><td>${c?escapeHtml(c.fullName):''}</td>`;
    tbody.appendChild(tr);
  });
}

function renderRelatives(){
  const grid = $("#relativesGrid");
  if (!grid) return;
  grid.innerHTML = "";
  state.relatives.forEach(r => {
    const patient = state.patients.find(p => p.id === r.patientId);
    const card = document.createElement("div");
    card.className = "gallery-card glass-card";
    card.innerHTML = `
      <img src="${r.photo || DEFAULT_AVATAR}" alt="${escapeHtml(r.name)}" style="width:100%;height:160px;object-fit:cover;border-radius:8px;margin-bottom:8px;">
      <div class="name">${escapeHtml(r.name)}</div>
      <div class="relation">${escapeHtml(r.relation || '')}${patient? ' • ' + escapeHtml(patient.fullName):''}</div>
      <div class="actions" style="margin-top:8px;">
        <button class="ghost-btn" data-action="edit-relative" data-id="${r.id}"><i class="fas fa-edit"></i></button>
        <button class="ghost-btn" data-action="del-relative" data-id="${r.id}"><i class="fas fa-trash"></i></button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-action='edit-relative']").forEach(b => b.addEventListener("click", e => {
    const id = e.currentTarget.dataset.id;
    openAddRelativeModal(id);
  }));
  grid.querySelectorAll("[data-action='del-relative']").forEach(b => b.addEventListener("click", e => {
    const id = e.currentTarget.dataset.id;
    if (confirm("Delete relative?")) {
      deleteRelative(id);
    }
  }));
}

// -------------------- Modal utilities --------------------
const modal = $("#modal");
function openModal(title, bodyHtml){
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHtml;
  modal.classList.add("show");
}
function closeModal(){ modal.classList.remove("show"); $("#modalBody").innerHTML = ""; }

// -------------------- Delete handlers (use server when possible) --------------------
async function deletePatient(id) {
  if (!confirm("Are you sure?")) return;
  const ok = await deletePatientOnServer(id);
  if (ok) {
    // reload from server (preferred)
    await loadInitialData();
  } else {
    // fallback local delete
    state.patients = state.patients.filter(p => p.id !== id);
    renderAll();
  }
}
function deleteAppointment(id) {
    state.appointments = state.appointments.filter(x => x.id !== id);
    renderAll();
}
function deleteRelative(id) {
    state.relatives = state.relatives.filter(x => x.id !== id);
    renderAll();
}

// -------------------- Quick Add menu --------------------
function openQuickAddMenu(){
  const html = `
    <div class="quick-add-grid">
      <button class="primary-btn" id="qa-patient"><i class="fas fa-plus"></i> Add Patient</button>
      <button class="primary-btn" id="qa-caregiver"><i class="fas fa-plus"></i> Add Caregiver</button>
      <button class="primary-btn" id="qa-medical"><i class="fas fa-plus"></i> Add Medical History</button>
      <button class="primary-btn" id="qa-medication"><i class="fas fa-plus"></i> Add Medication</button>
      <button class="primary-btn" id="qa-appointment"><i class="fas fa-plus"></i> Add Appointment</button>
      <button class="primary-btn" id="qa-location"><i class="fas fa-plus"></i> Add Location</button>
      <button class="primary-btn" id="qa-activity"><i class="fas fa-plus"></i> Add Activity</button>
      <button class="primary-btn" id="qa-relative"><i class="fas fa-plus"></i> Add Relative</button>
    </div>
  `;
  openModal("Quick Add", html);
  $("#qa-patient").addEventListener("click", ()=>{ closeModal(); openAddPatientModal(); });
  $("#qa-caregiver").addEventListener("click", ()=>{ closeModal(); openAddCaregiverModal(); });
  $("#qa-medical").addEventListener("click", ()=>{ closeModal(); openAddMedicalModal(); });
  $("#qa-medication").addEventListener("click", ()=>{ closeModal(); openAddMedicationModal(); });
  $("#qa-appointment").addEventListener("click", ()=>{ closeModal(); openAddAppointmentModal(); });
  $("#qa-location").addEventListener("click", ()=>{ closeModal(); openAddLocationModal(); });
  $("#qa-activity").addEventListener("click", ()=>{ closeModal(); openAddActivityModal(); });
  $("#qa-relative").addEventListener("click", ()=>{ closeModal(); openAddRelativeModal(); });
}

// -------------------- Add Patient --------------------
function openAddPatientModal(editId){
  const patient = state.patients.find(p=>p.id===editId) || {};
  const html = `
    <form id="formAddPatient" class="form-grid">
      <div class="form-grid col-2">
        <div class="form-group"><label>Full Name</label><input name="fullName" required value="${escapeHtml(patient.fullName||'')}" /></div>
        <div class="form-group"><label>DOB</label><input name="dob" type="date" value="${escapeHtml(patient.dob||'')}" /></div>
        <div class="form-group"><label>Age</label><input name="age" type="number" value="${escapeHtml(patient.age||'')}" /></div>
        <div class="form-group"><label>Gender</label><select name="gender"><option ${patient.gender==='Male'?'selected':''}>Male</option><option ${patient.gender==='Female'?'selected':''}>Female</option><option ${patient.gender==='Other'?'selected':''}>Other</option></select></div>
      </div>
      <div class="form-group"><label>Stage</label><select name="stage"><option ${patient.stage==='Early'?'selected':''}>Early</option><option ${patient.stage==='Middle'?'selected':''}>Middle</option><option ${patient.stage==='Late'?'selected':''}>Late</option></select></div>
      <div class="form-group"><label>Contact</label><input name="contact" value="${escapeHtml(patient.contact||'')}" /></div>
      <div class="form-group"><label>Notes</label><textarea name="notes" rows="4">${escapeHtml(patient.notes||'')}</textarea></div>

      <div class="form-group"><label>Photo</label>
        <div class="photo-upload" id="patientPhotoBox">
          <div class="hint">Click to choose or drag photo</div>
          <input type="file" id="patientPhoto" accept="image/*" />
          <img id="patientPhotoPreview" class="photo-preview" style="display:${patient.photo?'block':'none'}" src="${patient.photo||''}" />
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="ghost-btn" id="cancelAddPatient">Cancel</button>
        <button type="submit" class="primary-btn"><i class="fas fa-save"></i> ${editId? 'Update' : 'Save'} Patient</button>
      </div>
    </form>
  `;
  openModal(editId?`Edit Patient`:`Add Patient`, html);

  const photoInput = $("#patientPhoto");
  const preview = $("#patientPhotoPreview");
  const box = $("#patientPhotoBox");
  box.addEventListener("click", ()=> photoInput.click());
  box.addEventListener("dragover", e=> { e.preventDefault(); box.classList.add("dragover"); });
  box.addEventListener("dragleave", e=> { box.classList.remove("dragover"); });
  box.addEventListener("drop", e=> { e.preventDefault(); box.classList.remove("dragover"); if(e.dataTransfer.files[0]) { photoInput.files = e.dataTransfer.files; loadPreview(photoInput, preview); } });
  photoInput.addEventListener("change", ()=> loadPreview(photoInput, preview));

  $("#cancelAddPatient").addEventListener("click", closeModal);
  $("#formAddPatient").addEventListener("submit", async (e)=> {
    e.preventDefault();
    const f = new FormData(e.target);
    const file = photoInput.files[0];
    let photoData = patient.photo || null;
    if (file) {
      try { photoData = await fileToDataURL(file); } catch (err) { console.warn('photo read failed', err); }
    }

    const newPatient = {
      // note: server will assign id; local id used only if server unavailable
      fullName: f.get("fullName"),
      dob: f.get("dob"),
      age: Number(f.get("age")||0),
      gender: f.get("gender"),
      diagnosisDate: today(),
      stage: f.get("stage"),
      contact: f.get("contact"),
      notes: f.get("notes")||"",
      registration: nowTimestamp(),
      photo: photoData
    };

    // If editing client-side only: not implemented for server updates here.
    if (editId){
      // optimistic local update
      state.patients = state.patients.map(p => p.id===editId ? {...p, ...newPatient} : p);
      renderAll();
      closeModal();
      return;
    }

    // try to save to server first
    try {
      const saved = await savePatientToServer(newPatient);
      // after server save, reload authoritative data
      await loadInitialData();
    } catch (err) {
      // fallback: use local only
      const local = { id: String(Date.now()), ...newPatient, currentCaretakerId: null, email:"", address:"", city:"", state:"", postal:"", bloodGroup:"", allergies:"", lastVisit:"" };
      state.patients.unshift(local);
      renderAll();
      console.warn('Saved locally (server unavailable).');
    }

    closeModal();
    location.hash = "#patients";
  });
}

// -------------------- Add Caregiver --------------------
function openAddCaregiverModal(editId){
  const care = state.caretakers.find(c => c.id===editId) || {};
  const html = `
    <form id="formAddCaregiver" class="form-grid">
      <div class="form-grid col-2">
        <div class="form-group"><label>Full Name</label><input name="fullName" required value="${escapeHtml(care.fullName||'')}" /></div>
        <div class="form-group"><label>Relation</label><input name="relation" value="${escapeHtml(care.relation||'')}" /></div>
      </div>
      <div class="form-group"><label>Contact</label><input name="contact" value="${escapeHtml(care.contact||'')}" /></div>
      <div class="form-group"><label>Assign to (Patient)</label>
        <select name="assignedPatient">
          <option value="">-- none --</option>
          ${state.patients.map(p => `<option value="${p.id}" ${care.assignedPatientId===p.id?'selected':''}>${escapeHtml(p.fullName)} (id:${p.id})</option>`).join('')}
        </select>
      </div>

      <div class="form-group"><label>Photo</label>
        <div class="photo-upload" id="carePhotoBox">
          <div class="hint">Click to choose</div>
          <input type="file" id="carePhoto" accept="image/*" />
          <img id="carePhotoPreview" class="photo-preview" style="display:${care.photo?'block':'none'}" src="${care.photo||''}" />
        </div>
      </div>

      <div class="form-actions"><button type="button" class="ghost-btn" id="cancelAddCare">Cancel</button><button type="submit" class="primary-btn"><i class="fas fa-save"></i> ${editId? 'Update':'Save'} Caregiver</button></div>
    </form>
  `;
  openModal(editId?`Edit Caregiver`:`Add Caregiver`, html);

  const photoInput = $("#carePhoto");
  const preview = $("#carePhotoPreview");
  const box = $("#carePhotoBox");
  box.addEventListener("click", ()=> photoInput.click());
  photoInput.addEventListener("change", ()=> loadPreview(photoInput, preview));

  $("#cancelAddCare").addEventListener("click", closeModal);
  $("#formAddCaregiver").addEventListener("submit", async (e)=> {
    e.preventDefault();
    const f = new FormData(e.target);
    const assigned = f.get("assignedPatient");
    const file = photoInput.files[0];
    let photoData = care.photo || null;
    if (file) {
      try { photoData = await fileToDataURL(file); } catch (err) { console.warn('photo read failed', err); }
    }

    const c = {
      fullName: f.get("fullName"),
      relation: f.get("relation"),
      contact: f.get("contact"),
      assignedPatientId: assigned ? assigned : null,
      joined: nowTimestamp(),
      photo: photoData
    };

    if (editId) {
      // local update only for edits
      state.caretakers = state.caretakers.map(x => x.id===editId ? {...x, ...c} : x);
      if (c.assignedPatientId) assignCaretakerToPatient(c.assignedPatientId, editId);
      renderAll();
      closeModal();
      return;
    }

    try {
      const saved = await saveCaretakerToServer(c);
      // refresh authoritative data
      await loadInitialData();
    } catch (err) {
      // fallback local
      const local = { id: String(Date.now()), ...c };
      state.caretakers.push(local);
      if (local.assignedPatientId) assignCaretakerToPatient(local.assignedPatientId, local.id);
      renderAll();
      console.warn('Saved caregiver locally (server unavailable).');
    }

    closeModal();
    location.hash = "#caregivers";
  });
}

// -------------------- Add Relative --------------------
function openAddRelativeModal(editId){
  const rel = state.relatives.find(r => r.id===editId) || {};
  const html = `
    <form id="formAddRelative" class="form-grid">
      <div class="form-grid col-2">
        <div class="form-group"><label>Name</label><input name="name" required value="${escapeHtml(rel.name||'')}" /></div>
        <div class="form-group"><label>Relation</label><input name="relation" value="${escapeHtml(rel.relation||'')}" /></div>
      </div>
      <div class="form-group"><label>Patient</label>
        <select name="patientId">
          <option value="">-- (optional) --</option>
          ${state.patients.map(p => `<option value="${p.id}" ${rel.patientId===p.id?'selected':''}>${escapeHtml(p.fullName)} (id:${p.id})</option>`).join('')}
        </select>
      </div>

      <div class="form-group"><label>Photo</label>
        <div class="photo-upload" id="relPhotoBox">
          <div class="hint">Click to choose or drag photo</div>
          <input type="file" id="relPhoto" accept="image/*" />
          <img id="relPhotoPreview" class="photo-preview" style="display:${rel.photo?'block':'none'}" src="${rel.photo||''}" />
        </div>
      </div>

      <div class="form-actions"><button type="button" class="ghost-btn" id="cancelAddRel">Cancel</button><button type="submit" class="primary-btn"><i class="fas fa-save"></i> ${editId? 'Update':'Save'} Relative</button></div>
    </form>
  `;
  openModal(editId?`Edit Relative`:`Add Relative`, html);

  const photoInput = $("#relPhoto");
  const preview = $("#relPhotoPreview");
  const box = $("#relPhotoBox");
  box.addEventListener("click", ()=> photoInput.click());
  box.addEventListener("dragover", e=> { e.preventDefault(); box.classList.add("dragover"); });
  box.addEventListener("dragleave", e=> { box.classList.remove("dragover"); });
  box.addEventListener("drop", e=> { e.preventDefault(); box.classList.remove("dragover"); if(e.dataTransfer.files[0]) { photoInput.files = e.dataTransfer.files; loadPreview(photoInput, preview); } });
  photoInput.addEventListener("change", ()=> loadPreview(photoInput, preview));

  $("#cancelAddRel").addEventListener("click", closeModal);
  $("#formAddRelative").addEventListener("submit", async (e)=> {
    e.preventDefault();
    const f = new FormData(e.target);
    const file = photoInput.files[0];
    let photoData = rel.photo || null;
    if (file) {
      try { photoData = await fileToDataURL(file); } catch (err) { console.warn('photo read failed', err); }
    }

    const r = {
      id: editId || String(Date.now()),
      patientId: f.get("patientId") ? f.get("patientId") : null,
      name: f.get("name"),
      relation: f.get("relation"),
      photo: photoData
    };
    if (editId) {
      state.relatives = state.relatives.map(x => x.id===editId ? {...x, ...r} : x);
    } else {
      state.relatives.unshift(r);
    }
    closeModal();
    renderAll();
    location.hash = "#relatives";
  });
}

function openEditRelativeModal(id){
  openAddRelativeModal(id);
}

// -------------------- Assign caregiver (move previous to prevCaretakers) --------------------
function openAssignCaregiverModal(patientId){
  const patient = state.patients.find(p => p.id===patientId);
  if (!patient) return alert("Patient not found");
  const html = `
    <div class="form-grid">
      <p>Assign caregiver for <strong>${escapeHtml(patient.fullName)}</strong></p>
      <div class="form-grid">
        ${state.caretakers.map(c => `<button class="primary-btn" data-cid="${c.id}">${escapeHtml(c.fullName)} ${c.assignedPatientId? '(assigned)':''}</button>`).join('')}
      </div>
      <button class="primary-btn" id="createNewCare"><i class="fas fa-plus"></i> Create & Assign New Caregiver</button>
    </div>
  `;
  openModal("Assign Caregiver", html);
  document.querySelectorAll(".form-grid button").forEach(b => b.addEventListener("click", async e => {
    const cid = e.currentTarget.dataset.cid;
    if(cid){
        assignCaretakerToPatient(patientId, cid);
        // attempt to persist assignment to server
        const ok = await updateCaretakerOnServer(cid, { assignedPatientId: patientId });
        if (!ok) console.warn('Could not persist caretaker assignment to server (endpoint may not exist).');
    }
    closeModal();
    renderAll();
  }));
  $("#createNewCare")?.addEventListener("click", ()=> { closeModal(); openAddCaregiverModal(); });
}

function assignCaretakerToPatient(patientId, caretakerId){
  const p = state.patients.find(x => x.id === patientId);
  const newCare = state.caretakers.find(x => x.id === caretakerId);
  if (!p || !newCare) return;

  if (p.currentCaretakerId){
    const old = state.caretakers.find(x => x.id === p.currentCaretakerId);
    if (old){
      state.prevCaretakers.push({
        id: String(Date.now()),
        patientId: p.id,
        fullName: old.fullName,
        relation: old.relation || '',
        from: old.joined || '',
        to: today(),
        notes: `Replaced by ${newCare.fullName}`,
        contact: old.contact || ''
      });
      // clear old assigned
      old.assignedPatientId = null;
    }
  }

  p.currentCaretakerId = newCare.id;
  newCare.assignedPatientId = p.id;
  renderAll();
}

// -------------------- Add other simple modals --------------------
function openAddMedicalModal(){
  const html = `<form id="formAddMedical" class="form-grid">
    <div class="form-group"><label>Patient</label><select name="patientId">${state.patients.map(p=>`<option value="${p.id}">${escapeHtml(p.fullName)}</option>`).join('')}</select></div>
    <div class="form-grid col-2"><div class="form-group"><label>Condition</label><input name="condition" required></div><div class="form-group"><label>Diagnosis Date</label><input name="diagnosisDate" type="date"></div></div>
    <div class="form-group"><label>Treatment</label><input name="treatment"></div>
    <div class="form-actions"><button type="button" class="ghost-btn" id="cancelAddMed">Cancel</button><button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button></div></form>`;
  openModal("Add Medical History", html);
  $("#cancelAddMed")?.addEventListener("click", closeModal);
  $("#formAddMedical")?.addEventListener("submit", e=> { e.preventDefault(); const f=new FormData(e.target); state.medicalHistory.push({ id: String(Date.now()), patientId: f.get("patientId"), condition:f.get("condition"), diagnosisDate: f.get("diagnosisDate"), treatment: f.get("treatment"), hospital:"", doctor:"", followUp:false, notes:"", recordDate: nowTimestamp()}); closeModal(); renderAll();});
}
function openAddMedicationModal(){
  const html = `<form id="formAddMedication" class="form-grid">
    <div class="form-group"><label>Patient</label><select name="patientId">${state.patients.map(p=>`<option value="${p.id}">${escapeHtml(p.fullName)}</option>`).join('')}</select></div>
    <div class="form-group"><label>Medication</label><input name="med" required></div>
    <div class="form-grid col-2">
      <div class="form-group"><label>Dosage</label><input name="dosage"></div>
      <div class="form-group"><label>Frequency</label><input name="frequency"></div>
    </div>
    <div class="form-grid col-2">
      <div class="form-group"><label>Start Date</label><input type="date" name="startDate"></div>
      <div class="form-group"><label>End Date</label><input type="date" name="endDate"></div>
    </div>
    <div class="form-actions">
      <button type="button" class="ghost-btn" id="cancelAddMedication">Cancel</button>
      <button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button>
    </div>
  </form>`;
  openModal("Add Medication", html);
  $("#cancelAddMedication")?.addEventListener("click", closeModal);
  $("#formAddMedication")?.addEventListener("submit", e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    state.medications.push({
      id: String(Date.now()),
      patientId: f.get("patientId"),
      medicationName: f.get("med"),
      dosage: f.get("dosage"),
      frequency: f.get("frequency"),
      startDate: f.get("startDate"),
      endDate: f.get("endDate"),
      prescribedBy:"", sideEffects:"", lastUpdated: nowTimestamp()
    });
    closeModal();
    renderAll();
  });
}
function openAddAppointmentModal(){
  const html = `<form id="formAddAppointment" class="form-grid">
    <div class="form-group"><label>Patient</label><select name="patientId">${state.patients.map(p=>`<option value="${p.id}">${escapeHtml(p.fullName)}</option>`).join('')}</select></div>
    <div class="form-grid col-2"><div class="form-group"><label>Date</label><input type="date" name="date"></div><div class="form-group"><label>Time</label><input type="time" name="time"></div></div>
    <div class="form-group"><label>Purpose</label><input name="purpose"></div>
    <div class="form-actions"><button type="button" class="ghost-btn" id="cancelAddApt">Cancel</button><button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button></div></form>`;
  openModal("Add Appointment", html);
  $("#cancelAddApt")?.addEventListener("click", closeModal);
  $("#formAddAppointment")?.addEventListener("submit", e=>{ e.preventDefault(); const f=new FormData(e.target); state.appointments.push({ id: String(Date.now()), patientId: f.get("patientId"), date:f.get("date"), time:f.get("time"), doctorName:"", purpose:f.get("purpose"), status:"Scheduled", location:"", created: nowTimestamp()}); closeModal(); renderAll();});
}
function openAddLocationModal(){
  const html = `<form id="formAddLocation" class="form-grid">
    <div class="form-group"><label>Patient</label><select name="patientId">${state.patients.map(p=>`<option value="${p.id}">${escapeHtml(p.fullName)}</option>`).join('')}</select></div>
    <div class="form-grid col-2"><div class="form-group"><label>Date</label><input type="date" name="date"></div><div class="form-group"><label>Time</label><input type="time" name="time"></div></div>
    <div class="form-group"><label>Description</label><input name="desc"></div>
    <div class="form-grid col-2"><div class="form-group"><label>Lat</label><input name="lat"></div><div class="form-group"><label>Lng</label><input name="lng"></div></div>
    <div class="form-actions"><button type="button" class="ghost-btn" id="cancelAddLoc">Cancel</button><button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button></div></form>`;
  openModal("Add Location Log", html);
  $("#cancelAddLoc")?.addEventListener("click", closeModal);
  $("#formAddLocation")?.addEventListener("submit", e=>{ e.preventDefault(); const f=new FormData(e.target); state.locations.push({ id: String(Date.now()), patientId: f.get("patientId"), date:f.get("date"), time:f.get("time"), description:f.get("desc"), lat: Number(f.get("lat")||0), lng: Number(f.get("lng")||0), recordedBy:null, recordedAt: nowTimestamp()}); closeModal(); renderAll();});
}
function openAddActivityModal(){
  const html = `<form id="formAddActivity" class="form-grid">
    <div class="form-group"><label>Patient</label><select name="patientId">${state.patients.map(p=>`<option value="${p.id}">${escapeHtml(p.fullName)}</option>`).join('')}</select></div>
    <div class="form-grid col-2"><div class="form-group"><label>Date</label><input type="date" name="date"></div><div class="form-group"><label>Time</label><input type="time" name="time"></div></div>
    <div class="form-group"><label>Activity</label><input name="desc"></div>
    <div class="form-group"><label>Mood</label><input name="mood"></div>
    <div class="form-actions"><button type="button" class="ghost-btn" id="cancelAddAct">Cancel</button><button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button></div></form>`;
  openModal("Add Activity", html);
  $("#cancelAddAct")?.addEventListener("click", closeModal);
  $("#formAddActivity")?.addEventListener("submit", e=> { e.preventDefault(); const f=new FormData(e.target); state.activities.push({ id: String(Date.now()), patientId: f.get("patientId"), date:f.get("date"), time:f.get("time"), description:f.get("desc"), mood:f.get("mood"), caretakerId:null, duration:null, notes:"", recordedAt: nowTimestamp()}); closeModal(); renderAll();});
}

// -------------------- Utilities: file reader & preview --------------------
function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function loadPreview(input, imgEl){
  const f = input.files[0];
  if (!f){ imgEl.style.display='none'; imgEl.src=''; return; }
  if (f.size > 5*1024*1024){ alert("Image too large (5MB max)."); return; }
  const reader = new FileReader();
  reader.onload = ()=> { imgEl.src = reader.result; imgEl.style.display = 'block'; };
  reader.readAsDataURL(f);
}

// -------------------- Simple bar chart --------------------
function drawBarChart(canvasId, data){
  const c = document.getElementById(canvasId);
  if(!c) return;
  const ctx = c.getContext("2d");
  const W = c.width = c.clientWidth * devicePixelRatio;
  const H = c.height = c.clientHeight * devicePixelRatio;
  ctx.clearRect(0,0,W,H);
  const pad = 30 * devicePixelRatio;
  const bw = (W - pad*2) / data.length * 0.7;
  const gap = (W - pad*2) / data.length * 0.3;
  const max = Math.max(...data, 100);
  data.forEach((v,i)=>{
    const x = pad + i*(bw+gap) + gap/2;
    const h = (v/max) * (H - pad*2);
    const y = H - pad - h;
    const grad = ctx.createLinearGradient(0,y,0,H-pad);
    grad.addColorStop(0, "#00bcd4");
    grad.addColorStop(1, "#5a67d8");
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, bw, h, 8*devicePixelRatio);
    ctx.fill();
    ctx.fillStyle = "#95a5b5";
    ctx.font = `${12*devicePixelRatio}px var(--font-family)`;
    ctx.fillText(`${v}%`, x+2*devicePixelRatio, y-8*devicePixelRatio);
  });
}
function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

// -------------------- View patient details (simple) --------------------
function viewPatient(id){
  const p = state.patients.find(x=>x.id===id);
  if(!p) return alert("Patient not found");
  const care = state.caretakers.find(c=>c.id===p.currentCaretakerId);
  const html = `<div class="form-grid">
    <div class="user-profile-modal" style="display:flex;gap:12px;align-items:center">
      <div class="avatar-large">${p.photo? `<img src="${p.photo}" alt="">`: `<img src="${DEFAULT_AVATAR}" alt="">`}</div>
      <div>
        <div class="user-name">${escapeHtml(p.fullName)}</div>
        <div class="user-meta">Age: ${p.age} • Stage: ${escapeHtml(p.stage)} • DOB: ${escapeHtml(p.dob)}</div>
        <div class="user-meta">Caretaker: ${care? escapeHtml(care.fullName): '—'}</div>
      </div>
    </div>
    <hr/>
    <div class="form-group"><label>Notes</label><p class="note-text">${escapeHtml(p.notes)}</p></div>
  </div>`;
  openModal(`Patient Details`, html);
}


/**
 * Ephemeral Care Room – Application state and flow
 * Patient-first, consent-based, no data stored outside session.
 */

(function () {
  'use strict';

  // ----- State -----
  const state = {
    view: 'login',
    user: null, // { type: 'patient'|'doctor', name: string }
    requests: [], // { id, patientName, reason, status, doctorAccess, filesCount, startedAt }
    activeRequestId: null,
    inCareRoom: false,
    nextId: 1
  };

  // Persist minimal state for demo (so doctor can "see" patient request in same browser)
  const STORAGE_KEY = 'ephemeral-care-room-state';
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.requests)) state.requests = saved.requests;
        if (typeof saved.nextId === 'number') state.nextId = saved.nextId;
      }
    } catch (_) {}
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        requests: state.requests,
        nextId: state.nextId
      }));
    } catch (_) {}
  }
  loadState();

  // ----- DOM refs -----
  const views = {
    login: document.getElementById('view-login'),
    patientDashboard: document.getElementById('view-patient-dashboard'),
    doctorDashboard: document.getElementById('view-doctor-dashboard'),
    careRoom: document.getElementById('view-care-room')
  };

  const elements = {
    // Login
    btnPatientLogin: document.getElementById('btn-patient-login'),
    btnDoctorLogin: document.getElementById('btn-doctor-login'),
    loginForm: document.getElementById('login-form'),
    inputName: document.getElementById('input-name'),
    loginError: document.getElementById('login-error'),
    btnSubmitLogin: document.getElementById('btn-submit-login'),
    // Patient
    patientName: document.getElementById('patient-name'),
    btnPatientLogout: document.getElementById('btn-patient-logout'),
    patientNoSession: document.getElementById('patient-no-session'),
    patientActiveSession: document.getElementById('patient-active-session'),
    patientSessionBadge: document.getElementById('patient-session-badge'),
    patientSessionTimer: document.getElementById('patient-session-timer'),
    patientSessionStatusText: document.getElementById('patient-session-status-text'),
    btnEnterCareRoom: document.getElementById('btn-enter-care-room'),
    btnEndConsultation: document.getElementById('btn-end-consultation'),
    patientSessionExpired: document.getElementById('patient-session-expired'),
    btnBookConsultation: document.getElementById('btn-book-consultation'),
    patientBookLoading: document.getElementById('patient-book-loading'),
    patientBookError: document.getElementById('patient-book-error'),
    patientNoDoctor: document.getElementById('patient-no-doctor'),
    patientSessionEndedMsg: document.getElementById('patient-session-ended-msg'),
    patientConsentValue: document.getElementById('patient-consent-value'),
    toggleDoctorAccess: document.getElementById('toggle-doctor-access'),
    patientFilesStatus: document.getElementById('patient-files-status'),
    // Doctor
    doctorName: document.getElementById('doctor-name'),
    doctorStatusBadge: document.getElementById('doctor-status-badge'),
    btnDoctorLogout: document.getElementById('btn-doctor-logout'),
    doctorRequestList: document.getElementById('doctor-request-list'),
    doctorNoRequests: document.getElementById('doctor-no-requests'),
    doctorSelectedRequest: document.getElementById('doctor-selected-request'),
    doctorRequestDetail: document.getElementById('doctor-request-detail'),
    btnDoctorJoin: document.getElementById('btn-doctor-join'),
    // Care room
    careRoomTimer: document.getElementById('care-room-timer'),
    btnEndFromRoom: document.getElementById('btn-end-from-room'),
    btnUploadReport: document.getElementById('btn-upload-report'),
    careRoomFilesCount: document.getElementById('care-room-files-count'),
    careRoomFilesNum: document.getElementById('care-room-files-num'),
    careRoomEndConfirm: document.getElementById('care-room-end-confirm'),
    btnCancelEnd: document.getElementById('btn-cancel-end'),
    btnConfirmEnd: document.getElementById('btn-confirm-end')
  };

  const toastEl = document.getElementById('toast');
  let timerInterval = null;

  // ----- Helpers -----
  function showView(viewName) {
    state.view = viewName;
    Object.keys(views).forEach(function (k) {
      const v = views[k];
      if (v) v.classList.toggle('hidden', k !== viewName);
    });
    if (viewName === 'patient-dashboard') renderPatientDashboard();
    if (viewName === 'doctor-dashboard') renderDoctorDashboard();
    if (viewName === 'care-room') renderCareRoom();
  }

  function showToast(message, type) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = 'toast toast--' + (type || 'info');
    toastEl.classList.remove('hidden');
    setTimeout(function () {
      toastEl.classList.add('hidden');
    }, 4000);
  }

  function getPatientRequest() {
    if (!state.user || state.user.type !== 'patient') return null;
    return state.requests.find(function (r) {
      return r.patientName === state.user.name && r.status !== 'ended';
    });
  }

  function getLastEndedPatientRequest() {
    if (!state.user || state.user.type !== 'patient') return null;
    var ended = state.requests.filter(function (r) {
      return r.patientName === state.user.name && r.status === 'ended';
    });
    return ended.length ? ended[ended.length - 1] : null;
  }

  function getRequestById(id) {
    return state.requests.find(function (r) { return r.id === id; });
  }

  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function startSessionTimer(request, updateUi) {
    if (timerInterval) clearInterval(timerInterval);
    if (!request || !request.startedAt) return;
    function tick() {
      var elapsed = Date.now() - request.startedAt;
      if (updateUi && elements.careRoomTimer) elements.careRoomTimer.textContent = formatDuration(elapsed);
      if (elements.patientSessionTimer) {
        elements.patientSessionTimer.textContent = formatDuration(elapsed);
        elements.patientSessionTimer.classList.remove('hidden');
      }
    }
    tick();
    timerInterval = setInterval(tick, 1000);
  }

  function stopSessionTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // ----- Login -----
  function onPatientLoginClick() {
    elements.loginForm.classList.remove('hidden');
    elements.loginError.classList.add('hidden');
    elements.inputName.value = '';
    elements.inputName.focus();
  }

  function onDoctorLoginClick() {
    elements.loginForm.classList.remove('hidden');
    elements.loginError.classList.add('hidden');
    elements.inputName.value = '';
    elements.inputName.placeholder = 'Doctor name';
    elements.inputName.focus();
  }

  function onSubmitLogin(isDoctor) {
    var name = (elements.inputName && elements.inputName.value || '').trim();
    elements.loginError.classList.add('hidden');
    if (!name) {
      if (elements.loginError) {
        elements.loginError.textContent = 'Please enter your name.';
        elements.loginError.classList.remove('hidden');
      }
      return;
    }
    state.user = { type: isDoctor ? 'doctor' : 'patient', name: name };
    showView(isDoctor ? 'doctor-dashboard' : 'patient-dashboard');
  }

  function onLogout() {
    state.user = null;
    state.activeRequestId = null;
    state.inCareRoom = false;
    stopSessionTimer();
    if (elements.inputName) elements.inputName.placeholder = 'Enter your name';
    showView('login');
  }

  // ----- Patient: Book consultation -----
  function onBookConsultation() {
    if (!state.user || state.user.type !== 'patient') return;
    if (getPatientRequest()) return; // already have one

    elements.patientBookError.classList.add('hidden');
    elements.patientNoDoctor.classList.add('hidden');
    elements.patientBookLoading.classList.remove('hidden');
    elements.btnBookConsultation.disabled = true;

    // Simulate booking; occasionally no doctor available (for demo)
    setTimeout(function () {
      var noDoctor = Math.random() < 0.15;
      elements.patientBookLoading.classList.add('hidden');
      elements.btnBookConsultation.disabled = false;
      if (noDoctor) {
        elements.patientNoDoctor.classList.remove('hidden');
        showToast('No doctor available right now. Please try again in a moment.', 'error');
        return;
      }
      var req = {
        id: 'req-' + state.nextId++,
        patientName: state.user.name,
        reason: 'Consultation',
        status: 'requested',
        doctorAccess: false,
        filesCount: 0,
        startedAt: null
      };
      state.requests.push(req);
      saveState();
      showToast('Consultation requested. You can enter the care room when ready.', 'success');
      renderPatientDashboard();
    }, 600);
  }

  // ----- Patient: Enter care room / Start consultation -----
  function onEnterCareRoom() {
    var req = getPatientRequest();
    if (!req || !state.user || state.user.type !== 'patient') return;
    if (req.status === 'active') {
      state.inCareRoom = true;
      state.activeRequestId = req.id;
      startSessionTimer(req, true);
      showView('care-room');
      renderCareRoom();
      return;
    }
    // requested → active
    req.status = 'active';
    req.startedAt = Date.now();
    req.doctorAccess = false;
    saveState();
    state.inCareRoom = true;
    state.activeRequestId = req.id;
    startSessionTimer(req, true);
    showView('care-room');
    renderCareRoom();
    showToast('Consultation started. Doctor can now join.', 'success');
  }

  // ----- Patient: Consent toggle -----
  function onToggleDoctorAccess() {
    var req = getPatientRequest();
    if (!req) return;
    req.doctorAccess = !req.doctorAccess;
    saveState();
    renderPatientDashboard();
    if (elements.patientConsentValue) {
      elements.patientConsentValue.textContent = req.doctorAccess ? 'ON' : 'OFF';
    }
    if (elements.toggleDoctorAccess) {
      elements.toggleDoctorAccess.setAttribute('aria-pressed', req.doctorAccess ? 'true' : 'false');
    }
    showToast(req.doctorAccess ? 'Doctor access turned on.' : 'Doctor access turned off.', 'success');
  }

  // ----- End consultation -----
  function endConsultation() {
    var req = state.activeRequestId ? getRequestById(state.activeRequestId) : null;
    if (req) {
      req.status = 'ended';
      req.filesCount = 0;
      req.doctorAccess = false;
      req.startedAt = null;
      saveState();
    }
    state.activeRequestId = null;
    state.inCareRoom = false;
    stopSessionTimer();
    elements.careRoomEndConfirm.classList.add('hidden');
    showToast('Consultation ended. All shared files have been deleted.', 'success');
    if (state.user) {
      if (state.user.type === 'patient') showView('patient-dashboard');
      else showView('doctor-dashboard');
      renderPatientDashboard();
      renderDoctorDashboard();
    }
  }

  function onConfirmEndConsultation() {
    endConsultation();
  }

  function onCancelEnd() {
    if (elements.careRoomEndConfirm) elements.careRoomEndConfirm.classList.add('hidden');
  }

  function onEndConsultationClick() {
    if (elements.careRoomEndConfirm) elements.careRoomEndConfirm.classList.remove('hidden');
  }

  // ----- Doctor: Join care room -----
  function onDoctorJoin() {
    var id = state.user && state.user.type === 'doctor' ? state.selectedRequestId : state.activeRequestId;
    var req = id ? getRequestById(id) : null;
    if (!req || req.status !== 'active') return;
    state.activeRequestId = req.id;
    state.inCareRoom = true;
    startSessionTimer(req, true);
    showView('care-room');
    renderCareRoom();
    showToast('You joined the care room.', 'success');
  }

  function selectDoctorRequest(id) {
    state.selectedRequestId = id;
    renderDoctorDashboard();
  }

  // ----- Upload (simulated) -----
  function onUploadReport() {
    var req = state.activeRequestId ? getRequestById(state.activeRequestId) : null;
    if (!req || req.status !== 'active') return;
    req.filesCount = (req.filesCount || 0) + 1;
    saveState();
    renderCareRoom();
    renderPatientDashboard();
    showToast('File uploaded. It will be deleted when the session ends.', 'success');
  }

  // ----- Render -----
  function renderPatientDashboard() {
    if (!state.user || state.user.type !== 'patient') return;

    if (elements.patientName) elements.patientName.textContent = state.user.name;

    var req = getPatientRequest();
    var hasSession = !!req;
    var isActive = req && req.status === 'active';
    var isEnded = req && req.status === 'ended';

    if (elements.patientNoSession) {
      elements.patientNoSession.classList.toggle('hidden', hasSession);
    }
    if (elements.patientActiveSession) {
      elements.patientActiveSession.classList.toggle('hidden', !hasSession);
    }

    if (hasSession && elements.patientSessionExpired) {
      elements.patientSessionExpired.classList.toggle('hidden', req.status !== 'ended');
    }
    if (hasSession && req.status !== 'ended') {
      if (elements.patientSessionBadge) {
        elements.patientSessionBadge.textContent = isActive ? 'Consultation Active' : 'Consultation Ready';
        elements.patientSessionBadge.classList.toggle('badge--active', isActive);
      }
      if (elements.patientSessionStatusText) {
        elements.patientSessionStatusText.textContent = isActive
          ? 'You are in the care room. You can end the consultation when done.'
          : 'Your consultation is ready. Enter when you are.';
      }
      if (elements.btnEndConsultation) elements.btnEndConsultation.disabled = !isActive;
      if (elements.toggleDoctorAccess) {
        elements.toggleDoctorAccess.disabled = false;
        elements.toggleDoctorAccess.setAttribute('aria-pressed', req.doctorAccess ? 'true' : 'false');
      }
      if (elements.patientConsentValue) elements.patientConsentValue.textContent = req.doctorAccess ? 'ON' : 'OFF';
    } else {
      if (elements.toggleDoctorAccess) elements.toggleDoctorAccess.disabled = true;
    }

    if (elements.patientFilesStatus) {
      elements.patientFilesStatus.textContent = req && req.filesCount > 0
        ? 'Files shared (' + req.filesCount + ') — will be deleted after session.'
        : 'No files shared.';
    }

    var lastEnded = getLastEndedPatientRequest();
    if (!hasSession && elements.patientSessionEndedMsg) {
      elements.patientSessionEndedMsg.classList.toggle('hidden', !lastEnded);
    }
  }

  function renderDoctorDashboard() {
    if (!state.user || state.user.type !== 'doctor') return;

    if (elements.doctorName) elements.doctorName.textContent = state.user.name;

    var list = state.requests.filter(function (r) { return r.status !== 'ended'; });
    elements.doctorNoRequests.classList.toggle('hidden', list.length > 0);
    elements.doctorRequestList.innerHTML = '';
    list.forEach(function (r) {
      var card = document.createElement('div');
      card.className = 'request-card' + (state.selectedRequestId === r.id ? ' request-card--selected' : '');
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      var statusText = r.status === 'active' ? 'Active' : r.status === 'requested' ? 'Waiting for patient' : 'Ready';
      card.innerHTML = '<div class="request-name">' + escapeHtml(r.patientName) + '</div>' +
        '<p class="request-meta">' + escapeHtml(r.reason) + ' · ' + statusText + '</p>';
      card.addEventListener('click', function () { selectDoctorRequest(r.id); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDoctorRequest(r.id); }
      });
      elements.doctorRequestList.appendChild(card);
    });

    var selected = state.selectedRequestId ? getRequestById(state.selectedRequestId) : null;
    if (selected) {
      elements.doctorSelectedRequest.classList.remove('hidden');
      elements.doctorRequestDetail.textContent = selected.patientName + ' — ' + selected.reason + ' · ' +
        (selected.status === 'active' ? 'Active — You can join' : 'Waiting for patient to start');
      elements.btnDoctorJoin.disabled = selected.status !== 'active';
    } else {
      elements.doctorSelectedRequest.classList.add('hidden');
    }
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderCareRoom() {
    var req = state.activeRequestId ? getRequestById(state.activeRequestId) : null;
    if (!req) {
      if (state.user.type === 'patient') showView('patient-dashboard');
      else showView('doctor-dashboard');
      return;
    }

    if (req.status !== 'active') {
      if (state.user.type === 'patient') showView('patient-dashboard');
      else showView('doctor-dashboard');
      return;
    }

    startSessionTimer(req, true);
    if (elements.careRoomTimer) elements.careRoomTimer.textContent = formatDuration(Date.now() - (req.startedAt || Date.now()));

    var isPatient = state.user.type === 'patient';
    if (elements.btnEndFromRoom) elements.btnEndFromRoom.style.visibility = isPatient ? 'visible' : 'hidden';
    if (elements.btnUploadReport) elements.btnUploadReport.disabled = !isPatient;
    if (elements.careRoomFilesCount && elements.careRoomFilesNum) {
      var count = req.filesCount || 0;
      elements.careRoomFilesNum.textContent = count;
      elements.careRoomFilesCount.classList.toggle('hidden', count === 0);
    }
  }

  // ----- Event bindings -----
  if (elements.btnPatientLogin) elements.btnPatientLogin.addEventListener('click', onPatientLoginClick);
  if (elements.btnDoctorLogin) elements.btnDoctorLogin.addEventListener('click', onDoctorLoginClick);
  if (elements.btnSubmitLogin) {
    elements.btnSubmitLogin.addEventListener('click', function () {
      var isDoctor = elements.inputName && elements.inputName.placeholder === 'Doctor name';
      onSubmitLogin(!!isDoctor);
    });
  }
  if (elements.inputName) {
    elements.inputName.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var isDoctor = elements.inputName.placeholder === 'Doctor name';
        onSubmitLogin(!!isDoctor);
      }
    });
  }

  if (elements.btnPatientLogout) elements.btnPatientLogout.addEventListener('click', onLogout);
  if (elements.btnDoctorLogout) elements.btnDoctorLogout.addEventListener('click', onLogout);

  if (elements.btnBookConsultation) elements.btnBookConsultation.addEventListener('click', onBookConsultation);
  if (elements.btnEnterCareRoom) elements.btnEnterCareRoom.addEventListener('click', onEnterCareRoom);
  if (elements.btnEndConsultation) elements.btnEndConsultation.addEventListener('click', onEndConsultationClick);
  if (elements.toggleDoctorAccess) elements.toggleDoctorAccess.addEventListener('click', onToggleDoctorAccess);

  if (elements.btnDoctorJoin) elements.btnDoctorJoin.addEventListener('click', onDoctorJoin);
  if (elements.btnEndFromRoom) elements.btnEndFromRoom.addEventListener('click', onEndConsultationClick);
  if (elements.btnCancelEnd) elements.btnCancelEnd.addEventListener('click', onCancelEnd);
  if (elements.btnConfirmEnd) elements.btnConfirmEnd.addEventListener('click', onConfirmEndConsultation);
  if (elements.btnUploadReport) elements.btnUploadReport.addEventListener('click', onUploadReport);

  if (elements.careRoomEndConfirm) {
    var backdrop = elements.careRoomEndConfirm.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', onCancelEnd);
  }

  // Initial view
  showView('login');
})();

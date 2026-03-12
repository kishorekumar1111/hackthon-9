import { createContext, useContext, useReducer, useCallback } from 'react';
import { loadPersisted, savePersisted } from './store';

const persisted = loadPersisted();

const initialState = {
  view: 'login',
  user: null,
  requests: persisted.requests,
  nextId: persisted.nextId,
  activeRequestId: null,
  selectedRequestId: null,
  toast: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: { type: action.payload.type, name: action.payload.name.trim() },
        view: action.payload.type === 'doctor' ? 'doctor-dashboard' : 'patient-dashboard',
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        view: 'login',
        activeRequestId: null,
        selectedRequestId: null,
      };
    case 'BOOK_START':
      return { ...state, bookLoading: true, noDoctor: false };
    case 'BOOK_FAIL':
      return { ...state, bookLoading: false, noDoctor: true };
    case 'BOOK_SUCCESS': {
      const req = action.payload;
      const requests = [...state.requests, req];
      savePersisted(requests, state.nextId + 1);
      return {
        ...state,
        bookLoading: false,
        noDoctor: false,
        requests,
        nextId: state.nextId + 1,
      };
    }
    case 'ENTER_CARE_ROOM': {
      const { requestId, startedAt } = action.payload;
      const requests = state.requests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'active', startedAt: startedAt ?? r.startedAt, doctorAccess: r.doctorAccess }
          : r
      );
      savePersisted(requests, state.nextId);
      return {
        ...state,
        requests,
        activeRequestId: requestId,
        view: 'care-room',
      };
    }
    case 'TOGGLE_CONSENT': {
      const requests = state.requests.map((r) =>
        r.id === action.payload ? { ...r, doctorAccess: !r.doctorAccess } : r
      );
      savePersisted(requests, state.nextId);
      return { ...state, requests };
    }
    case 'END_CONSULTATION': {
      const requests = state.requests.map((r) =>
        r.id === state.activeRequestId
          ? { ...r, status: 'ended', filesCount: 0, doctorAccess: false, startedAt: null }
          : r
      );
      savePersisted(requests, state.nextId);
      const view = state.user?.type === 'patient' ? 'patient-dashboard' : 'doctor-dashboard';
      return {
        ...state,
        requests,
        activeRequestId: null,
        view,
      };
    }
    case 'DOCTOR_SELECT_REQUEST':
      return { ...state, selectedRequestId: action.payload };
    case 'DOCTOR_JOIN': {
      const requestId = action.payload;
      return { ...state, activeRequestId: requestId, view: 'care-room' };
    }
    case 'UPLOAD_REPORT': {
      const requests = state.requests.map((r) =>
        r.id === state.activeRequestId ? { ...r, filesCount: (r.filesCount || 0) + 1 } : r
      );
      savePersisted(requests, state.nextId);
      return { ...state, requests };
    }
    case 'TOAST':
      return { ...state, toast: { message: action.payload.message, type: action.payload.type } };
    case 'TOAST_CLEAR':
      return { ...state, toast: null };
    case 'SET_VIEW':
      return { ...state, view: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const login = useCallback((type, name) => {
    dispatch({ type: 'LOGIN', payload: { type, name } });
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, []);

  const bookConsultation = useCallback(() => {
    if (!state.user || state.user.type !== 'patient') return;
    const existing = state.requests.find(
      (r) => r.patientName === state.user.name && r.status !== 'ended'
    );
    if (existing) return;

    dispatch({ type: 'BOOK_START' });
    setTimeout(() => {
      const noDoctor = Math.random() < 0.15;
      if (noDoctor) {
        dispatch({ type: 'BOOK_FAIL' });
        dispatch({ type: 'TOAST', payload: { message: 'No doctor available. Try again shortly.', type: 'error' } });
        return;
      }
      const req = {
        id: 'req-' + state.nextId,
        patientName: state.user.name,
        reason: 'Consultation',
        status: 'requested',
        doctorAccess: false,
        filesCount: 0,
        startedAt: null,
      };
      dispatch({ type: 'BOOK_SUCCESS', payload: req });
      dispatch({ type: 'TOAST', payload: { message: 'Consultation requested. Enter the care room when ready.', type: 'success' } });
    }, 600);
  }, [state.user, state.requests, state.nextId]);

  const enterCareRoom = useCallback(() => {
    const req = state.requests.find(
      (r) => r.patientName === state.user?.name && r.status !== 'ended'
    );
    if (!req || state.user?.type !== 'patient') return;
    const startedAt = req.status === 'active' ? req.startedAt : Date.now();
    dispatch({ type: 'ENTER_CARE_ROOM', payload: { requestId: req.id, startedAt } });
    if (req.status !== 'active') {
      dispatch({ type: 'TOAST', payload: { message: 'Consultation started. Doctor can now join.', type: 'success' } });
    }
  }, [state.user, state.requests]);

  const toggleDoctorAccess = useCallback(() => {
    const req = state.requests.find(
      (r) => r.patientName === state.user?.name && r.status !== 'ended'
    );
    if (!req) return;
    dispatch({ type: 'TOGGLE_CONSENT', payload: req.id });
    const on = !req.doctorAccess;
    dispatch({ type: 'TOAST', payload: { message: on ? 'Doctor access turned on.' : 'Doctor access turned off.', type: 'success' } });
  }, [state.user, state.requests]);

  const endConsultation = useCallback(() => {
    dispatch({ type: 'END_CONSULTATION' });
    dispatch({ type: 'TOAST', payload: { message: 'Consultation ended. All shared files have been deleted.', type: 'success' } });
  }, []);

  const selectDoctorRequest = useCallback((id) => {
    dispatch({ type: 'DOCTOR_SELECT_REQUEST', payload: id });
  }, []);

  const doctorJoin = useCallback(() => {
    const id = state.selectedRequestId;
    const req = state.requests.find((r) => r.id === id);
    if (!req || req.status !== 'active') return;
    dispatch({ type: 'DOCTOR_JOIN', payload: id });
    dispatch({ type: 'TOAST', payload: { message: 'You joined the care room.', type: 'success' } });
  }, [state.selectedRequestId, state.requests]);

  const uploadReport = useCallback(() => {
    if (!state.activeRequestId) return;
    dispatch({ type: 'UPLOAD_REPORT' });
    dispatch({ type: 'TOAST', payload: { message: 'File uploaded. It will be deleted when the session ends.', type: 'success' } });
  }, [state.activeRequestId]);

  const showToast = useCallback((message, type = 'info') => {
    dispatch({ type: 'TOAST', payload: { message, type } });
  }, []);

  const clearToast = useCallback(() => {
    dispatch({ type: 'TOAST_CLEAR' });
  }, []);

  const value = {
    state,
    login,
    logout,
    bookConsultation,
    enterCareRoom,
    toggleDoctorAccess,
    endConsultation,
    selectDoctorRequest,
    doctorJoin,
    uploadReport,
    showToast,
    clearToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

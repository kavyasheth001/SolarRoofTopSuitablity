import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_URL;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const authHeaders = () => ({
  Authorization: localStorage.getItem('token'),
});

// Which filter keys require the Outstanding API
export const OUTSTANDING_FILTER_KEYS = [
  'outstanding_min', 'outstanding_max', 'assessment_year',
  'taxpayer_category', 'repair_cess'
];

export const hasOutstandingFilters = (filters) =>
  OUTSTANDING_FILTER_KEYS.some((k) => filters[k] !== '' && filters[k] !== false && filters[k] != null);

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchBuildings = createAsyncThunk(
  'assessment/fetchBuildings',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== '' && v != null) params.set(k, v); });
      const res = await axios.get(`${BASE_URL}/api/assessment/buildings?${params}`, {
        headers: authHeaders(),
      });
      return res.data.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const fetchBuildingOutstanding = createAsyncThunk(
  'assessment/fetchBuildingOutstanding',
  async ({ objectId, sac_composite }, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/assessment/buildings/${objectId}/outstanding?sac_composite=${encodeURIComponent(sac_composite)}`,
        { headers: authHeaders() }
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const fetchOutstandingByFilters = createAsyncThunk(
  'assessment/fetchOutstandingByFilters',
  async ({ filters, sacnos = [] }, { rejectWithValue }) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/api/assessment/outstanding/filter`,
        { filters, sacnos },
        { headers: authHeaders() }
      );
      return res.data.data || {};
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const fetchL1Users = createAsyncThunk(
  'assessment/fetchL1Users',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/assessment/l1-users?department_id=45`, {
        headers: authHeaders(),
      });
      return res.data.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const fetchAnalytics = createAsyncThunk(
  'assessment/fetchAnalytics',
  async (ward = '', { rejectWithValue }) => {
    try {
      const params = ward ? `?ward=${encodeURIComponent(ward)}` : '';
      const res = await axios.get(`${BASE_URL}/api/assessment/analytics${params}`, {
        headers: authHeaders(),
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const fetchSchedules = createAsyncThunk(
  'assessment/fetchSchedules',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== '' && v != null) params.set(k, v); });
      const res = await axios.get(`${BASE_URL}/api/assessment/schedules?${params}`, {
        headers: authHeaders(),
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const createSchedule = createAsyncThunk(
  'assessment/createSchedule',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE_URL}/api/assessment/schedules`, payload, {
        headers: authHeaders(),
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

export const updateSchedule = createAsyncThunk(
  'assessment/updateSchedule',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${BASE_URL}/api/assessment/schedules/${id}`, updates, {
        headers: authHeaders(),
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialFilters = {
  ward: '', section: '', zone: '', locality: '',
  building_name: '', uid: '', sac: '',
  bld_class: '', sub_class: '', cons_type: '', road_name: '',
  floors_min: '', floors_max: '',
  outstanding_min: '', outstanding_max: '',
  assessment_year: '', taxpayer_category: '',
  repair_cess: false, assessment_expired: false,
};

const initialState = {
  // Buildings
  buildings:         [],
  buildingsLoading:  false,
  buildingsError:    null,

  // Selected building + its outstanding data
  selectedBuilding:       null,
  outstandingData:        null,   // single building outstanding
  outstandingLoading:     false,

  // Outstanding map for filter-driven queries: { composite_sac: {...} }
  outstandingFilterData:  {},
  outstandingFilterLoading: false,

  // Filters & search
  filters:           initialFilters,
  searchQuery:       '',
  activeQuickFilter: null,     // string label of active quick filter

  // Analytics
  analytics: {
    total_scheduled: 0,
    pending:         0,
    in_progress:     0,
    completed:       0,
    high_priority:   0,
    overdue:         0,
  },
  analyticsLoading:  false,

  // L1 Users
  l1Users:           [],
  l1UsersLoading:    false,

  // Schedules
  schedules:         [],
  scheduleMeta:      { total: 0, page: 1, limit: 20, totalPages: 1 },
  schedulesLoading:  false,
  createLoading:     false,
  createSuccess:     false,

  // UI
  showScheduleModal: false,
  activeTab:         'list',    // 'list' | 'map' | 'schedules'
};

// ─── Slice ─────────────────────────────────────────────────────────────────────

const assessmentSlice = createSlice({
  name: 'assessment',
  initialState,
  reducers: {
    setFilter(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.activeQuickFilter = null;
    },
    resetFilters(state) {
      state.filters = initialFilters;
      state.searchQuery = '';
      state.activeQuickFilter = null;
    },
    setSearchQuery(state, action) {
      state.searchQuery = action.payload;
    },
    setSelectedBuilding(state, action) {
      state.selectedBuilding = action.payload;
      state.outstandingData  = null;  // clear old outstanding data on new selection
    },
    clearSelectedBuilding(state) {
      state.selectedBuilding = null;
      state.outstandingData  = null;
    },
    setActiveQuickFilter(state, action) {
      state.activeQuickFilter = action.payload;
    },
    setShowScheduleModal(state, action) {
      state.showScheduleModal = action.payload;
      if (!action.payload) state.createSuccess = false;
    },
    setActiveTab(state, action) {
      state.activeTab = action.payload;
    },
    clearCreateSuccess(state) {
      state.createSuccess = false;
    },
  },

  extraReducers: (builder) => {
    // fetchBuildings
    builder
      .addCase(fetchBuildings.pending,   (s) => { s.buildingsLoading = true;  s.buildingsError = null; })
      .addCase(fetchBuildings.fulfilled, (s, a) => { s.buildingsLoading = false; s.buildings = a.payload; })
      .addCase(fetchBuildings.rejected,  (s, a) => { s.buildingsLoading = false; s.buildingsError = a.payload; });

    // fetchBuildingOutstanding
    builder
      .addCase(fetchBuildingOutstanding.pending,   (s) => { s.outstandingLoading = true; })
      .addCase(fetchBuildingOutstanding.fulfilled, (s, a) => { s.outstandingLoading = false; s.outstandingData = a.payload; })
      .addCase(fetchBuildingOutstanding.rejected,  (s) => { s.outstandingLoading = false; });

    // fetchOutstandingByFilters
    builder
      .addCase(fetchOutstandingByFilters.pending,   (s) => { s.outstandingFilterLoading = true; })
      .addCase(fetchOutstandingByFilters.fulfilled, (s, a) => { s.outstandingFilterLoading = false; s.outstandingFilterData = a.payload; })
      .addCase(fetchOutstandingByFilters.rejected,  (s) => { s.outstandingFilterLoading = false; });

    // fetchL1Users
    builder
      .addCase(fetchL1Users.pending,   (s) => { s.l1UsersLoading = true; })
      .addCase(fetchL1Users.fulfilled, (s, a) => { s.l1UsersLoading = false; s.l1Users = a.payload; })
      .addCase(fetchL1Users.rejected,  (s) => { s.l1UsersLoading = false; });

    // fetchAnalytics
    builder
      .addCase(fetchAnalytics.pending,   (s) => { s.analyticsLoading = true; })
      .addCase(fetchAnalytics.fulfilled, (s, a) => { s.analyticsLoading = false; s.analytics = a.payload; })
      .addCase(fetchAnalytics.rejected,  (s) => { s.analyticsLoading = false; });

    // fetchSchedules
    builder
      .addCase(fetchSchedules.pending,   (s) => { s.schedulesLoading = true; })
      .addCase(fetchSchedules.fulfilled, (s, a) => {
        s.schedulesLoading = false;
        s.schedules   = a.payload.data || [];
        s.scheduleMeta = a.payload.meta || s.scheduleMeta;
      })
      .addCase(fetchSchedules.rejected,  (s) => { s.schedulesLoading = false; });

    // createSchedule
    builder
      .addCase(createSchedule.pending,   (s) => { s.createLoading = true;  s.createSuccess = false; })
      .addCase(createSchedule.fulfilled, (s, a) => {
        s.createLoading  = false;
        s.createSuccess  = true;
        // Prepend new schedule to list
        if (a.payload.data) s.schedules = [a.payload.data, ...s.schedules];
      })
      .addCase(createSchedule.rejected,  (s) => { s.createLoading = false; s.createSuccess = false; });

    // updateSchedule
    builder
      .addCase(updateSchedule.fulfilled, (s, a) => {
        const idx = s.schedules.findIndex(sc => sc.id === a.payload?.id);
        if (idx !== -1) s.schedules[idx] = a.payload;
      });
  },
});

export const {
  setFilter, resetFilters, setSearchQuery,
  setSelectedBuilding, clearSelectedBuilding,
  setActiveQuickFilter, setShowScheduleModal,
  setActiveTab, clearCreateSuccess,
} = assessmentSlice.actions;

export default assessmentSlice.reducer;

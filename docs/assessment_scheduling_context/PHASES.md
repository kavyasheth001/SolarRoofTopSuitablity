# PHASES.md — Implementation Progress Tracker
**Assessment Intelligence & Scheduling Module**
**Last Updated:** 2026-08-01 (v1.1 — architectural review incorporated)

---

## ✅ Phase 0: Design & Documentation (COMPLETE)
- [x] PRD.md — Product requirements
- [x] ARCHITECTURE.md — Full system architecture
- [x] RULES.md — Engineering rules
- [x] PHASES.md — This file
- [x] MEMORY.md — Engineering knowledge
- [x] DECISIONS.md — Architecture decision log
- [x] Project study: DVR module, Notification service, Firebase, Redux, GIS Map
- [x] Implementation plan presented to stakeholder

---

## 🔄 Phase 1: Core Module (IN PROGRESS)

### Phase 1.1 — Database (2 tables — assessment_assignment eliminated per ADR-010)
- [ ] Create `assessment_schedules` table
  - [ ] Business columns (uid, sac, name, ward, address)
  - [ ] GIS columns: `gis_layer_id`, `gis_global_id`, `gis_object_id` (ADR-011)
  - [ ] Scheduling columns: date, priority, remarks, status
  - [ ] All 6 status codes in CHECK constraint (ADR-013): SCHEDULED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED, RESCHEDULED
  - [ ] Assignment columns inline: `assigned_to`, `assigned_by`, `assigned_at` (ADR-010)
  - [ ] Notification tracking: `notification_sent`, `notification_id`
  - [ ] Indexes: ward, assigned_to, status, date, gis_object_id
- [ ] Create `assessment_history` table
  - [ ] Reassignment columns: `from_assigned_to`, `to_assigned_to`
  - [ ] Status transition columns: `from_status`, `to_status`
  - [ ] Flexible `metadata` JSONB for rescheduling context
  - [ ] Indexes: schedule_id, action_at

### Phase 1.2 — Backend
- [ ] `src/constants/assessmentConstants.js` — ASSESSMENT_STATUS, ASSESSMENT_PRIORITY, notification type
- [ ] `routes/assessmentRoutes.js`
- [ ] `controllers/assessmentController.js` (thin — delegates to service)
- [ ] `models/assessmentModel.js`
- [ ] `services/assessmentService.js`
  - [ ] `queryBuildings(filters)` — Building Layer only (no Outstanding)
  - [ ] `fetchOutstandingForBuilding(sacno)` — single building
  - [ ] `fetchOutstandingBatch(sacnos, outstandingFilters)` — filter-driven batch
  - [ ] `getL1UsersWithWorkload()` — 4-metric SQL aggregation (ADR-012)
  - [ ] `computeAnalytics(filters)` — KPI dashboard counts
  - [ ] `createSchedule(data, userId)` — INSERT + history + notify
- [ ] Register routes in `app.js` (single line addition)
- [ ] API: GET /api/assessment/buildings (Building Layer only)
- [ ] API: GET /api/assessment/buildings/:objectId/outstanding (lazy single-building load)
- [ ] API: POST /api/assessment/outstanding/batch (filter-triggered batch)
- [ ] API: GET /api/assessment/l1-users (with 4-metric workload stats)
- [ ] API: GET /api/assessment/analytics
- [ ] API: POST /api/assessment/schedules (+ history insert + FCM notification)
- [ ] API: GET /api/assessment/schedules
- [ ] API: PUT /api/assessment/schedules/:id
- [ ] API: GET /api/assessment/schedules/:id

### Phase 1.3 — Frontend Constants + Priority Engine
- [ ] `src/constants/assessmentConstants.js`
  - [ ] `ASSESSMENT_STATUS` object
  - [ ] `ASSESSMENT_PRIORITY` object
  - [ ] `NOTIFICATION_TYPES.ASSESSMENT_ASSIGNED`
  - [ ] `OUTSTANDING_FILTER_KEYS` (list of filter keys that trigger Outstanding API)
- [ ] `src/utils/assessmentPriorityEngine.js`
  - [ ] `computePriorityScore(buildingAttrs, outstandingData)` — returns numeric score
  - [ ] `getPriorityLevel(score)` — returns 'HIGH' | 'MEDIUM' | 'LOW'
  - [ ] `PRIORITY_RULES` — externalized scoring table
  - [ ] `hasOutstandingFilters(filters)` — utility to decide if Outstanding API is needed

### Phase 1.4 — Frontend API Layer
- [ ] `src/api/assessmentApi.js`
  - [ ] `fetchBuildings(filters)`
  - [ ] `fetchOutstandingData(sacnos)`
  - [ ] `fetchL1Users()`
  - [ ] `fetchAnalytics(filters)`
  - [ ] `createSchedule(payload)`
  - [ ] `fetchSchedules(filters)`
  - [ ] `updateSchedule(id, payload)`

### Phase 1.5 — Redux State
- [ ] `store/features/assessment/assessmentSlice.js`
  - [ ] State shape
  - [ ] Async thunks
  - [ ] Filter reducers
  - [ ] Selection reducers
  - [ ] Analytics reducers
  - [ ] Register in store.js

### Phase 1.6 — Frontend Components
- [ ] `components/Assessment/AssessmentAnalyticsCards.jsx`
- [ ] `components/Assessment/AssessmentSearch.jsx`
- [ ] `components/Assessment/AssessmentFilters.jsx`
- [ ] `components/Assessment/AssessmentQuickFilters.jsx`
- [ ] `components/Assessment/AssessmentMap.jsx`
- [ ] `components/Assessment/AssessmentBuildingList.jsx`
- [ ] `components/Assessment/AssessmentBuildingCard.jsx`
- [ ] `components/Assessment/AssessmentDetails.jsx`
- [ ] `components/Assessment/ScheduleAssessmentModal.jsx`
- [ ] `components/Assessment/AssessmentL1Selector.jsx`

### Phase 1.7 — Dashboard Page
- [ ] `pages/Assessment/AssessmentDashboard.jsx`
- [ ] Add route `/assessment-scheduling` in `App.jsx`
- [ ] Add sidebar link (if applicable)
- [ ] CSS: `src/css/assessment.css`

### Phase 1.8 — Integration Testing
- [ ] Map ↔ List synchronization
- [ ] Filter → Analytics card update
- [ ] Quick filter application
- [ ] Building selection → Detail panel
- [ ] Schedule modal → DB insert → FCM notification
- [ ] End-to-end: L3 assigns → L1 receives notification

---

## 📋 Phase 2 (Future)
- Assessment Form (field data entry by L1)
- Completion Workflow
- Reschedule with history
- L1 Mobile-friendly view

## 📋 Phase 3 (Future)
- Reports
- Revenue Impact Analytics
- Department-wide tracking dashboard

## 📋 Phase 4 (Future)
- Performance Dashboard
- SLA Monitoring
- Integration with MCGM billing systems

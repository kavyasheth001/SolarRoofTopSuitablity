# ARCHITECTURE.md — Assessment Intelligence & Scheduling Module
**Version:** 1.1 | **Date:** 2026-08-01 | **Updated:** 2026-08-01 (architectural review)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                             │
│                                                                  │
│  AssessmentDashboard                                             │
│    ├── AssessmentAnalyticsCards                                  │
│    ├── AssessmentFilters + AssessmentSearch                      │
│    ├── AssessmentQuickFilters                                    │
│    ├── AssessmentMap (ArcGIS SDK)                                │
│    ├── AssessmentBuildingList                                    │
│    │     └── AssessmentBuildingCard                              │
│    ├── AssessmentDetails                                         │
│    └── ScheduleAssessmentModal                                   │
│                                                                  │
│  Redux Store: assessmentSlice                                    │
│  API Layer:   assessmentApi.js                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS (JWT Bearer)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js / Express)                   │
│                                                                  │
│  /api/assessment/buildings       ← Building Layer proxy          │
│  /api/assessment/outstanding     ← Outstanding API proxy+join    │
│  /api/assessment/schedules       ← CRUD scheduling               │
│  /api/assessment/l1-users        ← L1 user list with workload    │
│  /api/assessment/analytics       ← Aggregated analytics          │
│                                                                  │
│  Controllers → Services → Models                                 │
│  Notification → notificationService (existing, reused)          │
└───────┬────────────────────────────┬────────────────────────────┘
        │                            │
        ▼                            ▼
┌───────────────┐      ┌────────────────────────────────────────┐
│  PostgreSQL   │      │  ArcGIS REST APIs                      │
│               │      │                                        │
│  assessment_  │      │  Building Layer (MapServer)             │
│  schedules    │      │  /MCGM_UID/MapServer/<layerId>/query   │
│               │      │                                        │
│  assessment_  │      │  Outstanding API                       │
│  assignment   │      │  /MCGM_UID/Data_Sharing/MapServer/1    │
│               │      │                                        │
│  assessment_  │      │  (Frontend NEVER calls these directly) │
│  history      │      └────────────────────────────────────────┘
│               │
│  (existing:)  │      ┌────────────────────────────────────────┐
│  notifications│      │  Firebase FCM (HTTP v1)                 │
│  user_devices │      │  via existing firebaseService.js        │
│  userss       │      └────────────────────────────────────────┘
└───────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Component Tree

```
pages/Assessment/
  AssessmentDashboard.jsx          ← Root page component (route: /assessment-scheduling)

components/Assessment/
  AssessmentAnalyticsCards.jsx     ← 5 KPI cards
  AssessmentFilters.jsx            ← Enterprise filter panel
  AssessmentSearch.jsx             ← Global search bar
  AssessmentQuickFilters.jsx       ← Smart quick list buttons
  AssessmentMap.jsx                ← ArcGIS map panel
  AssessmentBuildingList.jsx       ← Scrollable building list
  AssessmentBuildingCard.jsx       ← Single building row card
  AssessmentDetails.jsx            ← Selected building details panel
  ScheduleAssessmentModal.jsx      ← Schedule + assign modal
  AssessmentL1Selector.jsx         ← L1 user card selector
```

### 2.2 Redux Architecture

```
store/features/assessment/
  assessmentSlice.js               ← State, reducers, async thunks
```

State Shape:
```javascript
{
  assessment: {
    buildings: [],                 // Current filtered building list
    selectedBuilding: null,        // Currently selected building
    outstandingData: {},           // SAC → outstanding map
    filters: {
      ward: '', section: '', zone: '', locality: '',
      buildingName: '', uid: '', sacNumber: '',
      outstandingMin: '', outstandingMax: '',
      assessmentYear: '', assessmentExpired: false,
      taxpayerCategory: '', repairCess: false,
      floors: '', buildingType: '',
    },
    searchQuery: '',
    activeQuickFilter: null,
    analytics: {
      total: 0, needAssessment: 0, scheduled: 0,
      completed: 0, highPriority: 0
    },
    l1Users: [],
    schedules: [],
    loading: false,
    error: null
  }
}
```

### 2.3 API Layer

```
src/api/assessmentApi.js           ← All API calls for assessment module
```

Functions:
- `fetchBuildings(filters)` → GET /api/assessment/buildings
- `fetchOutstandingData(sacnos)` → POST /api/assessment/outstanding
- `fetchL1Users()` → GET /api/assessment/l1-users
- `fetchAnalytics(filters)` → GET /api/assessment/analytics
- `createSchedule(payload)` → POST /api/assessment/schedules
- `updateSchedule(id, payload)` → PUT /api/assessment/schedules/:id
- `fetchSchedules(filters)` → GET /api/assessment/schedules

### 2.4 GIS Map Integration

- Reuse Building Layer identification patterns from `PropertyOutstanding.jsx`
- Use `queryAllFeatures()` pagination pattern (start/num)
- Graphics layer for highlights
- Blink effect on selected building
- `view.goTo()` for zoom-to-building

### 2.5 Priority Engine

```
src/utils/assessmentPriorityEngine.js
```

Pure function — no side effects, no React dependencies:
```javascript
export function computePriorityScore(buildingAttrs, outstandingData) { ... }
export function getPriorityLevel(score) { ... } // 'HIGH' | 'MEDIUM' | 'LOW'
```

---

## 3. Backend Architecture

### 3.1 Folder Structure

```
Server_mcgm/
  routes/
    assessmentRoutes.js
  controllers/
    assessmentController.js
  models/
    assessmentModel.js
  services/
    assessmentService.js           ← Outstanding API proxy, data join
    (reuses) notificationService.js
```

### 3.2 Controller Pattern (thin)

```javascript
// assessmentController.js — thin controller
exports.getBuildings = async (req, res) => {
  const result = await assessmentService.queryBuildings(req.query);
  res.json(result);
};
```

### 3.3 Service Pattern (thick)

```javascript
// assessmentService.js — business logic lives here
async queryBuildings(filters) { ... }
async fetchOutstanding(sacnos) { ... }
async joinBuildingWithOutstanding(buildings, outstanding) { ... }
async getL1UsersWithWorkload() { ... }
async computeAnalytics(filters) { ... }
async createSchedule(data, userId) { ... }
```

### 3.4 Outstanding API Integration

- Service fetches Outstanding API with `where` clause filters (SACNO IN (...))
- Never fetches without a filter (respects 2000-record limit)
- Batches SACNO requests in groups of 50
- Joins results: Building Layer LEFT JOIN Outstanding API on SACNO
- Only merge at request time; never persist the join

---

## 4. Database Design

> **Design Note (v1.1):** `assessment_assignment` table has been eliminated. Since every schedule record in Phase 1 has exactly one L1 assignee, assignment columns are stored directly in `assessment_schedules`. Reassignment history is captured via `assessment_history`. This keeps the schema simple without losing any information.

### Table: assessment_schedules  *(2 tables total — down from 3)*

```sql
CREATE TABLE assessment_schedules (
  id                SERIAL PRIMARY KEY,

  -- Building identifiers (GIS + business)
  building_uid      VARCHAR(100),
  building_sac      VARCHAR(50),
  building_name     VARCHAR(500),
  building_ward     VARCHAR(100),
  building_address  TEXT,

  -- GIS feature references (enables direct layer lookup without re-querying)
  gis_layer_id      VARCHAR(100),          -- ArcGIS layer ID / service URL
  gis_global_id     VARCHAR(100),          -- GlobalID of the building feature
  gis_object_id     INTEGER,               -- ObjectID of the building feature

  -- Scheduling
  assessment_date   DATE NOT NULL,
  priority          VARCHAR(10) NOT NULL
                    CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  remarks           TEXT,

  -- Status (all phases defined upfront; Phase 1 only uses SCHEDULED)
  status            VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
                    CHECK (status IN (
                      'SCHEDULED',    -- Phase 1: schedule created, L1 notified
                      'ACCEPTED',     -- Phase 2: L1 acknowledges assignment
                      'IN_PROGRESS',  -- Phase 2: L1 has started the assessment
                      'COMPLETED',    -- Phase 2: assessment finished
                      'CANCELLED',    -- Any phase: schedule cancelled by L3
                      'RESCHEDULED'   -- Any phase: rescheduled (history tracks old date)
                    )),

  -- Assignment (inline — no separate table needed)
  assigned_to       INTEGER REFERENCES userss(id),   -- L1 user
  assigned_by       INTEGER REFERENCES userss(id),   -- L3 user who assigned
  assigned_at       TIMESTAMPTZ,

  -- Notification tracking
  notification_sent    BOOLEAN DEFAULT FALSE,
  notification_id      INTEGER REFERENCES notifications(id),

  -- Scheduling metadata
  scheduled_by      INTEGER REFERENCES userss(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assessment_schedules_ward ON assessment_schedules(building_ward);
CREATE INDEX idx_assessment_schedules_assigned_to ON assessment_schedules(assigned_to);
CREATE INDEX idx_assessment_schedules_status ON assessment_schedules(status);
CREATE INDEX idx_assessment_schedules_date ON assessment_schedules(assessment_date);
CREATE INDEX idx_assessment_schedules_gis_object ON assessment_schedules(gis_object_id);
```

### Table: assessment_history

```sql
CREATE TABLE assessment_history (
  id             SERIAL PRIMARY KEY,
  schedule_id    INTEGER REFERENCES assessment_schedules(id) ON DELETE CASCADE,

  -- What happened
  action         VARCHAR(50) NOT NULL,
  -- Examples: 'CREATED', 'ASSIGNED', 'REASSIGNED', 'STATUS_CHANGED',
  --           'RESCHEDULED', 'CANCELLED', 'NOTE_ADDED'

  action_by      INTEGER REFERENCES userss(id),
  action_at      TIMESTAMPTZ DEFAULT NOW(),

  -- State transition
  from_status    VARCHAR(20),
  to_status      VARCHAR(20),

  -- For reassignment: who was old/new assignee
  from_assigned_to INTEGER REFERENCES userss(id),
  to_assigned_to   INTEGER REFERENCES userss(id),

  comment        TEXT,
  metadata       JSONB      -- Flexible: store old assessment_date on reschedule, etc.
);

CREATE INDEX idx_assessment_history_schedule ON assessment_history(schedule_id);
CREATE INDEX idx_assessment_history_action_at ON assessment_history(action_at);
```

---

## 5. API Design

### Endpoint Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/assessment/buildings | verifyToken | Building Layer only — no Outstanding data |
| GET | /api/assessment/buildings/:objectId/outstanding | verifyToken | Outstanding data for ONE selected building |
| POST | /api/assessment/outstanding/batch | verifyToken | Outstanding data for filtered building set |
| GET | /api/assessment/l1-users | verifyToken | L1 users with full workload stats |
| GET | /api/assessment/analytics | verifyToken | Dashboard KPI analytics |
| GET | /api/assessment/schedules | verifyToken | List schedules with filters |
| POST | /api/assessment/schedules | verifyToken | Create schedule + assign + notify |
| PUT | /api/assessment/schedules/:id | verifyToken | Update / reschedule |
| GET | /api/assessment/schedules/:id | verifyToken | Single schedule detail |

### Outstanding API — Lazy Load Strategy

> **Design Rule (v1.1):** The Outstanding Assessment API is expensive and limited to 2000 records per call. It must NOT be called for every building list or map request.

```
WHEN to call Outstanding API:
  ✅ User selects a specific building → load its outstanding data
  ✅ User applies outstanding-related filters:
        (outstandingMin, outstandingMax, assessmentExpired, assessmentYear,
         taxpayerCategory, repairCess)
  ✅ Quick Filters: "High Outstanding", "Assessment Expired", etc.

WHEN NOT to call Outstanding API:
  ❌ Initial page load
  ❌ Map pan/zoom
  ❌ Location filters only (ward, zone, section)
  ❌ Building attribute filters only (name, uid, floors)
```

### GET /api/assessment/buildings

Query params:
- `ward`, `section`, `zone`, `locality`
- `building_name`, `uid`, `sac`
- `floors_min`, `floors_max`
- `limit`, `offset`

Response:
```json
{
  "success": true,
  "data": [
    { "uid": "...", "sacno": "...", "name": "...", "ward": "...", "floors": 5, ... }
  ],
  "meta": { "total": 1250, "limit": 50, "offset": 0 }
}
```

### POST /api/assessment/outstanding

Body: `{ "sacnos": ["SACNO1", "SACNO2", ...] }`

Response:
```json
{
  "success": true,
  "data": {
    "SACNO1": { "outstanding_amount": 500000, "assessment_year": 2022, ... }
  }
}
```

### POST /api/assessment/schedules

Body:
```json
{
  "building_uid": "...",
  "building_sac": "...",
  "building_name": "...",
  "building_ward": "...",
  "assessment_date": "2026-08-15",
  "priority": "HIGH",
  "remarks": "...",
  "assigned_to": 42
}
```

---

## 6. Notification Flow

```
L3 Submits Schedule → assessmentController.createSchedule()
  → assessmentService.createSchedule(data, userId)
      → assessmentModel.insertSchedule(data)         ← single INSERT, no separate assignment table
      → assessmentModel.insertHistory(scheduleId, 'CREATED', ...)
      → notificationService.notifyUser(
            assignedTo,
            'ASSESSMENT_ASSIGNED',                   ← new notification type constant
            'New Assessment Assigned',
            `Building ${buildingName} has been assigned for assessment on ${date}`,
            {
              schedule_id: String(scheduleId),
              building_name: buildingName,
              building_ward: ward,
              assessment_date: date,
              priority: priority,
              gis_object_id: String(objectId)        ← GIS reference in payload
            },
            assignedById,
            'USER'
          )
  → response: { success: true, scheduleId, notificationStatus }
```

> **Key points:**
> - Notification type: `'ASSESSMENT_ASSIGNED'` (new type constant, no code changes to notificationService.js)
> - Stored in existing `notifications` + `notification_deliveries` tables
> - GIS object_id included in data payload for future deep-link navigation
> - If L1 has no active devices → notification status = `MISSED` (existing behavior, no change needed)

---

## 7. Scheduling Workflow (Phase 1)

```
L3 Browses Map/List
  → Applies Filters (Ward, SAC, Outstanding Range, etc.)
  → System computes Priority Score for each building
  → L3 Selects a Building
  → System shows Building Details + Outstanding Info
  → L3 Opens "Schedule Assessment" modal
  → L3 Fills: Date, Priority, Remarks
  → L3 Selects L1 User (sees workload info)
  → L3 Submits
  → Backend: INSERT assessment_schedules → INSERT assessment_assignment → NOTIFY L1
  → L1 Receives FCM Push Notification
  → Phase 1 Ends
```

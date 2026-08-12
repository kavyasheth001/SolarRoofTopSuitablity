# RULES.md — Engineering Rules
**Assessment Intelligence & Scheduling Module**
**Version:** 1.1 | **Date:** 2026-08-01 (updated: architectural review)

---

## 🔒 Inviolable Rules

### R-01: DO NOT MODIFY DVR
- Do NOT touch `projects1` table
- Do NOT touch `project_assignments`, `project_actions`, `project_statuses` tables
- Do NOT modify `projectsController.js`, `projectsModel.js`, `projectsRoutes.js`
- Do NOT modify `ProjectTable.jsx`, `ProjectsTableWithModals.jsx`
- DVR module is read-only reference

### R-02: Module Independence
- Assessment module has its OWN: routes, controllers, models, services
- Assessment module uses its OWN: DB tables (assessment_schedules, assessment_assignment, assessment_history)
- Assessment frontend is in its OWN: pages/Assessment/ and components/Assessment/ directories
- Assessment Redux state is in its OWN: store/features/assessment/assessmentSlice.js
- No cross-module imports that create coupling

### R-03: Outstanding API — Backend Only
- Frontend MUST NEVER call the Outstanding API directly
- Correct: React → Backend `/api/assessment/outstanding` → Outstanding API
- Wrong: React → Outstanding API (BLOCKED by design)
- Reason: Security, business logic centralization, caching capability

### R-04: Controllers Must Stay Thin
```javascript
// ✅ CORRECT
exports.createSchedule = async (req, res) => {
  const result = await assessmentService.createSchedule(req.body, req.user.id);
  res.json(result);
};

// ❌ WRONG — business logic in controller
exports.createSchedule = async (req, res) => {
  const sacnos = req.body.sacnos;
  const response = await fetch('https://testprsrvgisapp.mcgm.gov.in/...');
  // ... lots of logic ...
};
```

### R-05: Business Logic Lives in Services
- `assessmentService.js` owns all business logic:
  - Outstanding API fetching
  - Data joining (Building Layer LEFT JOIN Outstanding)
  - Priority scoring
  - Analytics computation
  - L1 workload calculation

### R-06: Priority Engine is Pure and Externalized
- Priority scoring MUST be in `src/utils/assessmentPriorityEngine.js`
- Must be a pure function: no React, no API calls, no side effects
- Must be reusable from both components and future backend scoring

### R-07: Reuse Existing Infrastructure — Do Not Modify It
| Existing | Reuse How |
|---|---|
| `notificationService.notifyUser()` | Call it from assessmentService |
| `firebaseService.js` | Already used by notificationService; no direct access needed |
| `authMiddleware.verifyToken` | Apply to all assessment routes |
| `db.js` (pg Pool) | Import `require('../db')` |
| ArcGIS `queryAllFeatures` pattern | Port the pagination pattern to AssessmentMap |
| `view.goTo()`, `GraphicsLayer`, `Graphic` | Use in AssessmentMap.jsx |

### R-08: Authentication
- All `/api/assessment/*` routes MUST use `verifyToken` middleware
- Role-based access: L3 users (designation_level = 3) can schedule; L1 users (designation_level = 1) can view their assignments

### R-09: Outstanding API Batching
- Max batch size: 50 SACNOs per request
- Max concurrency: 6 parallel requests
- Never fetch without a filter (no `where=1=1`)
- Always use `resultRecordCount=2000` and handle `exceededTransferLimit`

### R-10: Data Join is Runtime-Only
- NEVER persist the join of Building Layer + Outstanding API
- NEVER create a combined permanent table
- Merge only during request processing, in `assessmentService.js`

---

## 📐 Code Quality Rules

### R-11: No Magic Numbers
```javascript
// ✅ CORRECT
const BATCH_SIZE = 50;
const MAX_CONCURRENCY = 6;

// ❌ WRONG
for (let i = 0; i < sacnos.length; i += 50) { ... }
```

### R-12: Error Handling
- All async operations must have try/catch
- Backend: return `{ success: false, error: message }` with appropriate HTTP status
- Frontend: dispatch error to assessmentSlice, show toast notification

### R-13: Logging
- Backend: use `console.log('[AssessmentService]', ...)` prefix for easy filtering
- Debug logs: use a debug flag pattern (see PropertyOutstanding.jsx `dbg` pattern)

### R-14: API Response Shape
All API responses must follow:
```json
{ "success": true, "data": {...}, "meta": { "total": 0 } }
// or
{ "success": false, "error": "message" }
```

### R-16: Outstanding API — Lazy Load Only
The Outstanding Assessment API MUST NOT be called on initial page load, map movement, or for location/building-only filter changes.

```javascript
// ✅ CORRECT — call outstanding only when needed
const needsOutstanding = hasOutstandingFilters(filters) || buildingSelected;
if (needsOutstanding) dispatch(fetchOutstandingData(sacnos));

// ❌ WRONG — calling on every list refresh
useEffect(() => { dispatch(fetchAllOutstanding()); }, [buildings]);
```

Conditions requiring Outstanding API:
- Building selected (detail panel)
- Filter: outstanding amount range, assessment year, assessment expired, taxpayer category, repair cess
- Quick Filters: High Outstanding, Assessment Expired, etc.

### R-17: GIS Identifiers Are Required at Schedule Creation
When creating a schedule, `gis_layer_id`, `gis_global_id`, and `gis_object_id` MUST be passed and stored. These come from the Building Layer query response. Never allow a schedule to be created without GIS identifiers.

### R-18: Status Codes Are Fixed — Use Constants
Never hardcode status strings. Use a shared constants file:
```javascript
// In shared constants (both frontend and backend readable pattern)
const ASSESSMENT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  RESCHEDULED: 'RESCHEDULED',
};
```


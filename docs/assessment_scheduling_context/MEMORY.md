# MEMORY.md — Engineering Knowledge
**Assessment Intelligence & Scheduling Module**
**Last Updated:** 2026-08-01 (v1.1 — architectural review incorporated)

---

## Project Structure Discoveries

### Frontend Root
- `c:\Workarea_Kavya\MCGM_live_with_AD\MCGM Code\Frontend_mcgm\src\`
- Framework: React + Vite
- Git branch: `hemanshuv6`

### Backend Root
- `c:\Workarea_Kavya\MCGM_live_with_AD\MCGM Code\Server_mcgm\`
- Framework: Express.js (Node.js)
- DB: PostgreSQL via `pg` Pool (`db.js`)
- Config: `.env` lives in `c:\Workarea_Kavya\MCGM_live_with_AD\MCGM Code\config\.env`

### Key Existing Files (DO NOT MODIFY)
| File | Purpose |
|---|---|
| `services/notificationService.js` | Multi-device FCM notification sender |
| `services/firebaseService.js` | Firebase HTTP v1 API wrapper |
| `middlewares/authMiddleware.js` | `verifyToken` and `authorize` |
| `db.js` | PostgreSQL pool |
| `app.js` | Express app + route registration |
| `store/features/department/departmentSlice.js` | Department/tool Redux pattern |
| `components/Tools/PropertyOutstanding.jsx` | Outstanding API integration pattern |

---

## Outstanding API Discoveries

### Endpoint
```
https://testprsrvgisapp.mcgm.gov.in/server/rest/services/MCGM_UID/Data_Sharing/MapServer/1/query
```

### Query Pattern (from PropertyOutstanding.jsx)
```javascript
const body = new URLSearchParams({
  where: `SACNO IN (${sacnos.map(s => `'${s}'`).join(',')})`,
  outFields: 'SACNO,MSR,OUTSTANDING_AMOUNT,WARD,BUILDING_NAME,PROPADDR,SECTION',
  returnGeometry: 'false',
  f: 'json',
});
// POST request, Content-Type: application/x-www-form-urlencoded
```

### SACNO Format Discovery (from PropertyOutstanding.jsx)
- Building Layer stores 15-char composite codes: `sac_number` and `sac_number_add`
- Last 4 chars of composite = MSR (sub-unit)
- Bare SACNO = first 11 chars of composite
- Join key: `SACNO + MSR` = 15-char composite

### Batch Strategy (from PropertyOutstanding.jsx)
```
BATCH_SIZE = 50 SACNOs per request
CONCURRENCY = 6 parallel batches
Promise.allSettled() — continue even if some batches fail
```

### ⚠️ Lazy Load Rule (v1.1)
```
Outstanding API MUST NOT be called on every building list request.

Call ONLY when:
  - A specific building is selected (detail view)
  - An outstanding-related filter is active (amount range, year, expired, taxpayer category, repair cess)
  - A Quick Filter that requires outstanding data is clicked

DO NOT call for:
  - Initial page load
  - Map pan/zoom
  - Location filters (ward, zone, section, locality)
  - Building attribute filters (name, uid, floors)
```

---

## Building Layer Discoveries

### Layer Title: `'Building'`
```javascript
// Finding building layer (from PropertyOutstanding.jsx):
if (layer.type === 'feature' && layer.title === 'Building') { return layer; }
```

### Key Attributes (from PropertyOutstanding.jsx)
```
sac_number          (15-char composite, primary)
sac_number_add      (comma-separated additional composites)
name                (building name)
ward_name           (ward)
address
cts_no
flat_count
no_floors
sub_class
locality
zone_id             (1=City, 2=Eastern Suburbs, 3=Western Suburbs)
```

### Pagination (from PropertyOutstanding.jsx `queryAllFeatures`)
```javascript
const pageSize = layer.capabilities?.query?.maxRecordCount || 2000;
// Loop with q.start / q.num
```

---

## Database Design Decisions (v1.1)

### assessment_assignment table: ELIMINATED
- Every schedule has exactly 1 L1 assignee (1:1 in Phase 1)
- Assignment columns merged directly into `assessment_schedules`:
  - `assigned_to`, `assigned_by`, `assigned_at`
  - `notification_sent`, `notification_id`
- Reassignments tracked via `assessment_history` (`from_assigned_to`, `to_assigned_to`)

### GIS Identifiers stored in assessment_schedules
Three columns added to every schedule record:
```
gis_layer_id   VARCHAR(100)   — ArcGIS service layer ID
gis_global_id  VARCHAR(100)   — Globally unique feature identifier
gis_object_id  INTEGER        — ObjectID within the layer (indexed)
```

### Status Codes (all 6 defined upfront in CHECK constraint)
```
SCHEDULED   ← Phase 1 only writes this
ACCEPTED    ← Phase 2
IN_PROGRESS ← Phase 2
COMPLETED   ← Phase 2
CANCELLED   ← Any phase
RESCHEDULED ← Any phase
```

### L1 Workload SQL (computed at query time)
```sql
SELECT
  u.id, u.name,
  COUNT(*) FILTER (WHERE s.status IN ('SCHEDULED','ACCEPTED','IN_PROGRESS'))
    AS pending_assignments,
  COUNT(*) FILTER (WHERE s.assigned_at::date = CURRENT_DATE)
    AS today_assigned,
  COUNT(*) FILTER (
    WHERE s.status = 'COMPLETED' AND s.updated_at::date = CURRENT_DATE
  ) AS today_completed,
  COUNT(*) FILTER (
    WHERE s.assessment_date < CURRENT_DATE
      AND s.status IN ('SCHEDULED','ACCEPTED','IN_PROGRESS')
  ) AS overdue_assignments
FROM userss u
LEFT JOIN assessment_schedules s ON s.assigned_to = u.id
WHERE u.designation_level = 1
  AND u.department = <assessment_dept_id>
  AND u.is_active = true
GROUP BY u.id, u.name;
```

---

## Notification Service Decisions

### Using Existing notificationService (unchanged)
- Import: `const notificationService = require('../services/notificationService')`
- Call: `notificationService.notifyUser(userId, type, title, body, data, senderId, senderType)`
- `data` values MUST be stringifiable (they get FCM-stringified inside the service)
- The service handles: DB insert, multi-device broadcast, token invalidation
- **Zero modifications** to `notificationService.js` itself

### Notification Type: `'ASSESSMENT_ASSIGNED'`
- Follows DVR pattern of `'DVR_STATUS_UPDATE'`
- Data payload includes `gis_object_id` for future deep-link navigation
- Future types: `'ASSESSMENT_REASSIGNED'`, `'ASSESSMENT_COMPLETED'`, `'ASSESSMENT_OVERDUE'`

---

## Redux Pattern (from departmentSlice.js)

```javascript
import { createSlice } from '@reduxjs/toolkit';
// For async: use createAsyncThunk from '@reduxjs/toolkit'
// State: flat, normalized
// Store registration: store.js → configureStore({ reducer: { ... } })
```

## Auth Middleware Pattern

```javascript
const { verifyToken } = require('../middlewares/authMiddleware');
router.get('/route', verifyToken, controller.method);
// req.user = { id, role, users_level, department, permissions, ... }
```

## JWT Token Claims Available
```
req.user.id              → user ID
req.user.role            → role name string
req.user.users_level     → numeric role level
req.user.department      → department ID
req.user.permissions     → flat array of permissions
```

---

## Technical Debt / Assumptions

### Assumption 1: Assessment L1/L3 Role Identification
- Based on `designation_level` column in `userss` table
- L1 = designation_level 1, L3 = designation_level 3
- Same pattern used in DVR (projects controller uses designation_level = 2 for L2, etc.)

### Assumption 2: Building Layer URL
- The backend assessment service will call the Building Layer via ArcGIS REST API
- Same base URL as PropertyOutstanding: `testprsrvgisapp.mcgm.gov.in`
- Layer ID for Building Layer: To be confirmed during implementation (PropertyOutstanding.jsx finds it by title `'Building'`, not hardcoded URL)

### Assumption 3: Frontend Outstanding Data Fetch
- Frontend will batch-request SAC numbers after getting building list
- Buildings without SACNO will still appear in the list, scored differently

### Assumption 4: Department Filter for L1 Users
- L1 users for selection will be filtered by Assessment department
- Query: `WHERE designation_level = 1 AND department = <assessment_dept_id>`

---

## Future Improvements
- Redis caching layer for Outstanding API responses (TTL: 1 hour)
- WebSocket or SSE for real-time assignment updates to L1
- Spatial indexing improvements for large building sets
- Export functionality (Excel/PDF) for scheduled assessments

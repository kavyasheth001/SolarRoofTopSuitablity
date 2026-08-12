# DECISIONS.md — Architecture Decision Log
**Assessment Intelligence & Scheduling Module**
**Last Updated:** 2026-08-01 (v1.1 — architectural review incorporated)

---

## ADR-001: Module Isolation Strategy

**Decision:** Create completely independent routes/controllers/models/services/tables.

**Reason:**
- The DVR module is production-critical and must not be destabilized
- Assessment scheduling has fundamentally different workflow requirements
- Future maintainability: changes to assessment cannot break DVR

**Alternatives Considered:**
- Extending DVR tables with new columns → Rejected (too tightly coupled, schema pollution)
- Reusing project_assignments table → Rejected (semantics differ; DVR is about layer features, Assessment is about buildings)

**Final Approach:** Dedicated tables: `assessment_schedules`, `assessment_history`. Dedicated route prefix: `/api/assessment/*`.
*(assessment_assignment table was proposed in v1.0 but eliminated in ADR-010 below.)*

---

## ADR-002: Outstanding API — Backend Proxy with Lazy Load

**Decision:** Frontend NEVER calls the Outstanding API directly. Backend proxies all calls. Outstanding data is loaded lazily, not on every request.

**Reason:**
- The API URL contains sensitive infrastructure details (`testprsrvgisapp.mcgm.gov.in`)
- Business logic for data joining belongs in the service layer
- Future caching (Redis) can be added transparently at the backend
- **Performance:** Outstanding API is expensive (2000-record limit) and must not be called for initial page load, map pan, or location-only filters

**Alternatives Considered:**
- Frontend calling directly → Rejected (security + architecture violation)
- Eager load on every building list fetch → Rejected (unnecessary API calls, performance impact)
- Full pre-join nightly ETL → Rejected (data freshness issues, Phase 1 complexity)

**Final Approach (v1.1):** Two separate backend endpoints:
- `GET /buildings` → Building Layer only (always fast)
- `GET /buildings/:objectId/outstanding` → Outstanding for one selected building
- `POST /outstanding/batch` → Outstanding only when outstanding-related filters are active

**Trigger conditions for Outstanding API:**
- ✅ Building selected (detail view)
- ✅ Outstanding-amount, assessment-year, expired, taxpayer-category filters applied
- ✅ Quick Filters: High Outstanding, Assessment Expired, etc.
- ❌ Initial load, map movement, location/building-attribute-only filters

---

## ADR-003: SACNO Join Strategy — Runtime Only

**Decision:** Building Layer data and Outstanding API data are joined only at request time. Never persisted together.

**Reason:**
- Outstanding data changes frequently (daily billing runs)
- Building layer is managed by GIS team independently
- Persistent join would require complex synchronization jobs
- Data volume makes full pre-join impractical

**Alternatives Considered:**
- Nightly ETL job to sync Outstanding data into PostgreSQL → Rejected for Phase 1 (complexity, data freshness issues)
- Materialized views → Rejected (same freshness issue)

**Final Approach:** Backend service does the join at request time using SACNO as the key.

---

## ADR-004: Priority Engine Placement

**Decision:** Priority scoring engine placed in `src/utils/assessmentPriorityEngine.js` as a pure function module.

**Reason:**
- Must be reusable without React or API dependencies
- Can be tested independently
- Future backend scoring can import the same logic
- Keeps React components clean from business rules

**Alternatives Considered:**
- Scoring inside AssessmentBuildingCard → Rejected (mixes UI and business logic)
- Scoring inside Redux thunks → Rejected (still too embedded)
- Scoring in backend → Can be added in Phase 2; frontend scoring sufficient for Phase 1

**Final Approach:** Pure function module in utils. Called after buildings and outstanding data are merged in the Redux thunk.

---

## ADR-005: GIS Map Component Strategy

**Decision:** Create `AssessmentMap.jsx` as a new component. Reuse patterns, not code from existing map tools.

**Reason:**
- `TwoDMap.jsx` (146KB) is a monolith managing the entire 3D GIS platform. Modifying it would be high-risk.
- `PropertyOutstanding.jsx` calls MCGM API directly from frontend — pattern not allowed for this module.
- We need a focused, lightweight map component.

**Alternatives Considered:**
- Adding assessment overlay to TwoDMap → Rejected (too invasive, creates coupling)
- Reusing PropertyOutstanding.jsx component → Rejected (it does direct API calls, wrong architecture)
- Embedding inside existing map panel → Possible future optimization

**Final Approach:** Dedicated `AssessmentMap.jsx` using the same ArcGIS SDK (queryAllFeatures, GraphicsLayer, view.goTo), but for this module only.

---

## ADR-006: Notification Reuse Strategy

**Decision:** Directly call `notificationService.notifyUser()` from `assessmentService.js`.

**Reason:**
- notificationService is already production-tested, handles multi-device FCM, token invalidation, and DB persistence
- Zero risk of regression — we're calling it, not modifying it
- No new notification tables needed

**Alternatives Considered:**
- Creating a new notificationService for assessment → Rejected (duplication)
- Direct FCM calls in controller → Rejected (violates thin-controller rule)

**Final Approach:** `assessmentService.createSchedule()` calls `notificationService.notifyUser()` after DB insert.

**New notification type:** `'ASSESSMENT_ASSIGNED'`

---

## ADR-007: Database Table Naming

**Decision:** Use `assessment_` prefix for all new tables.

**Reason:**
- Clear namespace isolation from DVR tables (`projects1`, `project_assignments`, etc.)
- Consistent with module boundary principle

**Tables:**
- `assessment_schedules` — main schedule records
- `assessment_assignment` — assignment records (who is assigned to what schedule)
- `assessment_history` — audit trail of status changes

---

## ADR-008: Redux vs Local State

**Decision:** Use Redux for building list, filters, selected building, analytics. Local state for modal-only UI state.

**Reason:**
- Map ↔ List synchronization requires shared state (both components need selectedBuilding)
- Analytics cards must react to filter changes
- Modal-specific state (form fields while user is filling the modal) can stay local

**Pattern:**
```javascript
// In Redux: shared cross-component state
assessmentSlice: { buildings, selectedBuilding, filters, analytics, l1Users }

// Local: modal-only ephemeral state
const [assessmentDate, setAssessmentDate] = useState('');
const [priority, setPriority] = useState('HIGH');
```

---

## ADR-009: Route Path Choice

**Decision:** Use `/assessment-scheduling` as the page route.

**Reason:**
- Clear, descriptive URL
- Does not conflict with existing `/assessement` route (Note: existing route has a typo)
- Future-proof (can add sub-routes later: `/assessment-scheduling/reports`)

**Note:** Existing route `/assessement` is a dashboard for Assessment Department GIS tools. Our new route is an entirely different page.

---

## ADR-010: Eliminate assessment_assignment Table

**Decision:** Drop the separate `assessment_assignment` table. Store assignment columns (`assigned_to`, `assigned_by`, `assigned_at`, `notification_sent`, `notification_id`) directly in `assessment_schedules`.

**Reason:**
- Every Phase 1 schedule record has exactly ONE L1 assignee — a 1:1 relationship
- A separate assignment table would require a JOIN on every schedule query for no benefit
- Reassignments are already captured in `assessment_history` with `from_assigned_to` / `to_assigned_to` columns
- Simpler schema = fewer bugs, easier maintenance

**Alternatives Considered:**
- Separate `assessment_assignment` table (v1.0 design) → Rejected. Adds complexity without value for 1:1 relationship in Phase 1
- 1:Many assignment table (for future multiple L1s per building) → Deferred to Phase 2 if requirement emerges

**Final Approach:** Assignment data lives in `assessment_schedules`. `assessment_history` table has `from_assigned_to` and `to_assigned_to` columns to track reassignment events.

---

## ADR-011: Store GIS Identifiers in assessment_schedules

**Decision:** Store `gis_layer_id`, `gis_global_id`, and `gis_object_id` in every schedule record.

**Reason:**
- Allows backend or frontend to re-fetch the exact GIS feature without a search query
- Enables future deep-link from notification → map → highlighted building
- `gis_object_id` is the stable ArcGIS identifier within a layer
- `gis_global_id` is the globally unique identifier across layers
- Both are returned by the Building Layer query and available at schedule-creation time

**Alternatives Considered:**
- Store only building_uid → Insufficient; UID is a business identifier, not a GIS feature pointer
- Store only SAC number → Not all buildings have SAC; GIS identifiers are always present

**Final Approach:** All three GIS identifiers stored at schedule creation. `gis_object_id` indexed for fast lookup.

---

## ADR-012: L1 Workload Stats — Query-Time Computation

**Decision:** Compute L1 workload stats (pending, today_assigned, today_completed, overdue) at query time via SQL aggregation.

**Reason:**
- Stats must always reflect current state — no caching risk
- SQL aggregation is efficient for the expected data volumes
- Four metrics (pending, today_assigned, today_completed, overdue) give L3 enough signal to balance workload intelligently

**Workload Metrics Defined:**
| Metric | SQL Condition |
|---|---|
| `pending_assignments` | status IN ('SCHEDULED', 'ACCEPTED', 'IN_PROGRESS') |
| `today_assigned` | assigned_at::date = CURRENT_DATE |
| `today_completed` | status = 'COMPLETED' AND updated_at::date = CURRENT_DATE |
| `overdue_assignments` | assessment_date < CURRENT_DATE AND status IN active statuses |

**Alternatives Considered:**
- Pre-computed workload table → Rejected (stale data risk, added complexity)
- Frontend computation → Rejected (would require fetching all schedules to frontend)

---

## ADR-013: Schedule Status Codes — All Defined Upfront

**Decision:** Define all 6 status codes in the DB CHECK constraint at creation time, even though Phase 1 only writes `SCHEDULED`.

**Reason:**
- Adding new values to a CHECK constraint requires a table ALTER (schema migration) — better to define them all now
- Phase 2 will need ACCEPTED, IN_PROGRESS, COMPLETED without a schema change
- Code that reads status (filters, displays, analytics) can handle all statuses safely

**Status Codes:**
| Code | Phase | Meaning |
|---|---|---|
| SCHEDULED | 1 ✅ | Created, L1 notified |
| ACCEPTED | 2 | L1 acknowledged |
| IN_PROGRESS | 2 | Assessment started |
| COMPLETED | 2 | Assessment done |
| CANCELLED | Any | Cancelled by L3 |
| RESCHEDULED | Any | Replaced by a new schedule |

---

## ADR-014: Notification Type Constant

**Decision:** Use `'ASSESSMENT_ASSIGNED'` as the notification type string for assessment assignment notifications.

**Reason:**
- Follows the existing pattern in DVR (`'DVR_STATUS_UPDATE'`)
- Makes notifications filterable by type in the existing notifications table
- Frontend notification handlers can display assessment-specific UI when this type arrives
- No changes needed to `notificationService.js` — it accepts any type string

**Future types to define as needed:**
- `'ASSESSMENT_REASSIGNED'` — Phase 2
- `'ASSESSMENT_COMPLETED'` — Phase 2
- `'ASSESSMENT_OVERDUE'` — Phase 3

# PRD — Assessment Intelligence & Scheduling Module
**Version:** 1.0 | **Date:** 2026-08-01 | **Status:** Draft

---

## 1. Business Objective

Allow Assessment Department L3 users to intelligently discover buildings requiring assessment, prioritize them using GIS and Assessment data, assign them to Assessment Department L1 users, and track those assignments.

This module is an **Assessment Command Center** — not a simple form or assignment tool.

---

## 2. User Roles

### Assessment L3 (Command)
| Capability | Description |
|---|---|
| View Buildings | Browse all buildings on the GIS map and list |
| Search Buildings | Full-text search by name, address, SAC, UID |
| Filter Buildings | Apply location, building, and assessment filters |
| View GIS Map | Live map synchronized with building list |
| View Building Details | Full detail panel: general info, assessment info, outstanding info |
| Schedule Assessment | Set assessment date, priority, remarks |
| Reschedule Assessment | Update an existing scheduled assessment |
| Assign L1 | Assign a scheduled assessment to an Assessment L1 user |
| Track Assignments | View pending, in-progress, and completed assessments |

### Assessment L1 (Field)
| Capability | Description |
|---|---|
| Receive Assignment | View assessments assigned to them |
| Receive Push Notification | FCM push notification on assignment |
| View Assigned Assessments | List of their active assignments |

> **Phase 1 Scope:** Workflow ends after successful assignment and push notification delivery. Assessment Form is NOT in Phase 1.

---

## 3. Functional Requirements

### FR-01: Building Discovery
- System shall display buildings from the Building Layer (ArcGIS MapServer)
- Buildings shall be filterable by Ward, Section, Zone, Locality, UID, SAC, Name, Address
- Buildings shall be queryable with Outstanding Assessment data via backend proxy

### FR-02: Smart Priority Scoring
- System shall calculate a Priority Score for each building
- Score shall be based on: missing SAC, expired assessment, outstanding amount, assessment age, taxpayer category, building type
- Priority levels: HIGH, MEDIUM, LOW
- Priority engine shall be externalized (not hardcoded in UI components)

### FR-03: Quick Suggestions
- System shall surface intelligent Quick Lists:
  - High Outstanding
  - Assessment Expired
  - Missing SAC
  - Never Assessed
  - Highest Revenue Opportunity
  - Recently Added Buildings
- Clicking a suggestion shall auto-apply corresponding filters

### FR-04: GIS Map Integration
- Building Layer shall remain visible
- Map ↔ List shall be synchronized:
  - Click on map building → highlight in list
  - Click on list building → zoom and highlight on map
- Reuse existing `queryAllFeatures` and ArcGIS SDK patterns from `PropertyOutstanding.jsx`

### FR-05: Building Details Panel
- On building selection, display:
  - General Information (Name, UID, SAC, Ward, Address)
  - Assessment Information (Status, Year, Expiry)
  - Outstanding Information (Amount, Proposal No., Taxpayer Category, Repair Cess)
  - Map Information (Coordinates, Floors, Area)
  - Current Assessment Status

### FR-06: Schedule Assessment
- Form fields: Assessment Date, Priority (HIGH/MEDIUM/LOW), Remarks
- Must select an L1 user
- On submission: create schedule record in DB, fire FCM push notification

### FR-07: L1 User Selection
- Display L1 users with: Name, Ward, Pending Assignments, Completed Assessments, Current Workload
- L3 must be able to intelligently balance workload

### FR-08: Analytics Dashboard Cards
- Total Buildings (current filter)
- Need Assessment
- Already Scheduled
- Completed
- High Priority
- Cards update dynamically based on active filters

### FR-09: Notifications
- On assignment: FCM push notification sent to assigned L1 user
- Reuses existing `notificationService.notifyUser()` from `services/notificationService.js`
- Notification stored in existing `notifications` and `notification_deliveries` tables

---

## 4. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Architecture | Frontend NEVER calls Outstanding API directly |
| Isolation | Module MUST NOT modify DVR tables, routes, controllers, or UI |
| Performance | Outstanding API queried only with filters; max 2000 records per call |
| Security | All backend routes protected with `verifyToken` middleware |
| Maintainability | Priority engine externalized as a pure function/service |
| Scalability | Backend service layer handles business logic; controllers stay thin |

---

## 5. Phase 1 Scope

✅ Dashboard
✅ Analytics Cards
✅ Smart Filters
✅ Quick Suggestions
✅ Building List
✅ GIS Map Integration
✅ Building Details
✅ Schedule Assessment Modal
✅ L1 Assignment
✅ Database Tables
✅ Backend APIs
✅ Push Notification

❌ Assessment Form (Phase 2+)
❌ Completion Workflow (Phase 2+)
❌ Performance Dashboard (Phase 3+)

---

## 6. Future Scope

- **Phase 2:** Assessment Form, Completion Workflow, L1 Field App
- **Phase 3:** Reports, Analytics, Tracking Dashboard
- **Phase 4:** Performance Dashboard, SLA Monitoring, Revenue Impact Analysis

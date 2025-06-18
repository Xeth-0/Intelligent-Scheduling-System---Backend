# Admin Dashboard Metrics Implementation Plan

## KPIs to Implement

### 1. Room Utilization
- **Metric**: `Σ(minutes scheduled) ÷ Σ(minutes available)` 
- **Visual**: Gauge chart (overall %) + horizontal bar chart (per-building)
- **Endpoint**: `GET /metrics/room-utilization?scheduleId&campusId`

### 2. Teacher Workload Balance  
- **Metric**: Sessions per teacher with preference satisfaction ratio
- **Visual**: Stacked polar bar chart (rings = teachers, segments = daily sessions)
- **Endpoint**: `GET /metrics/teacher-workload?scheduleId&campusId`

### 3. Teacher Preference Trends
- **Metric**: Aggregated PREFER/AVOID/NEUTRAL counts per timeslot
- **Visual**: 100% stacked bar chart (X = timeslots, Y = preference counts)
- **Endpoint**: `GET /metrics/teacher-preference-trends?campusId`

### 4. Crowded Timeslots
- **Metric**: `sessionCount ÷ roomsAvailable` per timeslot
- **Visual**: Heatmap (X = days, Y = timeslots, color = usage %)
- **Endpoint**: `GET /metrics/crowded-timeslots?scheduleId&campusId`

### 5. Schedule Quality Radar
- **Metrics**: 5 normalized axes (0-100%):
  - Room Utilization %
  - Teacher Preference Satisfaction %  
  - Teacher Workload Balance (1 - Gini coefficient)
  - Student Group Conflict Rate (inverted)
  - Schedule Compactness (gaps per teacher)
- **Visual**: Radar chart with target vs actual polygons
- **Endpoint**: `GET /metrics/schedule-quality?scheduleId&campusId`

## Implementation Steps

### Backend
1. Create `MetricsController` in scheduling module
2. Create `MetricsService` with Prisma aggregation queries
3. Add 5 endpoints above with proper TypeScript types
4. Ensure campus-scoped queries for scalability

### Frontend  
1. Create reusable `<EChart>` wrapper component
2. Add React Query hooks for metrics endpoints
3. Create chart option configs for each visualization
4. Update admin dashboard with new metric cards
5. Add loading states and error handling

### Data Flow
- React Query → Zustand store → Chart components
- All charts lazy-load to avoid blocking dashboard
- Campus-filtered queries to handle scale

## Files to Create/Modify

### Backend
- `core/src/modules/scheduling/metrics.controller.ts`
- `core/src/modules/scheduling/metrics.service.ts` 
- `core/src/modules/scheduling/dtos/metrics.dto.ts`
- Update `scheduling.module.ts`

### Frontend
- `intelligent-scheduler-frontend/components/charts/EChart.tsx`
- `intelligent-scheduler-frontend/lib/stores/metrics.store.ts`
- `intelligent-scheduler-frontend/components/dashboard/metrics/` (5 chart components)
- Update `app/admin/dashboard/page.tsx`

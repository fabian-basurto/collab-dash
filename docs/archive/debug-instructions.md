# Widget Deletion Debug Instructions

## 🚨 Current Issue
Widget deletion is still affecting multiple datasets when it should only delete the specific widget.

## 🔧 Debugging Tools Added

### 1. Enhanced Console Logging
- **Widget Deletion Start/End**: Clear markers for each deletion
- **Current State**: Shows all widgets before deletion
- **Database Operations**: Logs exact database queries and results
- **Realtime Events**: Tracks subscription updates

### 2. Database Verification Button
- **Location**: Top right corner of dashboard (Database icon)
- **Function**: Manually verify database state vs local state
- **Usage**: Click before and after deletion to compare states

## 🧪 Step-by-Step Debug Process

### 1. Open Developer Console
Press `F12` → `Console` tab

### 2. Create Test Scenario
1. Create/upload multiple datasets (emp, raw, etc.)
2. Add line charts for each dataset
3. Note the widget IDs and titles

### 3. Before Deletion - Baseline
Click the **Database verification button** (🗄️ icon) to see:
```
=== VERIFYING DATABASE STATE ===
All widgets in database: 3
Widget details: [
  {id: "uuid-1", title: "Line Chart", type: "line", dataset_id: "emp-uuid"},
  {id: "uuid-2", title: "Line Chart", type: "line", dataset_id: "raw-uuid"},
  {id: "uuid-3", title: "Line Chart", type: "line", dataset_id: "other-uuid"}
]
Current local state widgets: 3
Local state details: [...same as above...]
=== END DATABASE VERIFICATION ===
```

### 4. Delete One Widget
Click delete on the "emp" line chart widget and watch console:

```
ChartWidget delete button clicked: {
  widgetId: "uuid-1",
  widgetTitle: "Line Chart",
  widgetType: "line",
  datasetId: "emp-uuid"
}

=== WIDGET DELETION START ===
Current widgets before deletion: [...all 3 widgets...]

Widget deleted from local state: {
  widgetId: "uuid-1",
  widgetTitle: "Line Chart",
  widgetType: "line", 
  datasetId: "emp-uuid",
  remainingWidgets: 2
}

Executing database delete for widget: "uuid-1"
Database delete result: { error: null, data: [] }

Widget successfully deleted from database: "uuid-1"
=== WIDGET DELETION END ===
```

### 5. After Deletion - Verification
Click the **Database verification button** again:

**Expected Correct Behavior:**
```
=== VERIFYING DATABASE STATE ===
All widgets in database: 2
Widget details: [
  {id: "uuid-2", title: "Line Chart", type: "line", dataset_id: "raw-uuid"},
  {id: "uuid-3", title: "Line Chart", type: "line", dataset_id: "other-uuid"}
]
Current local state widgets: 2
Local state details: [...same as above...]
=== END DATABASE VERIFICATION ===
```

**If Issue Still Occurs:**
```
=== VERIFYING DATABASE STATE ===
All widgets in database: 0  ← WRONG! Should be 2
Widget details: []
Current local state widgets: 2  ← Shows UI still has widgets
=== END DATABASE VERIFICATION ===
```

## 🔍 Root Cause Analysis

### If Database Shows 0 Widgets:
- **RLS Policy Issue**: Row Level Security might be too restrictive
- **Database Constraint**: Foreign key or check constraint problems
- **Realtime Bug**: Subscription might be clearing all widgets

### If Database Shows Correct Count:
- **UI State Issue**: Problem with React state management
- **Realtime Race**: Subscription interfering with local updates
- **Component Re-render**: Unintended component remounting

## 🛠️ Immediate Fixes to Try

### 1. Check RLS Policies
Run this SQL in Supabase SQL Editor:
```sql
-- Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'widgets';

-- Check if there are any CASCADE deletes happening
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.delete_rule 
FROM information_schema.table_constraints tc
JOIN information_schema.tables t ON tc.table_name = t.table_name 
WHERE t.table_name = 'widgets' AND tc.constraint_type = 'FOREIGN KEY';
```

### 2. Disable Realtime Temporarily
In `useWidgets.ts`, comment out the realtime subscription:
```typescript
// useEffect(() => {
//   const channel = supabase
//     .channel(`widgets:${dashboardId}`)
//     .on("postgres_changes", { event: "*", schema: "public", table: "widgets", filter: `dashboard_id=eq.${dashboardId}` }, (payload) => {
//       // ... subscription logic
//     })
//     .subscribe();
//   return () => { supabase.removeChannel(channel); };
// }, [dashboardId]);
```

### 3. Manual Database Query
Test direct database deletion:
```typescript
// In browser console, run:
await supabase.from('widgets').delete().eq('id', 'your-widget-id-here').select();
```

## 📊 Expected Debug Results

### ✅ Correct Behavior:
- Database verification shows correct widget count before/after deletion
- Only the targeted widget is removed
- Console logs show proper deletion flow
- No unexpected realtime events

### ❌ Issue Behavior:
- Database verification shows wrong count (0 instead of expected count)
- Multiple widgets disappear from UI
- Console shows unexpected deletion patterns
- Realtime events show multiple DELETE operations

## 🚀 Next Steps

Based on debug results, we can identify if the issue is:
1. **Database Level**: Fix RLS policies or constraints
2. **Realtime Level**: Fix subscription logic
3. **UI Level**: Fix React state management
4. **Integration Level**: Fix interaction between components

Run the debug process and share the console output for targeted fix!

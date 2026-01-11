# Leads Follow-Up UI Redesign

## Current Issues
- Subtle background color is hard to notice
- Badge in column feels cluttered
- Count in header is not prominent
- No clear priority indication
- Filter checkbox is easy to miss

## Proposed Design Options

### Option 1: Alert Banner + Better Visual Indicators (Recommended)

**At the top of the page (above filters)**:
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  You have 5 leads that need follow-up                    │
│                                                              │
│ These leads have been inactive for 48+ hours                │
│ [View Only Inactive Leads]  [Dismiss]                      │
└─────────────────────────────────────────────────────────────┘
```

**In the table**:
- Add a dedicated "Status" column (or use existing one)
- Show clear icon + text indicator
- Use amber/orange color scheme (warning, not error)
- Add subtle left border on row (4px amber)

**Visual indicators**:
- 🔔 Bell icon with amber badge showing days inactive
- "Follow Up" text in amber
- Left border on entire row

### Option 2: Separate "Needs Attention" Section

**Split the table into two sections**:
1. **Needs Follow-Up** (collapsed/expanded)
   - Shows only inactive leads
   - Amber background
   - Prominent section header
   
2. **All Other Leads**
   - Regular table
   - No special styling

### Option 3: Priority Column with Visual Indicators

**Add a "Priority" column at the beginning**:
- 🔥 High Priority (>72 hours)
- ⚠️ Needs Follow-Up (48-72 hours)
- ✅ Active (<48 hours)
- Use color-coded badges

### Option 4: Card-Based View for Inactive Leads

**Show inactive leads as cards at the top**:
```
┌────────────────────────────────────────────┐
│ Needs Follow-Up (5)                       │
├────────────────────────────────────────────┤
│ [Card] [Card] [Card] [Card] [Card]        │
│ • John Doe - 3 days ago                    │
│ • Jane Smith - 2 days ago                  │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ All Leads                                  │
│ [Regular table view]                       │
└────────────────────────────────────────────┘
```

## Recommended Design: Option 1 (Alert Banner + Enhanced Indicators)

### Implementation Details

**1. Alert Banner Component**
- Only shows when there are inactive leads
- Dismissible (saves to localStorage)
- Shows count and quick action
- Amber/orange color scheme
- Icon: AlertCircle or Bell

**2. Table Enhancements**
- Left border (4px) on inactive rows - amber/orange
- Icon column showing status
- Better badge design (larger, clearer)
- Hover effect to highlight entire row

**3. Default Sorting**
- Auto-sort inactive leads to top
- Keep sort state in URL params
- Show "Sorted by: Needs Follow-Up" indicator

**4. Color Scheme**
- Primary: Amber/Orange (#f59e0b, #fbbf24)
- Background: Amber-50 (#fffbeb)
- Text: Amber-700 (#b45309)
- Border: Amber-400 (#fbbf24)

**5. Responsive Design**
- Mobile: Stack cards vertically
- Desktop: Full table with indicators
- Tablet: Simplified columns with clear indicators

### Component Breakdown

```tsx
// Alert Banner
<Alert variant="warning" className="mb-4">
  <AlertCircle className="h-5 w-5" />
  <AlertTitle>You have {inactiveCount} leads that need follow-up</AlertTitle>
  <AlertDescription>
    These leads have been inactive for 48+ hours. Take action to keep them engaged.
  </AlertDescription>
  <div className="flex gap-2 mt-2">
    <Button size="sm" onClick={() => setShowInactiveOnly(true)}>
      View Inactive Leads
    </Button>
    <Button variant="ghost" size="sm" onClick={dismissAlert}>
      Dismiss
    </Button>
  </div>
</Alert>

// Table Row Styling
<div 
  className={cn(
    "table-row",
    isInactive && "border-l-4 border-amber-400 bg-amber-50/50"
  )}
>
  // Status Icon Column
  <div className="flex items-center gap-2">
    {isInactive && (
      <>
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <Badge variant="warning" className="bg-amber-100 text-amber-700">
          Follow Up
        </Badge>
      </>
    )}
  </div>
</div>
```

## Visual Mockup (Text-based)

```
┌──────────────────────────────────────────────────────────────────┐
│ My Leads                                                          │
│ Your assigned leads                                               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ⚠️  5 leads need follow-up                                       │
│ These leads have been inactive for 48+ hours                     │
│ [View Inactive Leads]  [Dismiss]                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Filters: [All Statuses ▼] [x] Show only inactive leads          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Customer      │ Phone      │ Type    │ Status   │ Last Activity │
├──────────────────────────────────────────────────────────────────┤
│ ║ John Doe    │ 555-1234  │ Lawn    │ ASSIGNED │ ⚠️ 3 days ago│
│ ║                                                [Follow Up] ◄───┤ Amber
│ ║                                                                │ Border
├──────────────────────────────────────────────────────────────────┤
│ ║ Jane Smith  │ 555-5678  │ Tree    │ QUOTED   │ ⚠️ 2 days ago│
│ ║                                                [Follow Up]     │
├──────────────────────────────────────────────────────────────────┤
│   Mike Johnson│ 555-9012  │ Pest    │ ASSIGNED │ ✅ 5 hours ago│
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Implementation Priority

1. ✅ Add Alert Banner component (if inactiveCount > 0)
2. ✅ Update row styling with left border
3. ✅ Improve badge design (amber colors)
4. ✅ Add icon to Last Activity column
5. ✅ Auto-sort inactive leads to top
6. Optional: Add dismissible state

## Color Palette

```
Warning/Attention Colors:
- bg-amber-50: #fffbeb (lightest background)
- bg-amber-100: #fef3c7 (badge background)
- border-amber-400: #fbbf24 (border)
- text-amber-600: #d97706 (icon color)
- text-amber-700: #b45309 (text color)
- text-amber-800: #92400e (dark text)
```

## Accessibility

- Clear contrast ratios
- Icon + text (not just color)
- Keyboard navigation
- Screen reader friendly
- Focus states for interactive elements

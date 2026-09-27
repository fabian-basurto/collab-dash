# Dataset Search Functionality

## Overview

The CollabDash application now includes an advanced dataset search feature with NLP-like capabilities in the WidgetSidebar. This allows users to quickly find and access datasets using natural language queries.

## Features

### 1. Intelligent Search Matching

The search system matches against multiple aspects of your datasets:

- **Dataset Names**: Exact and partial matching
- **Data Content**: Searches within the actual dataset data
- **Source Types**: Filters by file type (csv, json, excel)
- **Row Counts**: Numeric matching for dataset sizes
- **Synonyms**: Fuzzy matching for related terms

### 2. NLP-Like Synonym Matching

The system understands related terms:

| Search Term | Also Matches |
|-------------|--------------|
| `sales` | revenue, income, profit, earnings, turnover |
| `data` | information, stats, statistics, metrics, figures |
| `chart` | graph, plot, visualization, visual, display |
| `report` | analysis, summary, overview, review |
| `customer` | client, user, buyer, consumer |
| `product` | item, service, offering, goods |
| `financial` | finance, money, budget, cost, expense |

### 3. Search Scoring System

Results are ranked by relevance:

- **Exact name match**: 100 points
- **Partial name match**: 50 points
- **Content match**: 25 points
- **Source type match**: 20 points
- **Row count match**: 30 points (exact) / 15 points (partial)
- **Synonym match**: 15 points (name) / 10 points (content)
- **Partial word match**: 5 points

### 4. User Interface Features

- **Real-time Search**: Results update as you type
- **Auto-suggestions**: Dropdown suggestions from existing datasets
- **Match Percentage**: Shows relevance score for high-quality matches
- **Matched Fields**: Displays which fields matched the search
- **Keyboard Navigation**: Arrow keys to navigate, Enter to select, Escape to clear
- **Result Count**: Shows number of matching datasets

## Usage

### Basic Search

1. Go to any dashboard
2. Look for the "Data Sets" section in the left sidebar
3. Type your search query in the search box
4. Click on any dataset to open/apply it

### Search Examples

Try these search queries to see the NLP matching in action:

- `sales` - finds datasets with "sales", "revenue", "income", "profit"
- `customer data` - finds datasets containing customer information
- `100` - finds datasets with exactly 100 rows
- `excel` - finds datasets imported from Excel files
- `financial report` - finds financial data and analysis datasets

### Keyboard Shortcuts

- **Arrow Down**: Move to next search result
- **Arrow Up**: Move to previous search result
- **Enter**: Select highlighted dataset
- **Escape**: Clear search

## Technical Implementation

### Files Modified

1. **`src/components/dashboard/WidgetSidebar.tsx`**
   - Added search input field
   - Implemented search results display
   - Added keyboard navigation
   - Enhanced dataset item display with match information

2. **`src/lib/datasetSearch.ts`** (New)
   - Core search algorithm with scoring
   - Synonym mapping for NLP-like matching
   - Search suggestions generation
   - Text highlighting utilities

### Search Algorithm

The search function uses a multi-pass approach:

1. **Exact Matching**: High priority for exact name matches
2. **Content Search**: Searches within JSON data content
3. **Metadata Search**: Matches source types and row counts
4. **Synonym Expansion**: Expands search terms using the synonym map
5. **Scoring**: Ranks results by relevance score
6. **Sorting**: Orders by score, then by creation date

### Performance Considerations

- Uses `useMemo` for efficient re-computation
- Debounced search to avoid excessive filtering
- Optimized string operations for large datasets
- Efficient JSON serialization for content matching

## Future Enhancements

Potential improvements for the search system:

1. **Full-text Search**: Integration with PostgreSQL full-text search
2. **Search History**: Save and reuse recent searches
3. **Advanced Filters**: Date ranges, numeric ranges, boolean filters
4. **Search Analytics**: Track search patterns and popular queries
5. **ML-based Matching**: Machine learning for semantic similarity
6. **Search Export**: Export search results to CSV/Excel

## Testing

A demo component is available at `src/components/DatasetSearchDemo.tsx` to test the search functionality with sample data.

## Browser Support

The search feature works in all modern browsers that support:
- ES6+ JavaScript features
- React 18+
- HTML5 datalist element for suggestions

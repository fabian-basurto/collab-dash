import { useState } from "react";
import { rankDatasets, collectDatasetSuggestions } from "@/lib/dataset-search";
import type { Dataset } from "@/hooks/useDatasets";

// Sample datasets for demonstration
const sampleDatasets: Dataset[] = [
  {
    id: "1",
    dashboard_id: "demo",
    name: "Sales Revenue Q1 2024",
    data: [
      { month: "January", revenue: 45000, region: "North" },
      { month: "February", revenue: 52000, region: "North" },
      { month: "March", revenue: 48000, region: "North" },
    ],
    row_count: 3,
    source: "excel",
    created_by: "demo",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    dashboard_id: "demo",
    name: "Customer Analytics Report",
    data: [
      { customer_id: "C001", total_orders: 15, avg_order_value: 120.50 },
      { customer_id: "C002", total_orders: 8, avg_order_value: 89.99 },
    ],
    row_count: 2,
    source: "csv",
    created_by: "demo",
    created_at: "2024-01-10T14:30:00Z",
    updated_at: "2024-01-10T14:30:00Z",
  },
  {
    id: "3",
    dashboard_id: "demo",
    name: "Product Performance Metrics",
    data: [
      { product: "Widget A", units_sold: 1250, satisfaction: 4.2 },
      { product: "Widget B", units_sold: 980, satisfaction: 3.8 },
    ],
    row_count: 2,
    source: "json",
    created_by: "demo",
    created_at: "2024-01-08T09:15:00Z",
    updated_at: "2024-01-08T09:15:00Z",
  },
  {
    id: "4",
    dashboard_id: "demo",
    name: "Monthly Financial Data",
    data: [
      { period: "2024-01", income: 125000, expenses: 82000, profit: 43000 },
      { period: "2024-02", income: 138000, expenses: 89000, profit: 49000 },
    ],
    row_count: 2,
    source: "excel",
    created_by: "demo",
    created_at: "2024-01-05T16:45:00Z",
    updated_at: "2024-01-05T16:45:00Z",
  },
];

export function DatasetSearchDemo() {
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = rankDatasets(sampleDatasets, searchQuery);
  const suggestions = collectDatasetSuggestions(sampleDatasets);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Dataset Search Demo</h2>
      
      <div className="mb-6">
        <input
          type="text"
          placeholder="Try searching for: sales, customer, revenue, financial, data..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 border rounded-lg"
          list="demo-suggestions"
        />
        <datalist id="demo-suggestions">
          {suggestions.slice(0, 8).map((suggestion, index) => (
            <option key={index} value={suggestion} />
          ))}
        </datalist>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          {searchQuery ? `${searchResults.length} results found` : `${sampleDatasets.length} datasets available`}
        </p>
      </div>

      <div className="grid gap-4">
        {(searchQuery ? searchResults.map(r => r.dataset) : sampleDatasets).map((dataset) => {
          const result = searchResults.find(r => r.dataset.id === dataset.id);
          return (
            <div key={dataset.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{dataset.name}</h3>
                {result && (
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                    {Math.round(result.score / 10)}% match
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {dataset.row_count} rows · {dataset.source} · {new Date(dataset.created_at).toLocaleDateString()}
              </p>
              {result && result.matchedFields.length > 0 && (
                <p className="text-xs text-blue-600 mb-2">
                  Matched fields: {result.matchedFields.join(', ')}
                </p>
              )}
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                Sample data: {JSON.stringify(dataset.data.slice(0, 2))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Search Features:</h3>
        <ul className="text-sm space-y-1">
          <li>· Name matching (exact and partial)</li>
          <li>· Content search within dataset data</li>
          <li>· Source type filtering (csv, json, excel)</li>
          <li>· Row count matching (search for numbers)</li>
          <li>· Synonym/fuzzy matching (sales matches revenue, profit, etc.)</li>
          <li>· Scoring system for relevance ranking</li>
          <li>· Auto-suggestions from existing datasets</li>
        </ul>
      </div>
    </div>
  );
}

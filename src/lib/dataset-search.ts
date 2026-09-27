import type { Dataset } from "@/hooks/useDatasets";

export interface DatasetMatch {
  dataset: Dataset;
  score: number;
  matchedFields: string[];
}

// Rank matches across names, sources, row counts, and serialized content.
export function rankDatasets(
  datasets: Dataset[] | undefined,
  query: string
): DatasetMatch[] {
  if (!query.trim() || !datasets) {
    return datasets?.map(dataset => ({ dataset, score: 0, matchedFields: [] })) || [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const results: DatasetMatch[] = [];

  // Related terms expand selected queries; this is a fixed vocabulary.
  const relatedSearchTerms: Record<string, string[]> = {
    'sales': ['revenue', 'income', 'profit', 'earnings', 'turnover', 'gross', 'net'],
    'data': ['information', 'stats', 'statistics', 'metrics', 'figures', 'numbers'],
    'chart': ['graph', 'plot', 'visualization', 'visual', 'display', 'diagram'],
    'report': ['analysis', 'summary', 'overview', 'review', 'assessment'],
    'monthly': ['month', 'monthly', 'period', 'monthly'],
    'yearly': ['year', 'annual', 'yearly', 'fiscal', 'year'],
    'customer': ['client', 'user', 'buyer', 'consumer', 'purchaser'],
    'product': ['item', 'service', 'offering', 'goods', 'merchandise'],
    'financial': ['finance', 'money', 'budget', 'cost', 'expense', 'spending'],
    'performance': ['perf', 'kpi', 'metric', 'measurement', 'indicator'],
    'time': ['date', 'period', 'duration', 'schedule', 'timeline'],
    'region': ['area', 'location', 'territory', 'zone', 'district'],
    'team': ['group', 'department', 'division', 'unit', 'squad'],
  };

  // Extract numbers from query for numeric matching
  const numberMatch = normalizedQuery.match(/\d+/);
  const requestedRowCount = numberMatch ? parseInt(numberMatch[0]) : null;

  for (const dataset of datasets) {
    let score = 0;
    const matchedFields: string[] = [];

    // Name matching (highest weight)
    const normalizedName = dataset.name.toLowerCase();
    if (normalizedName === normalizedQuery) {
      score += 100;
      matchedFields.push('name');
    } else if (normalizedName.includes(normalizedQuery)) {
      score += 50;
      matchedFields.push('name');
    }

    // Source type matching
    if (dataset.source.toLowerCase().includes(normalizedQuery)) {
      score += 20;
      matchedFields.push('source');
    }

    // Row count matching
    if (requestedRowCount !== null) {
      if (dataset.row_count === requestedRowCount) {
        score += 30;
        matchedFields.push('row_count');
      } else if (dataset.row_count.toString().includes(normalizedQuery)) {
        score += 15;
        matchedFields.push('row_count');
      }
    }

    // Data content matching
    try {
      const serializedData = JSON.stringify(dataset.data).toLowerCase();
      if (serializedData.includes(normalizedQuery)) {
        score += 25;
        matchedFields.push('content');
      }
    } catch (e) {
      // Skip if data can't be serialized
    }

    // Match related terms in names and content.
    for (const [term, synonyms] of Object.entries(relatedSearchTerms)) {
      if (normalizedQuery.includes(term)) {
        for (const synonym of synonyms) {
          if (normalizedName.includes(synonym)) {
            score += 15;
            matchedFields.push('synonym');
            break;
          }
          try {
            const serializedData = JSON.stringify(dataset.data).toLowerCase();
            if (serializedData.includes(synonym)) {
              score += 10;
              matchedFields.push('synonym');
              break;
            }
          } catch (e) {
            // Skip if data can't be serialized
          }
        }
      }
    }

    // Award additional points for query words contained in the dataset name.
    const queryTerms = normalizedQuery.split(' ').filter(Boolean);
    for (const word of queryTerms) {
      if (word.length > 2) {
        if (normalizedName.includes(word)) {
          score += 5;
          if (!matchedFields.includes('partial')) {
            matchedFields.push('partial');
          }
        }
      }
    }

    if (score > 0) {
      results.push({ dataset, score, matchedFields });
    }
  }

  // Sort by score (highest first) and then by creation date (newest first)
  return results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.dataset.created_at).getTime() - new Date(a.dataset.created_at).getTime();
  });
}

// Highlight matched terms in text
export function highlightSearchTerms(
  text: string,
  query: string,
  className: string = "bg-primary/20 text-primary font-medium"
): string {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, `<span class="${className}">$1</span>`);
}

// Get search suggestions based on available datasets
export function collectDatasetSuggestions(datasets: Dataset[] | undefined): string[] {
  if (!datasets) return [];

  const suggestions = new Set<string>();
  
  // Extract common terms from dataset names
  for (const dataset of datasets) {
    const words = dataset.name.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        suggestions.add(word);
      }
    }
  }

  // Add source types
  for (const dataset of datasets) {
    suggestions.add(dataset.source.toLowerCase());
  }

  // Add common search terms
  const commonTerms = ['sales', 'data', 'report', 'monthly', 'customer', 'product', 'financial'];
  commonTerms.forEach(term => suggestions.add(term));

  return Array.from(suggestions).slice(0, 10).sort();
}

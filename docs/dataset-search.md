# Dataset search

The sidebar ranks datasets locally through `rankDatasets` in `src/lib/dataset-search.ts`. Search reads the datasets already loaded for the dashboard; it does not call a search service.

Queries are trimmed and converted to lowercase. An empty query returns all datasets in their existing order with zero scores. Nonempty queries keep only results with a positive score.

| Match | Added score |
| --- | --- |
| Exact dataset name | 100 |
| Name contains the full query | 50 |
| Exact row count | 30 |
| Serialized data contains the query | 25 |
| Source contains the query | 20 |
| Partial row count | 15 |
| Related term appears in the name | 15 |
| Related term appears in the data | 10 |
| Query word longer than two characters appears in the name | 5 per word |

Scores accumulate. Results sort by descending score, then by newest creation date. A score is a ranking value, not a confidence percentage.

Related terms come from a fixed vocabulary. For example, `sales` can match `revenue` or `income`. This expansion is directional; it is not a language model or typo correction. Numeric matching uses the first sequence of digits in the query.

`collectDatasetSuggestions` combines words from dataset names, source types, and a small default vocabulary. It keeps the first ten distinct suggestions, then sorts them alphabetically.

`highlightSearchTerms` returns an HTML string with literal query matches wrapped in spans. Callers must handle untrusted text safely before rendering HTML.

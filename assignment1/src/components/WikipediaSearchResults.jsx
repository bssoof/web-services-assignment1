export default function WikipediaSearchResults({
  query,
  results,
  isLoading,
  error,
  onSelect,
}) {
  if (query.trim().length < 2) {
    return null;
  }

  return (
    <section className="wiki-results-panel" aria-label="نتائج ويكيبيديا العربية">
      <div className="wiki-results-panel__title">
        نتائج ويكيبيديا العربية
        {!isLoading && !error && <span>{results.length} نتيجة</span>}
      </div>

      {isLoading && (
        <div className="loading-state wiki-results-panel__state" role="status" aria-live="polite">
          جاري البحث...
        </div>
      )}

      {error && (
        <div className="error-state wiki-results-panel__state" role="alert" aria-live="assertive">
          تعذر البحث في ويكيبيديا الآن.
        </div>
      )}

      {!isLoading && !error && results.length === 0 && (
        <div className="empty-state wiki-results-panel__state" role="status" aria-live="polite">
          لا توجد نتائج إضافية من ويكيبيديا.
        </div>
      )}

      {!isLoading && !error && results.length > 0 && (
        <div className="wiki-results-list" role="list" aria-label="نتائج ويكيبيديا العربية">
          {results.map((result) => (
            <button
              key={result.pageid}
              className="wiki-result-card"
              type="button"
              onClick={() => onSelect(result)}
            >
              {result.title}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

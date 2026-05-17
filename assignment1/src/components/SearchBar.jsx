export default function SearchBar({
  value,
  onChange,
  resultCount,
}) {
  return (
    <div className="search-bar" role="search">
      <label htmlFor="village-search">البحث</label>
      <div className="search-input-wrap">
        <input
          id="village-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="اسم القرية، القضاء، المدينة أو العائلة"
          autoComplete="off"
        />
        {value && (
          <button
            className="search-clear-button"
            type="button"
            onClick={() => onChange('')}
            aria-label="مسح البحث"
          >
            مسح
          </button>
        )}
        <span aria-live="polite">{resultCount} نتيجة</span>
      </div>
    </div>
  );
}

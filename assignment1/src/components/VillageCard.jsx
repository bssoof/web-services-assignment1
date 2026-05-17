export default function VillageCard({
  village,
  isSelected,
  onSelect,
  matchedFamilies = [],
}) {
  const visibleFamilyMatches = matchedFamilies.slice(0, 2);
  const extraFamilyMatches = matchedFamilies.length - visibleFamilyMatches.length;
  const hasFamilyMatches = matchedFamilies.length > 0;

  return (
    <button
      className={`village-card ${isSelected ? 'is-selected' : ''}`}
      type="button"
      onClick={() => onSelect(village)}
      aria-pressed={isSelected}
      aria-label={`${village.name_ar} - ${village.district_ar}`}
    >
      <span className="village-card__top-row">
        <span className="village-card__name">
          <strong>{village.name_ar}</strong>
          <small>{village.name_en}</small>
        </span>
        <span className="village-card__district-pill">{village.district_ar}</span>
      </span>

      <span className="village-card__meta">
        {village.district_ar} / {village.district_en}
      </span>
      {hasFamilyMatches && (
        <span className="village-card__match-count">{matchedFamilies.length} عائلات مطابقة</span>
      )}

      {visibleFamilyMatches.length > 0 && (
        <span className="village-card__family-matches" aria-label="عائلات مطابقة">
          <strong>عائلات مطابقة</strong>
          {visibleFamilyMatches.map((family) => (
            <span className="village-card__family-match" key={family.id}>
              <span>{family.name_ar}</span>
              <span>{family.story}</span>
            </span>
          ))}
          {extraFamilyMatches > 0 && (
            <span className="village-card__family-more">
              +{extraFamilyMatches} عائلة أخرى
            </span>
          )}
        </span>
      )}
    </button>
  );
}

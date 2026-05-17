import VillageCard from './VillageCard.jsx';

export default function VillageList({
  villages,
  selectedVillage,
  onSelect,
  familyMatchesByVillage = new Map(),
  totalVillages = 0,
  query = '',
}) {
  const isFiltering = query.length > 0;

  const subtitle = isFiltering
    ? `تمت مطابقة ${villages.length} من أصل ${totalVillages} قرية محلية`
    : selectedVillage
      ? 'يعرض اختيارك الحالي من الخريطة'
      : 'اختر قرية من الخريطة أو اكتب بحثًا';

  if (villages.length === 0) {
    return (
      <section className="village-list-panel" aria-label="قائمة القرى">
        <div className="village-list__header">
          <h2>القرى</h2>
          <p aria-live="polite">{subtitle}</p>
        </div>
        {isFiltering ? (
          <div className="empty-state village-list__empty" role="status">
            لا توجد قرى محلية مطابقة لعبارة "{query}". جرّب اسم قرية أو قضاء أو عائلة.
          </div>
        ) : (
          <div className="empty-state village-list__empty" role="status">
            لم يتم عرض القرى بعد. اختر قرية من الخريطة أو ابدأ البحث.
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="village-list-panel" aria-label="قائمة القرى">
      <div className="village-list__header">
        <h2>القرى</h2>
        <p aria-live="polite">{subtitle}</p>
      </div>

      <div className="village-list" role="list" aria-label="قائمة القرى">
        {villages.map((village) => (
          <VillageCard
            key={village.id}
            village={village}
            isSelected={selectedVillage?.id === village.id}
            onSelect={onSelect}
            matchedFamilies={familyMatchesByVillage.get(village.id) || []}
          />
        ))}
      </div>
    </section>
  );
}

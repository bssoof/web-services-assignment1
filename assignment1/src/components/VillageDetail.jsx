import { useEffect, useMemo, useState } from 'react';
import VillageMap from './VillageMap.jsx';

const SUMMARY_LIMIT = 950;
const FAMILIES_PAGE_SIZE = 4;
const DETAIL_TABS = [
  { id: 'facts', label: 'معلومات' },
  { id: 'gallery', label: 'المعرض' },
  { id: 'archive', label: 'الأرشيف' },
  { id: 'media-memory', label: 'نبض الذاكرة' },
  { id: 'families', label: 'العائلات' },
];

function normalizeSearchValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي');
}

function formatPopulation(value) {
  if (!value) {
    return 'غير متوفر';
  }

  return new Intl.NumberFormat('en-US').format(value);
}

function villageSourceLabel(village) {
  if (village?.source === 'wikipedia-search') {
    return 'نتيجة من بحث ويكيبيديا';
  }

  return 'بيانات محلية + ويكيبيديا';
}

function familyMatchesQuery(family, query) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return false;
  }

  return [
    family.name_ar,
    ...(family.aliases || []),
  ].some((value) => normalizeSearchValue(value).includes(normalizedQuery));
}

function VillageFamilies({ families, query }) {
  const [visibleCount, setVisibleCount] = useState(FAMILIES_PAGE_SIZE);

  const sortedFamilies = useMemo(() => {
    if (!query.trim()) {
      return families;
    }

    return [...families].sort(
      (first, second) => (
        Number(familyMatchesQuery(second, query)) - Number(familyMatchesQuery(first, query))
      ),
    );
  }, [families, query]);
  const matchingFamiliesCount = sortedFamilies.filter(
    (family) => familyMatchesQuery(family, query),
  ).length;
  const visibleFamilies = sortedFamilies.slice(0, visibleCount);
  const remainingFamilies = sortedFamilies.length - visibleFamilies.length;

  useEffect(() => {
    setVisibleCount(FAMILIES_PAGE_SIZE);
  }, [families, query]);

  return (
    <section className="families-content" aria-label="عائلات القرية">
      <div className="section-title-row">
        <h3>عائلات القرية</h3>
        <span>{families.length} موثق</span>
      </div>
      {query.trim() && matchingFamiliesCount > 0 && (
        <p className="families-match-hint">
          تم ترتيب العائلات بحيث تظهر المطابقات للبحث أولًا ({matchingFamiliesCount} مطابقة).
        </p>
      )}

      {families.length === 0 ? (
        <div className="empty-state families-empty" role="status">
          لا توجد بيانات عائلات موثقة محليًا لهذه القرية بعد.
        </div>
      ) : (
        <div className="families-list">
          {visibleFamilies.map((family) => (
            <article
              key={family.id}
              className={`family-card ${familyMatchesQuery(family, query) ? 'is-match' : ''}`}
            >
              <div>
                <h4>{family.name_ar}</h4>
                {family.aliases?.length > 0 && (
                  <p className="family-card__aliases">
                    أسماء مرتبطة: {family.aliases.join('، ')}
                  </p>
                )}
              </div>
              <p>{family.story}</p>
              {family.source_url && (
                <a href={family.source_url} target="_blank" rel="noreferrer">
                  المصدر: {family.source_name}
                </a>
              )}
            </article>
          ))}

          {remainingFamilies > 0 && (
            <button
              className="text-button families-more-button"
              type="button"
              onClick={() => setVisibleCount((current) => (
                Math.min(current + FAMILIES_PAGE_SIZE, sortedFamilies.length)
              ))}
            >
              عرض المزيد ({remainingFamilies})
            </button>
          )}

          {remainingFamilies === 0 && sortedFamilies.length > FAMILIES_PAGE_SIZE && (
            <button
              className="text-button families-more-button"
              type="button"
              onClick={() => setVisibleCount(FAMILIES_PAGE_SIZE)}
            >
              عرض أقل
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function VillageGallery({ galleryState, village }) {
  const { error, images, isLoading } = galleryState;

  return (
    <section className="gallery-content" aria-label="معرض صور القرية">
      <div className="section-title-row">
        <h3>المعرض</h3>
        <span>{images.length > 0 ? `${images.length} صور` : 'صور ويكيبيديا'}</span>
      </div>
      <p className="gallery-content__hint">
        صور مرتبطة بصفحة القرية في ويكيبيديا وWikimedia Commons عندما تكون متاحة.
      </p>

      {isLoading && (
        <div className="loading-state" role="status">
          جاري تحميل صور المعرض...
        </div>
      )}

      {error && (
        <div className="error-state" role="alert">
          تعذر تحميل صور المعرض الآن.
        </div>
      )}

      {!isLoading && !error && images.length === 0 && (
        <div className="empty-state gallery-empty" role="status">
          لا توجد صور إضافية متاحة لهذه القرية حاليًا.
        </div>
      )}

      {!isLoading && !error && images.length > 0 && (
        <div className="gallery-grid">
          {images.map((image) => (
            <a
              key={image.source}
              className="gallery-card"
              href={image.descriptionUrl || image.original || image.source}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={image.source}
                alt={`${image.title || 'صورة من المعرض'} - ${village.name_ar}`}
                loading="lazy"
              />
              <span>{image.description || image.title || 'صورة من المعرض'}</span>
              {(image.artist || image.license || image.credit) && (
                <small className="gallery-card__meta">
                  {image.artist && <span>المؤلف: {image.artist}</span>}
                  {image.license && <span>الرخصة: {image.license}</span>}
                  {!image.artist && image.credit && <span>الاعتماد: {image.credit}</span>}
                </small>
              )}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function VillageArchive({ archiveState }) {
  const { error, isLoading, items, total } = archiveState;

  function formatArchiveDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('ar', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  return (
    <section className="archive-content" aria-label="أرشيف القرية">
      <div className="section-title-row">
        <h3>الأرشيف</h3>
        <span>{total > 0 ? `${items.length} من ${total}` : 'أرشيف الإنترنت'}</span>
      </div>
      <p className="archive-content__hint">
        نتائج أرشيفية من أرشيف الإنترنت مرتبطة باسم القرية في العنوان أو الوصف أو الموضوع.
      </p>

      {isLoading && (
        <div className="loading-state" role="status">
          جاري البحث في Internet Archive...
        </div>
      )}

      {error && (
        <div className="error-state" role="alert">
          تعذر تحميل مواد الأرشيف الآن.
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="empty-state archive-empty" role="status">
          لا توجد مواد أرشيفية مرتبطة بهذا الاسم حاليًا.
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="archive-list">
          {items.map((item) => (
            <article key={item.id} className="archive-card">
              <div className="archive-card__header">
                <h4>{item.title}</h4>
                <span>{item.mediaLabel || item.mediatype}</span>
              </div>

              <div className="archive-card__meta">
                {item.date && <span>التاريخ: {formatArchiveDate(item.date)}</span>}
                {item.creator && <span>الجهة الأصلية موثقة داخل رابط المصدر</span>}
              </div>

              {item.description && <p>{item.description}</p>}
              {item.originalTitle && item.originalTitle !== item.title && (
                <small className="archive-card__original" dir="auto">
                  العنوان الأصلي محفوظ داخل رابط المصدر.
                </small>
              )}

              <a href={item.url} target="_blank" rel="noreferrer">
                فتح في الأرشيف
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatArabicDate(value) {
  if (!value) {
    return 'غير متوفر';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatSignalValue(value) {
  const normalizedValue = Number(value) || 0;

  return normalizedValue.toLocaleString('ar', {
    maximumFractionDigits: 4,
  });
}

function MediaMemoryTimeline({ months, onSelectMonth, selectedMonthId }) {
  const maxValue = Math.max(...months.map((month) => month.value), 0);

  return (
    <div className="media-memory-timeline" aria-label="خط زمني لمشاهدات ويكيبيديا">
      {months.map((month) => {
        const height = maxValue > 0 ? Math.max((month.value / maxValue) * 100, 8) : 0;

        return (
          <button
            key={month.id}
            className={`media-memory-month ${selectedMonthId === month.id ? 'is-selected' : ''}`}
            type="button"
            onClick={() => onSelectMonth(month.id)}
            aria-pressed={selectedMonthId === month.id}
          >
            <div className="media-memory-month__bar-wrap">
              <span
                className="media-memory-month__bar"
                style={{ height: `${height}%` }}
                title={`${month.label}: ${formatSignalValue(month.value)} مشاهدة`}
              />
            </div>
            <span>{month.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function VillageMediaMemory({ mediaMemoryState, onRefresh }) {
  const { data, error, isLoading } = mediaMemoryState;
  const hasBlockingError = Boolean(error && !data);
  const hasActivity = Boolean(data && data.activeDays > 0);
  const defaultMonthId = useMemo(() => {
    if (!data?.months?.length) {
      return null;
    }

    const activeMonths = data.months.filter((month) => month.activeDays > 0);

    if (activeMonths.length === 0) {
      return data.months[data.months.length - 1].id;
    }

    return [...activeMonths].sort((first, second) => second.value - first.value)[0].id;
  }, [data]);
  const [selectedMonthId, setSelectedMonthId] = useState(defaultMonthId);
  const selectedMonth = data?.months?.find((month) => month.id === selectedMonthId) || null;

  useEffect(() => {
    setSelectedMonthId(defaultMonthId);
  }, [defaultMonthId]);

  return (
    <section className="media-memory-content" aria-label="نبض ذاكرة القرية في ويكيبيديا">
      <div className="section-title-row">
        <h3>نبض الذاكرة</h3>
        <button
          className="text-button media-memory-refresh"
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
        >
          تحديث مشاهدات ويكيبيديا
        </button>
      </div>
      <p className="media-memory-content__hint">
        يعرض هذا القسم عدد مشاهدات صفحة القرية في ويكيبيديا العربية خلال آخر سنة كمؤشر على حضورها في الذاكرة العامة.
      </p>

      {isLoading && (
        <div className="loading-state" role="status">
          جاري تحميل مشاهدات ويكيبيديا...
        </div>
      )}

      {error && (
        <div className="error-state" role="alert">
          تعذر تحميل مشاهدات ويكيبيديا الآن. جرّب التحديث لاحقًا.
        </div>
      )}

      {!isLoading && !hasBlockingError && !hasActivity && (
        <div className="empty-state media-memory-empty" role="status">
          لا توجد مشاهدات مسجلة لهذه الصفحة ضمن الفترة الحالية.
        </div>
      )}

      {!isLoading && hasActivity && (
        <div className="media-memory-grid">
          <div className="media-memory-summary">
            <div>
              <span>أيام فيها مشاهدات</span>
              <strong>{data.activeDays}</strong>
            </div>
            <div>
              <span>أعلى يوم مشاهدة</span>
              <strong>{formatArabicDate(data.peak?.date)}</strong>
            </div>
            <div>
              <span>مجموع المشاهدات</span>
              <strong>{formatSignalValue(data.totalViews)}</strong>
            </div>
            <div>
              <span>آخر تحديث محفوظ</span>
              <strong>
                {data.cachedAt ? formatArabicDate(data.cachedAt) : 'هذا العرض'}
              </strong>
            </div>
            <div>
              <span>المصدر</span>
              <strong>{data.source || 'Wikimedia Pageviews API'}</strong>
            </div>
          </div>
          {data.pageUrl && (
            <a className="media-memory-page-link" href={data.pageUrl} target="_blank" rel="noreferrer">
              فتح صفحة ويكيبيديا التي تم قياس مشاهداتها
            </a>
          )}

          <MediaMemoryTimeline
            months={data.months}
            onSelectMonth={setSelectedMonthId}
            selectedMonthId={selectedMonthId}
          />

          {selectedMonth && (
            <div className="media-memory-mentions">
              <div className="media-memory-mentions__header">
                <h4>أيام المشاهدة في {selectedMonth.label}</h4>
                <span>{formatSignalValue(selectedMonth.value)} مشاهدة</span>
              </div>

              {selectedMonth.mentions.length === 0 ? (
                <div className="empty-state media-memory-empty" role="status">
                  لا توجد مشاهدات مسجلة في هذا الشهر.
                </div>
              ) : (
                <div className="media-memory-mentions__list">
                  {selectedMonth.mentions.map((mention) => (
                    <div key={mention.date}>
                      <div className="media-memory-mention__top">
                        <span>{formatArabicDate(mention.date)}</span>
                        <strong>مشاهدات: {formatSignalValue(mention.value)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function VillageFacts({ coordinates, village, wikipediaTitle }) {
  return (
    <dl className="facts-grid">
      <div>
        <dt>القضاء</dt>
        <dd>{village.district_ar || 'غير متوفر'} / {village.district_en || 'N/A'}</dd>
      </div>
      <div>
        <dt>عدد السكان عام 1945</dt>
        <dd>{formatPopulation(village.population_1945)}</dd>
      </div>
      <div>
        <dt>الإحداثيات</dt>
        <dd dir="ltr">{coordinates}</dd>
      </div>
      <div>
        <dt>صفحة ويكيبيديا العربية</dt>
        <dd>{wikipediaTitle}</dd>
      </div>
    </dl>
  );
}

function WikipediaSummary({ data, error, extract, isExpanded, isLoading, onToggleExpand, village, visibleExtract, wikipediaTitle }) {
  const canExpandExtract = Boolean(data?.extract && data.extract.length > SUMMARY_LIMIT);

  return (
    <div className="wiki-content">
      <h3>ملخص ويكيبيديا</h3>
      <p className="wiki-content__hint">
        يعرض الملخص التالي من ويكيبيديا العربية للعنوان: <strong>{wikipediaTitle}</strong>
      </p>

      {isLoading && (
        <div className="loading-state" role="status">
          جاري جلب بيانات ويكيبيديا...
        </div>
      )}

      {error && (
        <div className="error-state" role="alert">
          تعذر جلب بيانات ويكيبيديا الآن. البيانات المحلية ما زالت متاحة.
        </div>
      )}

      {data?.missing && (
        <div className="error-state" role="status">
          لا توجد صفحة ويكيبيديا مؤكدة لهذا العنوان.
        </div>
      )}

      {data && !data.missing && (
        <article className={`summary-block ${data.thumbnail ? '' : 'summary-block--text-only'}`}>
          {data.thumbnail && (
            <img
              src={data.thumbnail}
              alt={`صورة من ويكيبيديا عن ${village.name_ar}`}
              loading="lazy"
            />
          )}
          <div className="summary-text">
            <p className="summary-text__title">{data.title}</p>
            <p>{visibleExtract}</p>
            {canExpandExtract && (
              <button
                className="text-button"
                type="button"
                onClick={onToggleExpand}
              >
                {isExpanded ? 'عرض أقل' : 'عرض النص كاملًا'}
              </button>
            )}
          </div>
        </article>
      )}

      {!isLoading && !error && !data && (
        <div className="empty-state wiki-empty" role="status">
          لا توجد بيانات ويكيبيديا معروضة حاليًا.
        </div>
      )}
    </div>
  );
}

function VillageOverview({
  coordinates,
  data,
  error,
  extract,
  isExpanded,
  isLoading,
  localVillages,
  onSelectVillage,
  onToggleExpand,
  village,
  visibleExtract,
  wikipediaTitle,
}) {
  return (
    <div className="overview-content">
      <VillageFacts
        coordinates={coordinates}
        village={village}
        wikipediaTitle={wikipediaTitle}
      />

      <div className="overview-main">
        <div className="overview-card overview-card--map">
          <VillageMap
            villages={localVillages}
            selectedVillage={village}
            onSelectVillage={onSelectVillage}
          />
        </div>

        <div className="overview-card overview-card--wiki">
          <WikipediaSummary
            data={data}
            error={error}
            extract={extract}
            isExpanded={isExpanded}
            isLoading={isLoading}
            onToggleExpand={onToggleExpand}
            village={village}
            visibleExtract={visibleExtract}
            wikipediaTitle={wikipediaTitle}
          />
        </div>
      </div>
    </div>
  );
}

export default function VillageDetail({
  village,
  wikiState,
  galleryState = { error: null, images: [], isLoading: false },
  archiveState = { error: null, isLoading: false, items: [], total: 0 },
  mediaMemoryState = { data: null, error: null, isLoading: false },
  families = [],
  query = '',
  localVillages = [],
  onSelectVillage,
  onRequestMediaMemory,
  onRefreshMediaMemory,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('facts');
  const { data, error, isLoading } = wikiState;
  const extract = data?.extract || 'لا يوجد ملخص متاح لهذه الصفحة.';
  const canExpandExtract = Boolean(data?.extract && data.extract.length > SUMMARY_LIMIT);
  const visibleExtract = useMemo(() => {
    if (!canExpandExtract || isExpanded) {
      return extract;
    }

    return `${extract.slice(0, SUMMARY_LIMIT).trim()}...`;
  }, [canExpandExtract, extract, isExpanded]);

  useEffect(() => {
    setIsExpanded(false);
    setActiveTab('facts');
  }, [village?.id, wikiState.data?.title]);

  function handleTabSelect(tabId) {
    const isNewTab = tabId !== activeTab;
    setActiveTab(tabId);

    if (isNewTab && tabId === 'media-memory' && village) {
      onRequestMediaMemory?.(village);
    }
  }

  if (!village) {
    return (
      <section className="detail-panel" aria-label="تفاصيل القرية">
        <VillageMap
          villages={localVillages}
          selectedVillage={null}
          onSelectVillage={onSelectVillage}
        />
        <div className="empty-state detail-panel__empty-state" role="status">
          اختر قرية من الخريطة أو ابحث عنها لعرض التفاصيل والعائلات.
        </div>
      </section>
    );
  }

  const coordinates = village.coordinates
    ? `${village.coordinates.lat.toFixed(3)}, ${village.coordinates.lon.toFixed(3)}`
    : 'غير متوفر';
  const wikipediaTitle = village.wikipedia_title_ar || village.wikipedia_title;

  return (
    <section className="detail-panel" aria-label={`تفاصيل ${village.name_ar}`}>
      <div className="detail-panel__header">
        <div>
          <h2>{village.name_ar}</h2>
          <p>{village.name_en}</p>
        </div>
        <div className="detail-panel__header-meta">
          <span>{village.district_ar}</span>
          <small>{villageSourceLabel(village)}</small>
        </div>
      </div>

      <div className="detail-tabs" role="tablist" aria-label="أقسام تفاصيل القرية">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            id={`detail-tab-${tab.id}`}
            className={`detail-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`detail-panel-${tab.id}`}
            onClick={() => handleTabSelect(tab.id)}
          >
            {tab.label}
            {tab.id === 'gallery' && galleryState.images.length > 0 && (
              <span>{galleryState.images.length}</span>
            )}
            {tab.id === 'archive' && archiveState.items.length > 0 && (
              <span>{archiveState.items.length}</span>
            )}
            {tab.id === 'media-memory' && mediaMemoryState.data?.activeDays > 0 && (
              <span>{mediaMemoryState.data.activeDays}</span>
            )}
            {tab.id === 'families' && families.length > 0 && (
              <span>{families.length}</span>
            )}
          </button>
        ))}
      </div>

      <div
        id={`detail-panel-${activeTab}`}
        className="detail-tab-panel"
        role="tabpanel"
        aria-labelledby={`detail-tab-${activeTab}`}
      >
        {activeTab === 'facts' && (
          <VillageOverview
            coordinates={coordinates}
            data={data}
            error={error}
            extract={extract}
            isExpanded={isExpanded}
            isLoading={isLoading}
            localVillages={localVillages}
            onSelectVillage={onSelectVillage}
            onToggleExpand={() => setIsExpanded((current) => !current)}
            village={village}
            visibleExtract={visibleExtract}
            wikipediaTitle={wikipediaTitle}
          />
        )}

        {activeTab === 'gallery' && (
          <VillageGallery galleryState={galleryState} village={village} />
        )}

        {activeTab === 'archive' && (
          <VillageArchive archiveState={archiveState} />
        )}

        {activeTab === 'media-memory' && (
          <VillageMediaMemory
            mediaMemoryState={mediaMemoryState}
            onRefresh={() => onRefreshMediaMemory?.(village)}
          />
        )}

        {activeTab === 'families' && (
          <VillageFamilies families={families} query={query} />
        )}
      </div>
    </section>
  );
}

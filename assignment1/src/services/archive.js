const ARCHIVE_SEARCH_ENDPOINT = 'https://archive.org/advancedsearch.php';
const ARCHIVE_ITEM_BASE_URL = 'https://archive.org/details/';
const ARCHIVE_RESULT_LIMIT = 6;
const ARCHIVE_FIELDS = [
  'identifier',
  'title',
  'creator',
  'date',
  'mediatype',
  'description',
  'subject',
];
const ARABIC_ARCHIVE_NOTES = {
  'youtube-1UnSTi0qTSQ': 'مقطع وثائقي يتناول محو معالم بلدات وقرى فلسطينية بعد عام 1948، ويذكر صفورية ضمن القرى المعروضة.',
  'lexil-des-juifs-entre-mythe-et-histoire-2012-ilan-ziv-arte-onf-version-non-censuree': 'فيلم وثائقي يناقش سردية المنفى في تاريخ فلسطين والمنطقة، ويرد فيه ذكر صفورية ضمن السياق التاريخي.',
};
const ARCHIVE_MEDIA_LABELS = {
  texts: 'نص',
  image: 'صورة',
  movies: 'فيديو',
  audio: 'تسجيل صوتي',
  collection: 'مجموعة',
};

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function quoteArchiveTerm(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function cleanText(value) {
  const rawValue = Array.isArray(value) ? value.join('، ') : String(value || '');

  return rawValue
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasArabicText(value) {
  return /[\u0600-\u06FF]/.test(String(value || ''));
}

function normalizeCreator(value) {
  const creator = cleanText(value);
  return creator || null;
}

function normalizeDescription(value) {
  const description = cleanText(value);

  if (description.length <= 280) {
    return description || null;
  }

  return `${description.slice(0, 280).trim()}...`;
}

function getMediaLabel(mediatype) {
  return ARCHIVE_MEDIA_LABELS[cleanText(mediatype)] || 'مادة';
}

function buildArabicTitle(item, village, mediaLabel) {
  const title = cleanText(item.title);

  if (hasArabicText(title)) {
    return title;
  }

  return `${mediaLabel} أرشيفي عن ${village.name_ar || 'القرية'}`;
}

function buildArabicDescription(item, village, mediaLabel) {
  const knownNote = ARABIC_ARCHIVE_NOTES[item.identifier];

  if (knownNote) {
    return knownNote;
  }

  const description = normalizeDescription(item.description);

  if (hasArabicText(description)) {
    return description;
  }

  const villageName = village.name_ar || village.wikipedia_title_ar || 'هذه القرية';

  return `مادة ${mediaLabel} محفوظة في أرشيف الإنترنت وتظهر لأنها مرتبطة باسم ${villageName} ضمن بيانات العنوان أو الوصف أو الموضوع. افتح المصدر للاطلاع على المادة الأصلية.`;
}

function buildArchiveQuery(searchTerms) {
  const fieldQueries = searchTerms.flatMap((term) => {
    const quotedTerm = quoteArchiveTerm(term);

    return [
      `title:${quotedTerm}`,
      `description:${quotedTerm}`,
      `subject:${quotedTerm}`,
    ];
  });

  return `(${fieldQueries.join(' OR ')}) AND (mediatype:texts OR mediatype:image OR mediatype:movies)`;
}

export function getArchiveSearchTerms(village) {
  return uniqueValues([
    village?.wikipedia_title,
    village?.wikipedia_title_ar,
    village?.name_en,
    village?.name_ar,
  ]);
}

export function buildArchiveSearchUrl(villageOrTerms) {
  const searchTerms = Array.isArray(villageOrTerms)
    ? uniqueValues(villageOrTerms)
    : getArchiveSearchTerms(villageOrTerms);

  if (searchTerms.length === 0) {
    throw new Error('Archive search term is required');
  }

  const params = new URLSearchParams({
    q: buildArchiveQuery(searchTerms),
    rows: String(ARCHIVE_RESULT_LIMIT),
    page: '1',
    output: 'json',
  });

  ARCHIVE_FIELDS.forEach((field) => {
    params.append('fl[]', field);
  });
  params.append('sort[]', 'downloads desc');

  return `${ARCHIVE_SEARCH_ENDPOINT}?${params.toString()}`;
}

export async function fetchVillageArchive(village, options = {}) {
  const searchTerms = getArchiveSearchTerms(village);

  if (searchTerms.length === 0) {
    return { items: [], total: 0 };
  }

  const response = await fetch(buildArchiveSearchUrl(searchTerms), {
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Internet Archive data: ${response.status}`);
  }

  const data = await response.json();
  const docs = data.response?.docs || [];

  return {
    total: Number(data.response?.numFound || docs.length),
    items: docs
      .filter((item) => item.identifier)
      .map((item) => {
        const mediaLabel = getMediaLabel(item.mediatype);

        return {
          id: item.identifier,
          title: buildArabicTitle(item, village, mediaLabel),
          originalTitle: cleanText(item.title) || item.identifier,
          creator: normalizeCreator(item.creator),
          date: cleanText(item.date) || null,
          mediatype: cleanText(item.mediatype) || 'archive item',
          mediaLabel,
          description: buildArabicDescription(item, village, mediaLabel),
          url: `${ARCHIVE_ITEM_BASE_URL}${encodeURIComponent(item.identifier)}`,
        };
      }),
  };
}

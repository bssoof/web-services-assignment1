const WIKIPEDIA_ENDPOINT = 'https://ar.wikipedia.org/w/api.php';
const GALLERY_IMAGE_LIMIT = 8;
const GALLERY_IMAGE_FETCH_LIMIT = 30;
const SUPPORTED_GALLERY_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const DECORATIVE_IMAGE_WORDS = [
  'flag',
  'symbol',
  'coat of arms',
  'icon',
  'logo',
  'monogram',
  'geography',
  'location map',
  'stub',
  'portal',
  'p moai',
  'christianity',
];

export function buildWikipediaSummaryUrl(title) {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts|pageimages',
    redirects: '1',
    exintro: 'true',
    explaintext: 'true',
    piprop: 'thumbnail',
    pithumbsize: '400',
    titles: title,
    format: 'json',
    formatversion: '2',
    origin: '*',
  });

  return `${WIKIPEDIA_ENDPOINT}?${params.toString()}`;
}

export function buildWikipediaSearchUrl(query) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '5',
    format: 'json',
    formatversion: '2',
    origin: '*',
  });

  return `${WIKIPEDIA_ENDPOINT}?${params.toString()}`;
}

export function buildWikipediaGalleryUrl(title) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'images',
    gimlimit: String(GALLERY_IMAGE_FETCH_LIMIT),
    prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: '640',
    redirects: '1',
    titles: title,
    format: 'json',
    formatversion: '2',
    origin: '*',
  });

  return `${WIKIPEDIA_ENDPOINT}?${params.toString()}`;
}

function cleanImageTitle(title) {
  return String(title || '')
    .replace(/^(ملف|File):/i, '')
    .replace(/\.(jpe?g|png|webp)$/i, '')
    .replace(/[_]+/g, ' ')
    .trim();
}

function decodeHtmlEntities(value) {
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanMetadataValue(value) {
  return decodeHtmlEntities(String(value || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMetadataValue(extmetadata, keys) {
  for (const key of keys) {
    const value = cleanMetadataValue(extmetadata?.[key]?.value);

    if (value) {
      return value;
    }
  }

  return null;
}

function isDecorativeImage(image) {
  const searchableText = [
    image.title,
    image.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return DECORATIVE_IMAGE_WORDS.some((word) => searchableText.includes(word));
}

export async function fetchVillageSummary(title, options = {}) {
  if (!title || !title.trim()) {
    throw new Error('Wikipedia title is required');
  }

  const response = await fetch(buildWikipediaSummaryUrl(title.trim()), {
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Wikipedia data: ${response.status}`);
  }

  const data = await response.json();
  const page = data.query?.pages?.[0];

  if (!page || page.missing) {
    return {
      title,
      extract: null,
      thumbnail: null,
      missing: true,
    };
  }

  return {
    title: page.title,
    extract: page.extract || null,
    thumbnail: page.thumbnail?.source || null,
    missing: false,
  };
}

export async function searchWikipediaPages(query, options = {}) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const response = await fetch(buildWikipediaSearchUrl(normalizedQuery), {
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to search Wikipedia data: ${response.status}`);
  }

  const data = await response.json();

  return (data.query?.search || []).map((result) => ({
    pageid: result.pageid,
    title: result.title,
  }));
}

export async function fetchVillageGallery(title, options = {}) {
  if (!title || !title.trim()) {
    throw new Error('Wikipedia title is required');
  }

  const response = await fetch(buildWikipediaGalleryUrl(title.trim()), {
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Wikipedia gallery data: ${response.status}`);
  }

  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  const imageUrls = new Set();

  return pages
    .map((page) => {
      const imageInfo = page.imageinfo?.[0];
      const extmetadata = imageInfo?.extmetadata || {};

      return {
        title: cleanImageTitle(page.title),
        description: getMetadataValue(extmetadata, ['ImageDescription', 'ObjectName']),
        source: imageInfo?.thumburl || imageInfo?.url || null,
        original: imageInfo?.url || null,
        descriptionUrl: imageInfo?.descriptionurl || null,
        artist: getMetadataValue(extmetadata, ['Artist', 'Attribution']),
        credit: getMetadataValue(extmetadata, ['Credit']),
        license: getMetadataValue(extmetadata, ['LicenseShortName', 'UsageTerms']),
        mime: imageInfo?.mime || null,
      };
    })
    .filter((image) => {
      if (!image.source || !SUPPORTED_GALLERY_MIME_TYPES.has(image.mime)) {
        return false;
      }

      if (imageUrls.has(image.source) || isDecorativeImage(image)) {
        return false;
      }

      imageUrls.add(image.source);
      return true;
    })
    .slice(0, GALLERY_IMAGE_LIMIT);
}

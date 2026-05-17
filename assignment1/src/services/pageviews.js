const PAGEVIEWS_ENDPOINT = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';
const PAGEVIEWS_PROJECT = 'ar.wikipedia.org';
const PAGEVIEWS_ACCESS = 'all-access';
const PAGEVIEWS_AGENT = 'user';
const PAGEVIEWS_GRANULARITY = 'daily';
const PAGEVIEWS_LOOKBACK_DAYS = 365;

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatApiDate(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    '00',
  ].join('');
}

function defaultDateRange() {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - PAGEVIEWS_LOOKBACK_DAYS);

  return {
    end: formatApiDate(end),
    start: formatApiDate(start),
  };
}

function normalizeArticleTitle(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_');
}

function parsePageviewTimestamp(value) {
  const match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})/);

  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function monthLabel(monthId) {
  const [year, month] = monthId.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));

  return new Intl.DateTimeFormat('ar', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function emptyPageviews(articleTitle = '') {
  return {
    activeDays: 0,
    articleTitle,
    months: [],
    pageUrl: articleTitle ? `https://ar.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}` : '',
    peak: null,
    query: articleTitle,
    source: 'Wikimedia Pageviews API',
    totalViews: 0,
  };
}

export function getPageviewsArticleTitle(village) {
  return normalizeArticleTitle(
    village?.wikipedia_title_ar
      || village?.wikipedia_title
      || village?.name_ar
      || village?.name_en,
  );
}

export function buildPageviewsUrl(villageOrTitle, options = {}) {
  const articleTitle = typeof villageOrTitle === 'string'
    ? normalizeArticleTitle(villageOrTitle)
    : getPageviewsArticleTitle(villageOrTitle);

  if (!articleTitle) {
    throw new Error('Wikimedia pageviews article title is required');
  }

  const range = {
    ...defaultDateRange(),
    ...options,
  };
  const encodedTitle = encodeURIComponent(articleTitle);

  return [
    PAGEVIEWS_ENDPOINT,
    PAGEVIEWS_PROJECT,
    PAGEVIEWS_ACCESS,
    PAGEVIEWS_AGENT,
    encodedTitle,
    PAGEVIEWS_GRANULARITY,
    range.start,
    range.end,
  ].join('/');
}

export function normalizePageviews(data, articleTitle = '') {
  const items = data?.items || [];

  if (items.length === 0) {
    return emptyPageviews(articleTitle);
  }

  const months = new Map();
  const activePoints = [];
  let totalViews = 0;

  items.forEach((item) => {
    const date = parsePageviewTimestamp(item.timestamp);

    if (!date) {
      return;
    }

    const views = Number(item.views) || 0;
    const monthId = date.slice(0, 7);
    const existingMonth = months.get(monthId) || {
      activeDays: 0,
      id: monthId,
      label: monthLabel(monthId),
      mentions: [],
      value: 0,
    };

    existingMonth.value += views;
    totalViews += views;

    if (views > 0) {
      existingMonth.activeDays += 1;
      existingMonth.mentions.push({ date, value: views });
      activePoints.push({ date, value: views });
    }

    months.set(monthId, existingMonth);
  });

  const peak = activePoints
    .sort((first, second) => second.value - first.value)[0] || null;

  return {
    activeDays: activePoints.length,
    articleTitle,
    months: [...months.values()].slice(-12),
    pageUrl: articleTitle ? `https://ar.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}` : '',
    peak,
    query: articleTitle,
    source: 'Wikimedia Pageviews API',
    totalViews,
  };
}

async function fetchPageviewsData(url, options = {}) {
  const response = await fetch(url, {
    signal: options.signal,
  });

  if (response.status === 404) {
    return { items: [] };
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch Wikimedia pageviews data: ${response.status}`);
  }

  return response.json();
}

export async function fetchVillagePageviews(village, options = {}) {
  const articleTitle = getPageviewsArticleTitle(village);

  if (!articleTitle) {
    return emptyPageviews();
  }

  const data = await fetchPageviewsData(buildPageviewsUrl(articleTitle, options), options);

  return normalizePageviews(data, articleTitle);
}

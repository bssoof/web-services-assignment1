import { describe, expect, it, vi } from 'vitest';
import {
  buildPageviewsUrl,
  fetchVillagePageviews,
  getPageviewsArticleTitle,
  normalizePageviews,
} from './pageviews.js';

const pageviewsResponse = {
  items: [
    {
      timestamp: '2026022000',
      views: 15,
    },
    {
      timestamp: '2026022100',
      views: 9,
    },
    {
      timestamp: '2026030100',
      views: 0,
    },
  ],
};

const village = {
  name_ar: 'سفورية',
  name_en: 'Saffuriyya',
  wikipedia_title: 'Saffuriyya',
  wikipedia_title_ar: 'صفورية',
};

describe('pageviews service', () => {
  it('builds a Wikimedia Pageviews API URL for an Arabic article', () => {
    const url = new URL(buildPageviewsUrl(village, {
      end: '2026022800',
      start: '2026020100',
    }));

    expect(url.origin).toBe('https://wikimedia.org');
    expect(url.pathname).toContain('/api/rest_v1/metrics/pageviews/per-article');
    expect(url.pathname).toContain('/ar.wikipedia.org/all-access/user/');
    expect(decodeURIComponent(url.pathname)).toContain('/صفورية/daily/2026020100/2026022800');
  });

  it('prefers the Arabic Wikipedia title for pageviews', () => {
    expect(getPageviewsArticleTitle(village)).toBe('صفورية');
    expect(getPageviewsArticleTitle({ name_en: 'Deir Yassin' })).toBe('Deir_Yassin');
  });

  it('normalizes daily pageviews into a monthly timeline', () => {
    expect(normalizePageviews(pageviewsResponse, 'صفورية')).toMatchObject({
      activeDays: 2,
      articleTitle: 'صفورية',
      pageUrl: 'https://ar.wikipedia.org/wiki/%D8%B5%D9%81%D9%88%D8%B1%D9%8A%D8%A9',
      peak: { date: '2026-02-20', value: 15 },
      totalViews: 24,
    });

    const timeline = normalizePageviews(pageviewsResponse, 'صفورية');
    expect(timeline.months).toHaveLength(2);
    expect(timeline.months[0]).toMatchObject({
      activeDays: 2,
      id: '2026-02',
      value: 24,
    });
    expect(timeline.months[0].mentions).toEqual([
      { date: '2026-02-20', value: 15 },
      { date: '2026-02-21', value: 9 },
    ]);
    expect(timeline.months[1]).toMatchObject({
      activeDays: 0,
      id: '2026-03',
      value: 0,
    });
  });

  it('fetches and normalizes pageviews data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => pageviewsResponse,
        status: 200,
      })),
    );

    await expect(fetchVillagePageviews(village, {
      end: '2026022800',
      start: '2026020100',
    })).resolves.toMatchObject({
      activeDays: 2,
      totalViews: 24,
    });
  });

  it('treats a missing pageviews article as an empty timeline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
      })),
    );

    await expect(fetchVillagePageviews(village)).resolves.toMatchObject({
      activeDays: 0,
      months: [],
      totalViews: 0,
    });
  });

  it('throws a clear error when the pageviews request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
      })),
    );

    await expect(fetchVillagePageviews(village)).rejects.toThrow(
      'Failed to fetch Wikimedia pageviews data: 500',
    );
  });
});

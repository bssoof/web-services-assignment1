import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildWikipediaGalleryUrl,
  buildWikipediaSearchUrl,
  buildWikipediaSummaryUrl,
  fetchVillageGallery,
  fetchVillageSummary,
  searchWikipediaPages,
} from './wikipedia.js';

describe('wikipedia service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a MediaWiki Action API URL with the required REST query parameters', () => {
    const url = new URL(buildWikipediaSummaryUrl('صفورية'));

    expect(url.origin).toBe('https://ar.wikipedia.org');
    expect(url.pathname).toBe('/w/api.php');
    expect(url.searchParams.get('action')).toBe('query');
    expect(url.searchParams.get('prop')).toBe('extracts|pageimages');
    expect(url.searchParams.get('redirects')).toBe('1');
    expect(url.searchParams.get('titles')).toBe('صفورية');
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('origin')).toBe('*');
  });

  it('builds a MediaWiki search URL for Arabic Wikipedia lookup', () => {
    const url = new URL(buildWikipediaSearchUrl('يافا'));

    expect(url.origin).toBe('https://ar.wikipedia.org');
    expect(url.pathname).toBe('/w/api.php');
    expect(url.searchParams.get('action')).toBe('query');
    expect(url.searchParams.get('list')).toBe('search');
    expect(url.searchParams.get('srsearch')).toBe('يافا');
    expect(url.searchParams.get('srlimit')).toBe('5');
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('origin')).toBe('*');
  });

  it('builds a MediaWiki gallery URL for linked page images', () => {
    const url = new URL(buildWikipediaGalleryUrl('صفورية'));

    expect(url.origin).toBe('https://ar.wikipedia.org');
    expect(url.pathname).toBe('/w/api.php');
    expect(url.searchParams.get('action')).toBe('query');
    expect(url.searchParams.get('generator')).toBe('images');
    expect(url.searchParams.get('prop')).toBe('imageinfo');
    expect(url.searchParams.get('iiprop')).toBe('url|mime|extmetadata');
    expect(url.searchParams.get('titles')).toBe('صفورية');
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('origin')).toBe('*');
  });

  it('returns summary data when Wikipedia responds with a page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: [
              {
                title: 'صفورية',
                extract: 'صفورية قرية فلسطينية مهجرة.',
                thumbnail: { source: 'https://example.com/image.jpg' },
              },
            ],
          },
        }),
      }),
    );

    await expect(fetchVillageSummary('صفورية')).resolves.toEqual({
      title: 'صفورية',
      extract: 'صفورية قرية فلسطينية مهجرة.',
      thumbnail: 'https://example.com/image.jpg',
      missing: false,
    });
  });

  it('returns a missing state instead of throwing when the page does not exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: [{ title: 'Missing title', missing: true }],
          },
        }),
      }),
    );

    await expect(fetchVillageSummary('Missing title')).resolves.toEqual({
      title: 'Missing title',
      extract: null,
      thumbnail: null,
      missing: true,
    });
  });

  it('throws a clear error when the HTTP request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    await expect(fetchVillageSummary('Saffuriyya')).rejects.toThrow(
      'Failed to fetch Wikipedia data: 503',
    );
  });

  it('returns gallery images and filters unsupported decorative files', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              1: {
                title: 'ملف:Saffuriyya landscape.jpg',
                imageinfo: [
                  {
                    thumburl: 'https://example.com/thumb.jpg',
                    url: 'https://example.com/full.jpg',
                    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Saffuriyya_landscape.jpg',
                    mime: 'image/jpeg',
                    extmetadata: {
                      ImageDescription: { value: 'Saffuriyya landscape near the village' },
                      Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Example">Example photographer</a>' },
                      Credit: { value: '<span class="int-own-work">Own work</span>' },
                      LicenseShortName: { value: 'CC BY-SA 4.0' },
                    },
                  },
                ],
              },
              2: {
                title: 'ملف:Flag of Palestine.svg',
                imageinfo: [
                  {
                    thumburl: 'https://example.com/flag.png',
                    url: 'https://example.com/flag.svg',
                    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Flag_of_Palestine.svg',
                    mime: 'image/svg+xml',
                  },
                ],
              },
              3: {
                title: 'ملف:P geography.png',
                imageinfo: [
                  {
                    thumburl: 'https://example.com/p-geography-thumb.png',
                    url: 'https://example.com/p-geography.png',
                    descriptionurl: 'https://commons.wikimedia.org/wiki/File:P_geography.png',
                    mime: 'image/png',
                  },
                ],
              },
              4: {
                title: 'ملف:Beit_Nattif_1948.jpg',
                imageinfo: [
                  {
                    thumburl: 'https://example.com/city-icon-thumb.jpg',
                    url: 'https://example.com/city-icon.jpg',
                    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Beit_Nattif_1948.jpg',
                    mime: 'image/jpeg',
                    extmetadata: {
                      ImageDescription: { value: 'City Icon' },
                    },
                  },
                ],
              },
            },
          },
        }),
      }),
    );

    await expect(fetchVillageGallery('صفورية')).resolves.toEqual([
      {
        title: 'Saffuriyya landscape',
        description: 'Saffuriyya landscape near the village',
        source: 'https://example.com/thumb.jpg',
        original: 'https://example.com/full.jpg',
        descriptionUrl: 'https://commons.wikimedia.org/wiki/File:Saffuriyya_landscape.jpg',
        artist: 'Example photographer',
        credit: 'Own work',
        license: 'CC BY-SA 4.0',
        mime: 'image/jpeg',
      },
    ]);
  });

  it('returns Arabic Wikipedia search results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            search: [
              { pageid: 100, title: 'يافا' },
              { pageid: 101, title: 'عائلة الخالدي' },
            ],
          },
        }),
      }),
    );

    await expect(searchWikipediaPages('يافا')).resolves.toEqual([
      { pageid: 100, title: 'يافا' },
      { pageid: 101, title: 'عائلة الخالدي' },
    ]);
  });

  it('does not call Wikipedia search for a one-character query', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchWikipediaPages('ي')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

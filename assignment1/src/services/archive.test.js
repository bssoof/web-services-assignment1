import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildArchiveSearchUrl,
  fetchVillageArchive,
  getArchiveSearchTerms,
} from './archive.js';

const village = {
  name_ar: 'صفورية',
  name_en: 'Saffuriyya',
  wikipedia_title: 'Saffuriyya',
  wikipedia_title_ar: 'صفورية',
};

describe('archive service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds an Internet Archive advanced search URL for village names', () => {
    const url = new URL(buildArchiveSearchUrl(village));

    expect(url.origin).toBe('https://archive.org');
    expect(url.pathname).toBe('/advancedsearch.php');
    expect(url.searchParams.get('output')).toBe('json');
    expect(url.searchParams.get('rows')).toBe('6');
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.getAll('fl[]')).toContain('identifier');
    expect(url.searchParams.getAll('fl[]')).toContain('description');
    expect(url.searchParams.get('q')).toContain('title:"Saffuriyya"');
    expect(url.searchParams.get('q')).toContain('description:"صفورية"');
  });

  it('deduplicates archive search terms from village fields', () => {
    expect(getArchiveSearchTerms({
      name_ar: 'صفورية',
      name_en: 'Saffuriyya',
      wikipedia_title: 'Saffuriyya',
      wikipedia_title_ar: 'صفورية',
    })).toEqual(['Saffuriyya', 'صفورية']);
  });

  it('normalizes Internet Archive search results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: {
            numFound: 8,
            docs: [
              {
                identifier: 'youtube-1UnSTi0qTSQ',
                title: 'The Erasure of Palestinian Towns',
                creator: ['1948: Creation & Catastrophe'],
                date: '2024-04-01T00:00:00Z',
                mediatype: 'movies',
                description: '<p>Archive record about al-Saffuriyya.</p>',
              },
            ],
          },
        }),
      }),
    );

    await expect(fetchVillageArchive(village)).resolves.toEqual({
      total: 8,
      items: [
        {
          id: 'youtube-1UnSTi0qTSQ',
          title: 'فيديو أرشيفي عن صفورية',
          originalTitle: 'The Erasure of Palestinian Towns',
          creator: '1948: Creation & Catastrophe',
          date: '2024-04-01T00:00:00Z',
          mediatype: 'movies',
          mediaLabel: 'فيديو',
          description: 'مقطع وثائقي يتناول محو معالم بلدات وقرى فلسطينية بعد عام 1948، ويذكر صفورية ضمن القرى المعروضة.',
          url: 'https://archive.org/details/youtube-1UnSTi0qTSQ',
        },
      ],
    });
  });

  it('returns an empty archive state when no search term exists', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchVillageArchive({})).resolves.toEqual({ items: [], total: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws a clear error when Internet Archive request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    await expect(fetchVillageArchive(village)).rejects.toThrow(
      'Failed to fetch Internet Archive data: 503',
    );
  });
});

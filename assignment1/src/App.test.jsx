import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const villages = [
  {
    id: 'saffuriyya',
    name_ar: 'سفورية',
    name_en: 'Saffuriyya',
    district_ar: 'الناصرة',
    district_en: 'Nazareth',
    coordinates: { lat: 32.752, lon: 35.281 },
    population_1945: 4330,
    wikipedia_title: 'Saffuriyya',
    wikipedia_title_ar: 'صفورية',
  },
  {
    id: 'lifta',
    name_ar: 'لفتا',
    name_en: 'Lifta',
    district_ar: 'القدس',
    district_en: 'Jerusalem',
    coordinates: { lat: 31.789, lon: 35.185 },
    population_1945: 2550,
    wikipedia_title: 'Lifta',
    wikipedia_title_ar: 'لفتا',
  },
];

const families = [
  {
    id: 'saffuriyya-al-khatib',
    village_id: 'saffuriyya',
    name_ar: 'الخطيب',
    aliases: ['خطيب'],
    story: 'الخطيب مذكورة ضمن عائلات صفورية في مصدر موثق.',
    source_name: 'مصدر صفورية',
    source_url: 'https://example.com/saffuriyya',
  },
  {
    id: 'lifta-saad',
    village_id: 'lifta',
    name_ar: 'حمولة سعد',
    aliases: ['سعد'],
    story: 'حمولة سعد من حمايل لفتا التي هُجّر أهلها عام 1948.',
    source_name: 'مصدر لفتا',
    source_url: 'https://example.com/lifta',
  },
];

function mockFetch({
  archiveFailure = false,
  pageviewsFailure = false,
  wikiMissing = false,
  wikiFailure = false,
  summaryExtract = 'ملخص عربي من ويكيبيديا.',
  localVillages = villages,
  localFamilies = families,
} = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url) => {
      const requestUrl = String(url);

      if (requestUrl.endsWith('/data/villages.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => localVillages,
        });
      }

      if (requestUrl.endsWith('/data/families.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => localFamilies,
        });
      }

      if (requestUrl.startsWith('https://archive.org/advancedsearch.php')) {
        if (archiveFailure) {
          return Promise.resolve({ ok: false, status: 500 });
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({
            response: {
              numFound: 1,
              docs: [
                {
                  identifier: 'youtube-1UnSTi0qTSQ',
                  title: 'The Erasure of Palestinian Towns',
                  creator: '1948: Creation & Catastrophe',
                  date: '2024-04-01T00:00:00Z',
                  mediatype: 'movies',
                  description: '<p>Archive record about al-Saffuriyya.</p>',
                },
              ],
            },
          }),
        });
      }

      if (requestUrl.startsWith('https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article')) {
        if (pageviewsFailure) {
          return Promise.resolve({ ok: false, status: 500 });
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({
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
          }),
        });
      }

      if (requestUrl.startsWith('https://ar.wikipedia.org/w/api.php')) {
        const parsedUrl = new URL(requestUrl);

        if (wikiFailure) {
          return Promise.resolve({ ok: false, status: 500 });
        }

        if (parsedUrl.searchParams.get('list') === 'search') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              query: {
                search: [
                  { pageid: 200, title: 'يافا' },
                  { pageid: 201, title: 'عائلة الخالدي' },
                ],
              },
            }),
          });
        }

        if (parsedUrl.searchParams.get('generator') === 'images') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              query: {
                pages: {
                  1: {
                    title: 'ملف:Saffuriyya landscape.jpg',
                    imageinfo: [
                      {
                        thumburl: 'https://example.com/saffuriyya-landscape-thumb.jpg',
                        url: 'https://example.com/saffuriyya-landscape.jpg',
                        descriptionurl: 'https://commons.wikimedia.org/wiki/File:Saffuriyya_landscape.jpg',
                        mime: 'image/jpeg',
                        extmetadata: {
                          ImageDescription: { value: 'Saffuriyya landscape' },
                          Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Example">Example photographer</a>' },
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
                },
              },
            }),
          });
        }

        const title = parsedUrl.searchParams.get('titles') || 'صفورية';

        return Promise.resolve({
          ok: true,
          json: async () => ({
            query: {
              pages: wikiMissing
                ? [{ title, missing: true }]
                : [
                    {
                      title,
                      extract: title === 'يافا' ? 'يافا مدينة فلسطينية ساحلية.' : summaryExtract,
                    },
                  ],
            },
          }),
        });
      }

      return Promise.reject(new Error(`Unexpected fetch: ${requestUrl}`));
    }),
  );
}

async function openDetailTab(user, details, tabName) {
  await user.click(within(details).getByRole('tab', { name: tabName }));
}

function pageviewsRequestCount() {
  return fetch.mock.calls.filter(([url]) => (
    String(url).startsWith('https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article')
  )).length;
}

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('loads local villages and fetches an Arabic encyclopedia extract for the selected village', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);

    expect(screen.queryByRole('list', { name: 'قائمة القرى' })).not.toBeInTheDocument();
    expect(screen.getByText('اختر قرية من الخريطة أو ابحث عنها لعرض التفاصيل والعائلات.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('البحث'), 'سفورية');

    expect(
      within(screen.getByRole('list', { name: 'قائمة القرى' })).getByText('سفورية'),
    ).toBeInTheDocument();
    expect(await screen.findByText('ملخص عربي من ويكيبيديا.')).toBeInTheDocument();
  });

  it('shows village families with their source in the selected village details', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('البحث'), 'سفورية');
    const details = await screen.findByLabelText('تفاصيل سفورية');
    await openDetailTab(user, details, /العائلات/);
    expect(within(details).getByText('عائلات القرية')).toBeInTheDocument();
    expect(within(details).getByText('الخطيب')).toBeInTheDocument();
    expect(
      within(details).getByText('الخطيب مذكورة ضمن عائلات صفورية في مصدر موثق.'),
    ).toBeInTheDocument();
    expect(within(details).getByRole('link', { name: 'المصدر: مصدر صفورية' })).toHaveAttribute(
      'href',
      'https://example.com/saffuriyya',
    );
  });

  it('shows a gallery with linked Wikipedia or Commons images for the selected village', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('البحث'), 'سفورية');

    const details = await screen.findByLabelText('تفاصيل سفورية');
    await openDetailTab(user, details, /المعرض/);
    expect(within(details).getByRole('heading', { name: 'المعرض' })).toBeInTheDocument();
    expect(await within(details).findByText('Saffuriyya landscape')).toBeInTheDocument();
    expect(
      within(details).getByRole('link', { name: /Saffuriyya landscape/ }),
    ).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Saffuriyya_landscape.jpg',
    );
    expect(within(details).getByText('المؤلف: Example photographer')).toBeInTheDocument();
    expect(within(details).getByText('الرخصة: CC BY-SA 4.0')).toBeInTheDocument();
    expect(within(details).queryByText('Flag of Palestine')).not.toBeInTheDocument();
  });

  it('shows Internet Archive records for the selected village', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('البحث'), 'سفورية');

    const details = await screen.findByLabelText('تفاصيل سفورية');
    await openDetailTab(user, details, /الأرشيف/);
    expect(within(details).getByRole('heading', { name: 'الأرشيف' })).toBeInTheDocument();
    expect(await within(details).findByText('فيديو أرشيفي عن سفورية')).toBeInTheDocument();
    expect(
      within(details).getByText('مقطع وثائقي يتناول محو معالم بلدات وقرى فلسطينية بعد عام 1948، ويذكر صفورية ضمن القرى المعروضة.'),
    ).toBeInTheDocument();
    expect(
      within(details).getByRole('link', { name: 'فتح في الأرشيف' }),
    ).toHaveAttribute('href', 'https://archive.org/details/youtube-1UnSTi0qTSQ');
  });

  it('shows an archive error without hiding local village details', async () => {
    mockFetch({ archiveFailure: true });
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('البحث'), 'سفورية');

    const details = await screen.findByLabelText('تفاصيل سفورية');
    expect(within(details).getByText('4,330')).toBeInTheDocument();
    await openDetailTab(user, details, /الأرشيف/);
    expect(await within(details).findByText('تعذر تحميل مواد الأرشيف الآن.')).toBeInTheDocument();
  });

  it('shows an interactive Wikipedia pageviews timeline for the selected village', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('البحث'), 'سفورية');

    const details = await screen.findByLabelText('تفاصيل سفورية');
    expect(pageviewsRequestCount()).toBe(0);

    await openDetailTab(user, details, /نبض الذاكرة/);
    expect(pageviewsRequestCount()).toBe(1);

    expect(within(details).getByRole('heading', { name: 'نبض الذاكرة' })).toBeInTheDocument();
    expect(await within(details).findByText('أيام فيها مشاهدات')).toBeInTheDocument();
    expect(within(details).getByText('مجموع المشاهدات')).toBeInTheDocument();
    expect(within(details).getByText('24')).toBeInTheDocument();
    const februaryMentions = within(details)
      .getByText('أيام المشاهدة في فبراير 2026')
      .closest('.media-memory-mentions');
    expect(februaryMentions).toBeInTheDocument();
    expect(within(februaryMentions).getByText('20 فبراير 2026')).toBeInTheDocument();
    expect(within(februaryMentions).getByText('مشاهدات: 15')).toBeInTheDocument();
    expect(
      within(details).getByRole('link', { name: 'فتح صفحة ويكيبيديا التي تم قياس مشاهداتها' }),
    ).toHaveAttribute('href', 'https://ar.wikipedia.org/wiki/%D8%B5%D9%81%D9%88%D8%B1%D9%8A%D8%A9');

    await user.click(within(details).getByRole('button', { name: /مارس 2026/ }));

    expect(within(details).getByText('أيام المشاهدة في مارس 2026')).toBeInTheDocument();
    expect(within(details).getByText('لا توجد مشاهدات مسجلة في هذا الشهر.')).toBeInTheDocument();
  });

  it('shows a pageviews error without hiding local village details', async () => {
    mockFetch({ pageviewsFailure: true });
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('البحث'), 'سفورية');

    const details = await screen.findByLabelText('تفاصيل سفورية');
    expect(within(details).getByText('4,330')).toBeInTheDocument();
    await openDetailTab(user, details, /نبض الذاكرة/);
    expect(
      await within(details).findByText('تعذر تحميل مشاهدات ويكيبيديا الآن. جرّب التحديث لاحقًا.'),
    ).toBeInTheDocument();
  });

  it('uses cached pageviews when reopening the memory tab for the same village', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('البحث'), 'سفورية');
    const details = await screen.findByLabelText('تفاصيل سفورية');
    await openDetailTab(user, details, /نبض الذاكرة/);
    expect(await within(details).findByText('أيام فيها مشاهدات')).toBeInTheDocument();
    expect(pageviewsRequestCount()).toBe(1);

    await openDetailTab(user, details, /معلومات/);
    await openDetailTab(user, details, /نبض الذاكرة/);

    expect(pageviewsRequestCount()).toBe(1);
  });

  it('filters villages by family name and shows that family story', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('البحث'), 'سعد');

    const list = screen.getByRole('list', { name: 'قائمة القرى' });
    expect(within(list).getByText('لفتا')).toBeInTheDocument();
    expect(within(list).queryByText('سفورية')).not.toBeInTheDocument();
    expect(within(list).getByText('حمولة سعد')).toBeInTheDocument();
    expect(
      within(list).getByText('حمولة سعد من حمايل لفتا التي هُجّر أهلها عام 1948.'),
    ).toBeInTheDocument();

    const details = await screen.findByLabelText('تفاصيل لفتا');
    await openDetailTab(user, details, /العائلات/);
    expect(
      within(details).getByText('حمولة سعد من حمايل لفتا التي هُجّر أهلها عام 1948.'),
    ).toBeInTheDocument();
  });

  it('shows an OpenStreetMap map and lets the user select a village from it', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);

    expect(
      await screen.findByRole('img', { name: 'خريطة OpenStreetMap لفلسطين وإحداثيات القرى' }),
    ).toBeInTheDocument();

    const mapControls = screen.getByRole('group', { name: 'اختيار قرية من الخريطة' });
    await user.click(within(mapControls).getByRole('button', { name: 'لفتا' }));

    expect(await screen.findByLabelText('تفاصيل لفتا')).toBeInTheDocument();
  });

  it('expands a long Wikipedia extract instead of leaving it silently truncated', async () => {
    const longExtract = `${'نص طويل من ويكيبيديا '.repeat(80)}النهاية`;
    mockFetch({ summaryExtract: longExtract });
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText('البحث'), 'سفورية');

    const expandButton = await screen.findByRole('button', { name: 'عرض النص كاملًا' });
    expect(screen.queryByText((content) => content.includes('النهاية'))).not.toBeInTheDocument();

    await user.click(expandButton);

    expect(
      await screen.findByText((content) => content.includes('النهاية')),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'عرض أقل' })).toBeInTheDocument();
  });

  it('filters villages by district name', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText('البحث'), 'Jerusalem');

    const list = screen.getByRole('list', { name: 'قائمة القرى' });
    expect(within(list).getByText('لفتا')).toBeInTheDocument();
    expect(within(list).queryByText('سفورية')).not.toBeInTheDocument();
    expect(await screen.findByLabelText('تفاصيل لفتا')).toBeInTheDocument();
  });

  it('clears the search query and hides local villages until a new selection', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('البحث'), 'Jerusalem');

    let list = screen.getByRole('list', { name: 'قائمة القرى' });
    expect(within(list).getByText('لفتا')).toBeInTheDocument();
    expect(within(list).queryByText('سفورية')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'مسح البحث' }));
    expect(screen.getByLabelText('البحث')).toHaveValue('');

    expect(screen.queryByRole('list', { name: 'قائمة القرى' })).not.toBeInTheDocument();
    expect(screen.getByText('اختر قرية من الخريطة أو ابحث عنها لعرض التفاصيل والعائلات.')).toBeInTheDocument();
  });

  it('searches Arabic Wikipedia when the query is outside the local village list', async () => {
    mockFetch();
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('البحث'), 'يافا');
    await user.click(await screen.findByRole('button', { name: 'يافا' }));

    expect(await screen.findByLabelText('تفاصيل يافا')).toBeInTheDocument();
    expect(await screen.findByText('يافا مدينة فلسطينية ساحلية.')).toBeInTheDocument();
  });

  it('shows a missing-page fallback without crashing', async () => {
    mockFetch({ wikiMissing: true });
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText('البحث'), 'سفورية');

    expect(
      await screen.findByText('لا توجد صفحة ويكيبيديا مؤكدة لهذا العنوان.'),
    ).toBeInTheDocument();
  });

  it('shows an API error while keeping local village facts visible', async () => {
    mockFetch({ wikiFailure: true });
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText('البحث'), 'سفورية');

    const details = await screen.findByLabelText('تفاصيل سفورية');
    expect(within(details).getByText('4,330')).toBeInTheDocument();
    expect(
      await screen.findByText('تعذر جلب بيانات ويكيبيديا الآن. البيانات المحلية ما زالت متاحة.'),
    ).toBeInTheDocument();
  });

  it('shows families in batches with a show-more option', async () => {
    const largeFamilySet = Array.from({ length: 6 }, (_, index) => ({
      id: `saffuriyya-family-${index + 1}`,
      village_id: 'saffuriyya',
      name_ar: `عائلة ${index + 1}`,
      aliases: [],
      story: `قصة العائلة ${index + 1}`,
      source_name: `مصدر ${index + 1}`,
      source_url: `https://example.com/source-${index + 1}`,
    }));
    mockFetch({ localFamilies: largeFamilySet });
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText('البحث'), 'سفورية');

    const details = await screen.findByLabelText('تفاصيل سفورية');
    await openDetailTab(user, details, /العائلات/);
    expect(within(details).getAllByRole('heading', { level: 4 })).toHaveLength(4);
    await user.click(within(details).getByRole('button', { name: /عرض المزيد/ }));

    expect(within(details).getAllByRole('heading', { level: 4 })).toHaveLength(6);
    expect(within(details).getByRole('button', { name: 'عرض أقل' })).toBeInTheDocument();
  });
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchBar from './components/SearchBar.jsx';
import VillageDetail from './components/VillageDetail.jsx';
import VillageList from './components/VillageList.jsx';
import WikipediaSearchResults from './components/WikipediaSearchResults.jsx';
import { fetchVillageArchive } from './services/archive.js';
import { loadFamilies } from './services/families.js';
import { fetchVillagePageviews } from './services/pageviews.js';
import { loadVillages } from './services/villages.js';
import {
  fetchVillageGallery,
  fetchVillageSummary,
  searchWikipediaPages,
} from './services/wikipedia.js';

function normalizeSearchValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي');
}

function matchesSearch(village, query, families = []) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    village.name_ar,
    village.name_en,
    village.district_ar,
    village.district_en,
    village.wikipedia_title,
    village.wikipedia_title_ar,
    ...families.flatMap((family) => [
      family.name_ar,
      ...(family.aliases || []),
    ]),
  ]
    .filter(Boolean)
    .some((value) => normalizeSearchValue(value).includes(normalizedQuery));
}

function familyMatchesSearch(family, query) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return false;
  }

  return [
    family.name_ar,
    ...(family.aliases || []),
  ]
    .filter(Boolean)
    .some((value) => normalizeSearchValue(value).includes(normalizedQuery));
}

function createEmptyMediaMemoryState() {
  return { data: null, error: null, isLoading: false };
}

const PAGEVIEWS_CACHE_STORAGE_KEY = 'wikimedia-pageviews-cache';

function readSavedMediaMemoryCache() {
  if (typeof window === 'undefined') {
    return new Map();
  }

  try {
    return new Map(
      Object.entries(JSON.parse(window.localStorage.getItem(PAGEVIEWS_CACHE_STORAGE_KEY)) || {}),
    );
  } catch {
    return new Map();
  }
}

function writeSavedMediaMemoryCache(cache) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    PAGEVIEWS_CACHE_STORAGE_KEY,
    JSON.stringify(Object.fromEntries(cache.entries())),
  );
}

export default function App() {
  const [villages, setVillages] = useState([]);
  const [families, setFamilies] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [query, setQuery] = useState('');
  const [dataError, setDataError] = useState(null);
  const [wikiSearchState, setWikiSearchState] = useState({
    error: null,
    isLoading: false,
    results: [],
  });
  const [wikiState, setWikiState] = useState({
    data: null,
    error: null,
    isLoading: false,
  });
  const [galleryState, setGalleryState] = useState({
    error: null,
    images: [],
    isLoading: false,
  });
  const [archiveState, setArchiveState] = useState({
    error: null,
    isLoading: false,
    items: [],
    total: 0,
  });
  const [mediaMemoryState, setMediaMemoryState] = useState({
    data: null,
    error: null,
    isLoading: false,
  });
  const previousNormalizedQueryRef = useRef('');
  const mediaMemoryCacheRef = useRef(readSavedMediaMemoryCache());
  const mediaMemoryRequestRef = useRef({ controller: null, villageId: null });
  const selectedVillageIdRef = useRef(null);

  useEffect(() => {
    let isActive = true;

    Promise.all([loadVillages(), loadFamilies()])
      .then(([loadedVillages, loadedFamilies]) => {
        if (!isActive) {
          return;
        }

        setVillages(loadedVillages);
        setFamilies(loadedFamilies);
        setSelectedVillage(null);
      })
      .catch(() => {
        if (isActive) {
          setDataError('تعذر تحميل بيانات القرى أو العائلات المحلية.');
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setWikiSearchState({ error: null, isLoading: false, results: [] });
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setWikiSearchState((current) => ({
        ...current,
        error: null,
        isLoading: true,
      }));

      searchWikipediaPages(normalizedQuery, { signal: controller.signal })
        .then((results) => {
          setWikiSearchState({ error: null, isLoading: false, results });
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            return;
          }

          setWikiSearchState({ error, isLoading: false, results: [] });
        });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!selectedVillage) {
      setWikiState({ data: null, error: null, isLoading: false });
      setGalleryState({ error: null, images: [], isLoading: false });
      setArchiveState({ error: null, isLoading: false, items: [], total: 0 });
      return;
    }

    const controller = new AbortController();
    setWikiState({ data: null, error: null, isLoading: true });

    fetchVillageSummary(
      selectedVillage.wikipedia_title_ar || selectedVillage.wikipedia_title,
      {
        signal: controller.signal,
      },
    )
      .then((summary) => {
        setWikiState({ data: summary, error: null, isLoading: false });
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return;
        }

        setWikiState({ data: null, error, isLoading: false });
      });

    return () => {
      controller.abort();
    };
  }, [selectedVillage]);

  useEffect(() => {
    if (!selectedVillage) {
      return;
    }

    const controller = new AbortController();
    setGalleryState({ error: null, images: [], isLoading: true });

    fetchVillageGallery(
      selectedVillage.wikipedia_title_ar || selectedVillage.wikipedia_title,
      {
        signal: controller.signal,
      },
    )
      .then((images) => {
        setGalleryState({ error: null, images, isLoading: false });
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return;
        }

        setGalleryState({ error, images: [], isLoading: false });
      });

    return () => {
      controller.abort();
    };
  }, [selectedVillage]);

  useEffect(() => {
    selectedVillageIdRef.current = selectedVillage?.id || null;

    const activeRequest = mediaMemoryRequestRef.current;
    if (activeRequest.controller && activeRequest.villageId !== selectedVillage?.id) {
      activeRequest.controller.abort();
      mediaMemoryRequestRef.current = { controller: null, villageId: null };
    }

    if (!selectedVillage) {
      setMediaMemoryState(createEmptyMediaMemoryState());
      return;
    }

    const cachedData = mediaMemoryCacheRef.current.get(selectedVillage.id);
    setMediaMemoryState(
      cachedData
        ? { data: cachedData, error: null, isLoading: false }
        : createEmptyMediaMemoryState(),
    );
  }, [selectedVillage?.id]);

  const handleMediaMemoryRefresh = useCallback((village) => {
    if (!village?.id) {
      return;
    }

    const cachedData = mediaMemoryCacheRef.current.get(village.id);

    if (mediaMemoryRequestRef.current.villageId === village.id) {
      return;
    }

    mediaMemoryRequestRef.current.controller?.abort();

    const controller = new AbortController();
    mediaMemoryRequestRef.current = { controller, villageId: village.id };
    setMediaMemoryState({ data: cachedData || null, error: null, isLoading: true });

    fetchVillagePageviews(village, {
      signal: controller.signal,
    })
      .then((data) => {
        const cacheEntry = {
          ...data,
          cachedAt: new Date().toISOString(),
          source: 'Wikimedia Pageviews API',
        };
        mediaMemoryCacheRef.current.set(village.id, cacheEntry);
        writeSavedMediaMemoryCache(mediaMemoryCacheRef.current);

        if (mediaMemoryRequestRef.current.villageId === village.id) {
          mediaMemoryRequestRef.current = { controller: null, villageId: null };
        }

        if (selectedVillageIdRef.current === village.id) {
          setMediaMemoryState({ data: cacheEntry, error: null, isLoading: false });
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return;
        }

        if (mediaMemoryRequestRef.current.villageId === village.id) {
          mediaMemoryRequestRef.current = { controller: null, villageId: null };
        }

        if (selectedVillageIdRef.current === village.id) {
          setMediaMemoryState({
            data: cachedData || null,
            error,
            isLoading: false,
          });
        }
      });
  }, []);

  const handleMediaMemoryRequest = useCallback((village) => {
    if (!village?.id) {
      return;
    }

    const cachedData = mediaMemoryCacheRef.current.get(village.id);
    if (cachedData) {
      setMediaMemoryState({ data: cachedData, error: null, isLoading: false });
      return;
    }

    handleMediaMemoryRefresh(village);
  }, [handleMediaMemoryRefresh]);

  useEffect(() => {
    if (!selectedVillage) {
      return;
    }

    const controller = new AbortController();
    setArchiveState({ error: null, isLoading: true, items: [], total: 0 });

    fetchVillageArchive(selectedVillage, {
      signal: controller.signal,
    })
      .then((archive) => {
        setArchiveState({
          error: null,
          isLoading: false,
          items: archive.items,
          total: archive.total,
        });
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return;
        }

        setArchiveState({ error, isLoading: false, items: [], total: 0 });
      });

    return () => {
      controller.abort();
    };
  }, [selectedVillage]);

  const familiesByVillage = useMemo(() => {
    return families.reduce((groups, family) => {
      const existingFamilies = groups.get(family.village_id) || [];
      groups.set(family.village_id, [...existingFamilies, family]);
      return groups;
    }, new Map());
  }, [families]);

  const familyMatchesByVillage = useMemo(() => {
    return families.reduce((groups, family) => {
      if (!familyMatchesSearch(family, query)) {
        return groups;
      }

      const existingFamilies = groups.get(family.village_id) || [];
      groups.set(family.village_id, [...existingFamilies, family]);
      return groups;
    }, new Map());
  }, [families, query]);
  const normalizedQuery = query.trim();

  useEffect(() => {
    const previousQuery = previousNormalizedQueryRef.current;

    if (previousQuery.length > 0 && normalizedQuery.length === 0) {
      setSelectedVillage(null);
    }

    previousNormalizedQueryRef.current = normalizedQuery;
  }, [normalizedQuery]);

  const localVillageMatches = useMemo(
    () => villages.filter((village) => (
      matchesSearch(village, query, familiesByVillage.get(village.id) || [])
    )),
    [familiesByVillage, villages, query],
  );
  const filteredVillages = useMemo(() => {
    if (normalizedQuery.length > 0) {
      return localVillageMatches;
    }

    return [];
  }, [localVillageMatches, normalizedQuery]);

  useEffect(() => {
    if (selectedVillage?.source === 'wikipedia-search') {
      return;
    }

    if (normalizedQuery.length === 0) {
      if (selectedVillage && !villages.some((village) => village.id === selectedVillage.id)) {
        setSelectedVillage(null);
      }
      return;
    }

    if (filteredVillages.length === 0) {
      if (selectedVillage !== null) {
        setSelectedVillage(null);
      }
      return;
    }

    const selectedStillVisible = filteredVillages.some(
      (village) => village.id === selectedVillage?.id,
    );

    if (!selectedStillVisible) {
      setSelectedVillage(filteredVillages[0]);
    }
  }, [filteredVillages, normalizedQuery, selectedVillage, villages]);

  const localTitleKeys = useMemo(
    () => new Set(
      villages
        .flatMap((village) => [
          village.name_ar,
          village.name_en,
          village.wikipedia_title,
          village.wikipedia_title_ar,
        ])
        .filter(Boolean)
        .map((value) => value.toLowerCase()),
    ),
    [villages],
  );

  const wikiSearchResults = useMemo(
    () => wikiSearchState.results.filter(
      (result) => !localTitleKeys.has(result.title.toLowerCase()),
    ),
    [localTitleKeys, wikiSearchState.results],
  );
  const totalResultCount = filteredVillages.length
    + (normalizedQuery.length >= 2 ? wikiSearchResults.length : 0);
  const shouldShowResultsRail = normalizedQuery.length > 0;

  function handleWikipediaResultSelect(result) {
    setSelectedVillage({
      id: `wiki-${result.pageid}`,
      name_ar: result.title,
      name_en: '',
      district_ar: 'ويكيبيديا',
      district_en: 'Wikipedia',
      coordinates: null,
      population_1945: null,
      wikipedia_title: result.title,
      wikipedia_title_ar: result.title,
      source: 'wikipedia-search',
    });
  }

  return (
    <main className="app-shell">
      <section className="app-header">
        <div>
          <h1>تعال ع قريتك</h1>
        </div>
      </section>

      {dataError && (
        <div className="error-state app-error" role="alert">
          {dataError}
        </div>
      )}

      <section className="workspace" aria-label="Village explorer">
        <div className="search-dock">
          <SearchBar
            value={query}
            onChange={setQuery}
            resultCount={totalResultCount}
          />
        </div>

        <section
          className={`workspace-grid ${shouldShowResultsRail ? '' : 'workspace-grid--full'}`}
          aria-label="محتوى مستكشف القرى"
        >
          {shouldShowResultsRail && (
            <aside className="results-rail">
              <VillageList
                villages={filteredVillages}
                selectedVillage={selectedVillage}
                onSelect={setSelectedVillage}
                familyMatchesByVillage={familyMatchesByVillage}
                totalVillages={villages.length}
                query={normalizedQuery}
              />
              <WikipediaSearchResults
                query={query}
                results={wikiSearchResults}
                isLoading={wikiSearchState.isLoading}
                error={wikiSearchState.error}
                onSelect={handleWikipediaResultSelect}
              />
            </aside>
          )}

          <VillageDetail
            village={selectedVillage}
            wikiState={wikiState}
            galleryState={galleryState}
            archiveState={archiveState}
            mediaMemoryState={mediaMemoryState}
            families={familiesByVillage.get(selectedVillage?.id) || []}
            query={query}
            localVillages={villages}
            onSelectVillage={setSelectedVillage}
            onRequestMediaMemory={handleMediaMemoryRequest}
            onRefreshMediaMemory={handleMediaMemoryRefresh}
          />
        </section>
      </section>
    </main>
  );
}

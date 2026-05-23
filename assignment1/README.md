# Palestinian Displaced Villages Explorer - "تعال ع قريتك"

## Course

COM4381 - Web Services Technologies  
2nd Semester 2025/2026

## Team Members

| Name | Student ID |
| --- | --- |
| Basil Khateeb | 1222038 |
| Ahmad Nizar | 1222980 |

## Project Description

This is a small React web application that helps users explore 30 selected displaced Palestinian villages. The app uses local village metadata, 99 source-cited local family records for 27 villages where clear sources were found, the MediaWiki Action API from Arabic Wikipedia for Arabic summaries and search results, Internet Archive search for related archival material, Wikimedia Pageviews API for Wikipedia attention timelines, and OpenStreetMap tiles through Leaflet for an interactive map.

## Selected APIs

### 1. MediaWiki Action API / Wikipedia

- Service provider: Wikimedia Foundation
- Root URL: https://www.mediawiki.org/wiki/API
- Endpoint path: `/w/api.php`
- HTTP method: `GET`
- Main response format: JSON
- Secondary demo format: XML

Example JSON request:

```http
GET https://ar.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&redirects=1&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=400&titles=صفورية&format=json&formatversion=2&origin=*
```

### 2. OpenStreetMap Tiles

- Service provider: OpenStreetMap contributors
- Root URL: <https://tile.openstreetmap.org>
- Endpoint path: `/{z}/{x}/{y}.png`
- HTTP method: `GET`
- Response format: PNG map tiles
- Used through: Leaflet

### 3. Internet Archive Advanced Search API

- Service provider: Internet Archive
- Root URL: <https://archive.org>
- Endpoint path: `/advancedsearch.php`
- HTTP method: `GET`
- Response format: JSON
- Used for: finding archival videos, scanned texts, images, and other records whose metadata matches the selected village name.

Example JSON request:

```http
GET https://archive.org/advancedsearch.php?q=(title:"Saffuriyya" OR description:"Saffuriyya")&fl[]=identifier&fl[]=title&fl[]=description&rows=6&page=1&output=json
```

### 4. Wikimedia Pageviews API

- Service provider: Wikimedia Foundation
- Root URL: <https://wikimedia.org>
- Endpoint path: `/api/rest_v1/metrics/pageviews/per-article/{project}/{access}/{agent}/{article}/{granularity}/{start}/{end}`
- HTTP method: `GET`
- Response format: JSON
- Used for: showing daily and monthly page-view counts for the selected Arabic Wikipedia article during the last year.

Example JSON request:

```http
GET https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/ar.wikipedia.org/all-access/user/صفورية/daily/2025051700/2026051700
```

## Features

- Search villages by Arabic/English name, district, or documented family name, with matching family stories shown in the result cards.
- Search Arabic Wikipedia for additional city, village, or family-name pages when they exist.
- Navigate selected-village details through tabs: information includes facts, map, and Wikipedia summary together, while gallery and families stay separate.
- View a gallery of linked Wikipedia/Wikimedia Commons images for the selected village when images are available.
- View an archive tab with related Internet Archive materials for the selected village when records are available.
- View a "نبض الذاكرة" tab that uses Wikimedia Pageviews to show an interactive monthly timeline and daily view counts for the selected Arabic Wikipedia page.
- View local metadata for 30 selected villages.
- View 99 documented family records for 27 villages where local source-cited family data is available.
- View an interactive OpenStreetMap map for the villages in `villages.json`.
- Fetch Arabic village summary, thumbnail, and linked gallery images from Arabic Wikipedia.
- Expand long Wikipedia summaries instead of leaving them silently truncated.
- Display loading, missing-page, and error states.

## How to Run

```bash
npm install
npm run dev
```

Then open the local URL printed in the terminal, usually:

```text
http://localhost:5173
```

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

The tests cover the MediaWiki API URL/service behavior, Internet Archive URL/service behavior, Wikimedia Pageviews URL/service behavior, local village/family search, Arabic Wikipedia search and gallery images, the OpenStreetMap/Leaflet map selection flow, family details, archive and memory-pulse tab states, and summary expansion.

## Data Note

Family records are included only when a clear source URL is available in `public/data/families.json`. The current dataset does not yet include documented family records for القسطل، خربة السركس، عين المنسي.

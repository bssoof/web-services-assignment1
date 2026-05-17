import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const PALESTINE_BOUNDS = [
  [31.15, 34.2],
  [33.4, 35.9],
];
const MAP_SHORTCUTS_PAGE_SIZE = 8;

function createMarker(village, isSelected) {
  return L.circleMarker([village.coordinates.lat, village.coordinates.lon], {
    color: isSelected ? '#9f2d2d' : '#0a4238',
    fillColor: isSelected ? '#9f2d2d' : '#126154',
    fillOpacity: 0.92,
    opacity: 1,
    radius: isSelected ? 8 : 6,
    weight: 2,
  }).bindTooltip(`${village.name_ar} - ${village.district_ar}`, {
    direction: 'top',
    offset: [0, -8],
  });
}

export default function VillageMap({ villages, selectedVillage, onSelectVillage }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const markerRefs = useRef(new Map());
  const [visibleShortcutCount, setVisibleShortcutCount] = useState(MAP_SHORTCUTS_PAGE_SIZE);
  const mappedVillages = villages.filter((village) => village.coordinates);
  const visibleShortcutVillages = mappedVillages.slice(0, visibleShortcutCount);
  const hasMoreShortcuts = visibleShortcutCount < mappedVillages.length;

  function handleResetMap() {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.fitBounds(PALESTINE_BOUNDS, { padding: [12, 12] });
  }

  useEffect(() => {
    setVisibleShortcutCount(MAP_SHORTCUTS_PAGE_SIZE);
  }, [mappedVillages.length]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current || mappedVillages.length === 0) {
      return undefined;
    }

    const map = L.map(mapElementRef.current, {
      attributionControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    map.fitBounds(PALESTINE_BOUNDS, { padding: [12, 12] });
    mapRef.current = map;
    markerLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      markerRefs.current.clear();
    };
  }, [mappedVillages.length]);

  useEffect(() => {
    const layer = markerLayerRef.current;

    if (!layer) {
      return;
    }

    layer.clearLayers();
    markerRefs.current.clear();

    mappedVillages.forEach((village) => {
      const marker = createMarker(village, selectedVillage?.id === village.id);
      marker.on('click', () => onSelectVillage(village));
      marker.addTo(layer);
      markerRefs.current.set(village.id, marker);
    });
  }, [mappedVillages, onSelectVillage, selectedVillage?.id]);

  useEffect(() => {
    if (!mapRef.current || !selectedVillage?.coordinates) {
      return;
    }

    mapRef.current.flyTo(
      [selectedVillage.coordinates.lat, selectedVillage.coordinates.lon],
      10,
      { duration: 0.55 },
    );
  }, [selectedVillage?.id, selectedVillage?.coordinates]);

  if (mappedVillages.length === 0) {
    return null;
  }

  return (
    <section className="map-panel" aria-label="خريطة القرى">
      <div className="section-title-row">
        <div className="map-title-actions">
          <h3>خريطة القرى</h3>
          <button className="map-reset-button" type="button" onClick={handleResetMap}>
            إعادة ضبط عرض الخريطة
          </button>
        </div>
        <span>OpenStreetMap</span>
      </div>

      <div
        ref={mapElementRef}
        className="leaflet-map"
        role="img"
        aria-label="خريطة OpenStreetMap لفلسطين وإحداثيات القرى"
      />
      <p className="map-hint">يمكنك اختيار قرية من الخريطة أو من الأزرار أدناه.</p>

      <div className="map-shortcuts" role="group" aria-label="اختيار قرية من الخريطة">
        {visibleShortcutVillages.map((village) => (
          <button
            key={village.id}
            className={selectedVillage?.id === village.id ? 'is-selected' : ''}
            type="button"
            onClick={() => onSelectVillage(village)}
            aria-pressed={selectedVillage?.id === village.id}
          >
            {village.name_ar}
          </button>
        ))}
        {hasMoreShortcuts && (
          <button
            className="map-shortcuts__more"
            type="button"
            onClick={() => setVisibleShortcutCount((current) => (
              Math.min(current + MAP_SHORTCUTS_PAGE_SIZE, mappedVillages.length)
            ))}
          >
            عرض المزيد من القرى
          </button>
        )}
      </div>
    </section>
  );
}

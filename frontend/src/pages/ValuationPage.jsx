import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, GeoJSON, useMapEvents } from 'react-leaflet';
import { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import L from 'leaflet';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng) });
  return null;
}

export default function ValuationPage() {
  const location = useLocation();
  const initial = location.state || {
    address: 'Unknown',
    estimated_price: 'N/A',
    confidence: 'N/A'
  };

  const [markerPos, setMarkerPos] = useState(null);
  const [parcelGeoJson, setParcelGeoJson] = useState(null);
  const [valuation, setValuation] = useState({
    address: initial.address,
    municipality: '',
    zoning: '',            // ← initialize zoning
    estimated_price: initial.estimated_price,
    confidence: initial.confidence
  });

  async function handleMapClick({ lat, lng }) {
    setMarkerPos([lat, lng]);
    setParcelGeoJson(null);

    // 1) Reverse‐geocode for a fallback address
    let rgAddress = 'Unknown';
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      ).then(r => r.json());
      rgAddress = geo.display_name || rgAddress;
    } catch {}

    // 2) Get bbox‐filtered candidates
    let candidates = [];
    try {
      const fc = await fetch(
        `http://localhost:8000/parcel-candidates?lat=${lat}&lng=${lng}`
      ).then(r => r.json());
      candidates = fc.features;
    } catch {}

    // 3) Find the matching parcel
    const pt = turf.point([lng, lat]);
    const match = candidates.find(f => turf.booleanPointInPolygon(pt, f.geometry));

    if (match) {
      setParcelGeoJson({ type: 'FeatureCollection', features: [match] });

      // 4) Scrape PBCPAO details
      let details = {};
      try {
        details = await fetch(
          `http://localhost:8000/parcel-details/${match.properties.PARID}`
        ).then(r => (r.ok ? r.json() : {}));
      } catch {
        details = {};
      }
      console.log('⚙️ parcel-details', details);

      // 5) Update all fields, including zoning
      setValuation({
        address:
          details['Location Address'] ||
          rgAddress ||
          match.properties.SITE_ADDR ||
          initial.address,
        municipality: details['Municipality'] || '',
        zoning:       details['Zoning']       || '',        // ← include zoning here
        estimated_price: match.properties.ESTIMATED_VALUE || 'N/A',
        confidence: match.properties.CONFIDENCE || 'N/A'
      });
    } else {
      // No parcel found—reset everything
      setValuation({
        address: rgAddress,
        municipality: '',
        zoning: '',      // ← clear zoning
        estimated_price: 'N/A',
        confidence: 'N/A'
      });
    }
  }

  return (
    <div className="flex h-screen w-screen">
      {/* Map */}
      <div className="w-[60%] h-full">
        <MapContainer center={[26.7153, -80.0534]} zoom={14} scrollWheelZoom className="h-full w-full">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapClickHandler onMapClick={handleMapClick} />

          {parcelGeoJson ? (
            <GeoJSON data={parcelGeoJson} style={{ color: '#2563eb', weight: 2 }} />
          ) : markerPos ? (
            <Marker
              position={markerPos}
              icon={L.divIcon({
                className: 'custom-marker',
                html: '<div style="width:14px;height:14px;background:#2563eb;border:2px solid white;border-radius:50%;"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              })}
            />
          ) : null}
        </MapContainer>
      </div>

      {/* Valuation Panel */}
      <div className="w-[40%] h-full bg-white p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Valuation Results</h2>

        <div className="text-sm text-gray-600 mb-4">
          <strong>Address:</strong> {valuation.address}
          {valuation.municipality && (
            <>
              <br />
              <strong>Municipality:</strong> {valuation.municipality}
            </>
          )}
          {valuation.zoning && (
            <>
              <br />
              <strong>Zoning:</strong> {valuation.zoning}
            </>
          )}
        </div>

        <div className="text-lg mb-1">
          <strong>Predicted Value:</strong> ${valuation.estimated_price}
        </div>
        <div className="text-sm text-gray-500">
          <strong>Confidence:</strong> {valuation.confidence}
        </div>
      </div>
    </div>
  );
}

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
    address:       initial.address,
    municipality:  '',
    zoning:        '',
    owner:         '',
    lastSaleDate:  '',
    lastSalePrice: '',
    estimated_price: initial.estimated_price,
    confidence:      initial.confidence
  });

  async function handleMapClick({ lat, lng }) {
    setMarkerPos([lat, lng]);
    setParcelGeoJson(null);

    // 1) Reverse‐geocode as fallback
    let fallbackAddr = 'Unknown';
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      ).then(r => r.json());
      fallbackAddr = geo.display_name || fallbackAddr;
    } catch {}

    // 2) Fetch bbox‐filtered parcels
    let candidates = [];
    try {
      const fc = await fetch(
        `http://localhost:8000/parcel-candidates?lat=${lat}&lng=${lng}`
      ).then(r => r.json());
      candidates = fc.features;
    } catch {}

    // 3) Turf point‐in‐polygon
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
      } catch {}

      console.log('⚙️ parcel-details', details);

      // 5) Update valuation, including last sale
      const displayAddr =
        (details['Location Address'] || '').trim() ||
        fallbackAddr ||
        match.properties.SITE_ADDR ||
        initial.address;

      setValuation({
        address:       displayAddr,
        municipality:  (details['Municipality']   || '').trim(),
        zoning:        (details['Zoning']         || '').trim(),
        owner:         (details['Current Owner']  || '').trim(),
        lastSaleDate:  details['Last Sale Date']  || '',
        lastSalePrice: details['Last Sale Price'] || '',
        estimated_price: match.properties.ESTIMATED_VALUE || 'N/A',
        confidence:      match.properties.CONFIDENCE      || 'N/A'
      });
    } else {
      // reset if no parcel
      setValuation({
        address:       fallbackAddr,
        municipality:  '',
        zoning:        '',
        owner:         '',
        lastSaleDate:  '',
        lastSalePrice: '',
        estimated_price: 'N/A',
        confidence:      'N/A'
      });
    }
  }

  // dynamic Street-View embed
  const streetViewUrl = markerPos
    ? `https://maps.google.com/maps?layer=c&cbll=${markerPos[0]},${markerPos[1]}&cbp=11,0,0,0,0&output=svembed`
    : null;

  return (
    <div className="flex h-screen w-screen">
      {/* Map Section */}
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

      {/* Street-View & Valuation Panel */}
      <div className="w-[40%] h-full bg-white p-6 overflow-y-auto">
        {streetViewUrl && (
          <div className="mb-4">
            <iframe
              src={streetViewUrl}
              width="100%"
              height="200"
              frameBorder="0"
              style={{ border: 0, borderRadius: '0.5rem' }}
              allowFullScreen
              title="Street View"
            />
          </div>
        )}

        <h2 className="text-2xl font-bold mb-4">Valuation Results</h2>
        <div className="text-sm text-gray-600 mb-4">
          <strong>Address:</strong> {valuation.address}
          {valuation.municipality && (
            <>
              <br/><strong>Municipality:</strong> {valuation.municipality}
            </>
          )}
          {valuation.zoning && (
            <>
              <br/><strong>Zoning:</strong> {valuation.zoning}
            </>
          )}
          {valuation.owner && (
            <>
              <br/><strong>Owner:</strong> {valuation.owner}
            </>
          )}
          {valuation.lastSaleDate && (
            <>
              <br/><strong>Last True Sale:</strong> {valuation.lastSaleDate} ({valuation.lastSalePrice})
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

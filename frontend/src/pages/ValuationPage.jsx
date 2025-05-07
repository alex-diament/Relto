import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, GeoJSON, useMapEvents, Popup, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
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
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

export default function ValuationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [markerPos, setMarkerPos] = useState(null);
  const [parcelGeoJson, setParcelGeoJson] = useState(null);
  const [parcelData, setParcelData] = useState(null);
  const [popupContent, setPopupContent] = useState(null);

  const data = location.state || {
    estimated_price: 'N/A',
    confidence: 'N/A',
    address: 'Unknown'
  };

  async function handleMapClick({ lat, lng }) {
    setMarkerPos([lat, lng]);
    setParcelGeoJson(null);
    setPopupContent(null);
  
    // 1) Geocode
    const geocodeRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const { display_name: address = "Unknown" } = await geocodeRes.json();
  
    // 2) Fetch bbox-filtered candidates
    let candidates = [];
    try {
      const res = await fetch(
        `http://localhost:8000/parcel-candidates?lat=${lat}&lng=${lng}`
      );
      const fc = await res.json();
      candidates = fc.features;
    } catch (err) {
      console.error("Failed to load candidates", err);
    }
  
    // 3) Use Turf to find the exact containing polygon
    const clickedPoint = turf.point([lng, lat]);
    const match = candidates.find(feat =>
      turf.booleanPointInPolygon(clickedPoint, feat.geometry)
    );
  
    if (match) {
      setParcelGeoJson({ type: "FeatureCollection", features: [match] });
      setPopupContent({
        position: [lat, lng],
        address: match.properties.SITE_ADDR || address,
        estimated_price: match.properties.ESTIMATED_VALUE || "N/A",
        confidence: match.properties.CONFIDENCE || "N/A",
      });
    } else {
      setPopupContent({ position: [lat, lng], address });
    }
  }
  

  return (
    <div className="flex h-screen w-screen">
      {/* Map Section */}
      <div className="w-[60%] h-full">
        <MapContainer
          center={[26.7153, -80.0534]}
          zoom={14}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Show popup if available */}
          {popupContent && (
            <Popup position={popupContent.position}>
              <div className="text-sm">
                <strong>Address:</strong> {popupContent.address} <br />
                {popupContent.estimated_price && (
                  <>
                    <strong>Estimated Value:</strong> ${popupContent.estimated_price} <br />
                  </>
                )}
                {popupContent.confidence && (
                  <>
                    <strong>Confidence:</strong> {popupContent.confidence}
                  </>
                )}
              </div>
            </Popup>
          )}

          {/* Draw Parcel */}
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
        <p className="text-sm text-gray-600">Address: {data.address}</p>
        <p className="text-lg mt-2">Predicted Value: ${data.estimated_price}</p>
        <p className="text-sm text-gray-500">Confidence: {data.confidence}</p>
      </div>
    </div>
  );
}

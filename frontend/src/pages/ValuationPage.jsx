import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useState } from 'react';
import 'leaflet/dist/leaflet.css';

// Simple marker icon fix for Leaflet in React
import L from 'leaflet';
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

  const data = location.state || {
    estimated_price: 'N/A',
    confidence: 'N/A',
    address: 'Unknown'
  };

  async function handleMapClick({ lat, lng }) {
    setMarkerPos([lat, lng]);

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const json = await res.json();
      const address = json.display_name || 'Reverse geocoding failed';

      // Navigate back to same page with new address
      navigate('/valuation', { state: { address } });
    } catch (err) {
      console.error('Reverse geocoding error:', err);
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
          {markerPos && <Marker position={markerPos} />}
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

import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function ValuationPage() {
  const location = useLocation(); // ✅ called inside the component

  const data = location.state || {
    estimated_price: 'N/A',
    confidence: 'N/A',
    address: 'Unknown'
  };

  return (
    <div className="flex h-screen w-screen">
      {/* Map Section */}
      <div className="w-1/2 h-full">
        <MapContainer
          center={[26.7153, -80.0534]}
          zoom={14}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          />
        </MapContainer>
      </div>

      {/* Valuation Panel */}
      <div className="w-1/2 h-full bg-white p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Valuation Results</h2>
        <p className="text-sm text-gray-600">Address: {data.address}</p>
        <p className="text-lg mt-2">Predicted Value: ${data.estimated_price}</p>
        <p className="text-sm text-gray-500">Confidence: {data.confidence}</p>
      </div>
    </div>
  );
}

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeValuation from './components/HomeValuation';
import ValuationPage from './pages/ValuationPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeValuation />} />
        <Route path="/valuation" element={<ValuationPage />} />
      </Routes>
    </Router>
  );
}

export default App;

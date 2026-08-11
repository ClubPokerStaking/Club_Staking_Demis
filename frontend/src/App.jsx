import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import BuyerSite from './pages/BuyerSite.jsx';
import AdminPage from './pages/AdminPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/o/:slug" element={<BuyerSite />} />
      <Route path="/o/:slug/admin" element={<AdminPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

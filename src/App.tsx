import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import EquipmentList from '@/pages/EquipmentList';
import CalendarPage from '@/pages/CalendarPage';
import RecordsPage from '@/pages/RecordsPage';
import ConsumablesPage from '@/pages/ConsumablesPage';
import AdminPage from '@/pages/AdminPage';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<EquipmentList />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/consumables" element={<ConsumablesPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

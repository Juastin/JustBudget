import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Overzicht from './pages/Overzicht';
import Budgetten from './pages/Budgetten';
import Transacties from './pages/Transacties';
import Reserveringen from './pages/Reserveringen';
import Settings from './pages/Settings';
import Inzichten from './pages/Inzichten';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overzicht />} />
          <Route path="budgetten" element={<Budgetten />} />
          <Route path="transacties" element={<Transacties />} />
          <Route path="reserveringen" element={<Reserveringen />} />
          <Route path="inzichten" element={<Inzichten />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

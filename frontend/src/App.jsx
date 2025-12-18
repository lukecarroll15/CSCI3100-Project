import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import FilesPage from './pages/FilesPage';

function PlaceholderPage({ title }) {
  return (
    <div className="py-20 text-center">
      <h1 className="mb-4 text-3xl">{title}</h1>
      <p className="text-gray-500">This page is under construction.</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login page without layout */}
        <Route path="/login" element={<LoginPage />} />

        {/* App pages with layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/discussion" element={<PlaceholderPage title="Discussion Board" />} />
          <Route path="/messages" element={<PlaceholderPage title="Messages" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

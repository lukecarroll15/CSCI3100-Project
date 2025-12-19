import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import FilesPage from './pages/FilesPage';
import { RequireAuth } from './auth/RequireAuth';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="py-20 text-center">
      <h1 className="mb-4 text-3xl">{title}</h1>
      <p className="text-gray-500">This page is under construction.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
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

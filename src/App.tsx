import { Routes, Route } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ClassesPage } from '@/pages/ClassesPage';
import { StudentsPage } from '@/pages/StudentsPage';
import { SubjectsPage } from '@/pages/SubjectsPage';
import { GradesPage } from '@/pages/GradesPage';
import { SettingsPage } from '@/pages/SettingsPage';

export default function App() {
  return (
    <PageLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </PageLayout>
  );
}

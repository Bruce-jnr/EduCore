import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell.jsx';
import { DashboardPage } from './features/dashboard/DashboardPage.jsx';
import { StudentProfilePage } from './features/students/StudentProfilePage.jsx';
import { StudentsPage } from './features/students/StudentsPage.jsx';
import { AddStudentPage } from './features/students/AddStudentPage.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { useAuth } from './features/auth/useAuth.js';
import { StaffPage } from './features/staff/StaffPage.jsx';
import { AcademicsPage } from './features/academics/AcademicsPage.jsx';
import { UsersRolesPage } from './features/users/UsersRolesPage.jsx';
import { SettingsPage } from './features/settings/SettingsPage.jsx';
import { AttendancePage } from './features/attendance/AttendancePage.jsx';
import { FinancePage } from './features/finance/FinancePage.jsx';
import { PlatformLoginPage } from './features/platform/PlatformLoginPage.jsx';
import { PlatformPage } from './features/platform/PlatformPage.jsx';
import './styles.css';

function getRoute() {
  return window.location.hash.replace('#', '') || '/dashboard';
}

function App() {
  const { user, loading, logout } = useAuth();
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  let page = <DashboardPage />;
  if (route === '/students') page = <StudentsPage />;
  if (route.startsWith('/students/')) page = <StudentProfilePage />;
  if (route === '/students/new') page = <AddStudentPage />;
  if (route === '/staff') page = <StaffPage />;
  if (route.startsWith('/academics/')) page = <AcademicsPage key={route} />;
  if (route === '/users') page = <UsersRolesPage />;
  if (route === '/settings') page = <SettingsPage />;
  if (route === '/attendance') page = <AttendancePage />;
  if (route.startsWith('/finance')) page = <FinancePage key={route} />;

  if (loading) return <div className="app-loading"><span/><p>Loading EduCore…</p></div>;
  if (!user) return route.startsWith('/platform') ? <PlatformLoginPage /> : <LoginPage />;
  if (user.isPlatformUser) return <PlatformPage />;
  return <AppShell route={route} user={user} onLogout={logout}>{page}</AppShell>;
}

export default App;

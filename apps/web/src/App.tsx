import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentProfile from './pages/StudentProfile';
import Staff from './pages/Staff';
import Allocation from './pages/Allocation';
import Timetable from './pages/Timetable';
import AttendanceMark from './pages/AttendanceMark';
import AttendanceReports from './pages/AttendanceReports';
import Substitutions from './pages/Substitutions';
import Leave from './pages/Leave';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import Exams from './pages/Exams';
import MarksEntry from './pages/MarksEntry';
import Fees from './pages/Fees';
import Notices from './pages/Notices';
import AuditLog from './pages/AuditLog';
import Setup from './pages/Setup';
import ChangePassword from './pages/ChangePassword';
import MyAttendance from './pages/me/MyAttendance';
import MyResults from './pages/me/MyResults';
import MyFees from './pages/me/MyFees';
import Feedback from './pages/Feedback';

function Protected({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const user = useAuth((s) => s.user);

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/students" element={<Protected><Students /></Protected>} />
      <Route path="/students/:id" element={<Protected><StudentProfile /></Protected>} />
      <Route path="/staff" element={<Protected><Staff /></Protected>} />
      <Route path="/allocation" element={<Protected><Allocation /></Protected>} />
      <Route path="/timetable" element={<Protected><Timetable /></Protected>} />
      <Route path="/attendance" element={<Protected><AttendanceMark /></Protected>} />
      <Route path="/attendance/reports" element={<Protected><AttendanceReports /></Protected>} />
      <Route path="/substitutions" element={<Protected><Substitutions /></Protected>} />
      <Route path="/leave" element={<Protected><Leave /></Protected>} />
      <Route path="/assignments" element={<Protected><Assignments /></Protected>} />
      <Route path="/assignments/:id" element={<Protected><AssignmentDetail /></Protected>} />
      <Route path="/exams" element={<Protected><Exams /></Protected>} />
      <Route path="/exams/:examId/marks" element={<Protected><MarksEntry /></Protected>} />
      <Route path="/fees" element={<Protected><Fees /></Protected>} />
      <Route path="/notices" element={<Protected><Notices /></Protected>} />
      <Route path="/feedback" element={<Protected><Feedback /></Protected>} />
      <Route path="/audit" element={<Protected><AuditLog /></Protected>} />
      <Route path="/setup" element={<Protected><Setup /></Protected>} />
      <Route path="/change-password" element={<Protected><ChangePassword /></Protected>} />
      <Route path="/me/attendance" element={<Protected><MyAttendance /></Protected>} />
      <Route path="/me/results" element={<Protected><MyResults /></Protected>} />
      <Route path="/me/fees" element={<Protected><MyFees /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

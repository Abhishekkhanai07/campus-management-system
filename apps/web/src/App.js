import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
function Protected({ children }) {
    const user = useAuth((s) => s.user);
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(Layout, { children: children });
}
export default function App() {
    const user = useAuth((s) => s.user);
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: user ? _jsx(Navigate, { to: "/", replace: true }) : _jsx(Login, {}) }), _jsx(Route, { path: "/", element: _jsx(Protected, { children: _jsx(Dashboard, {}) }) }), _jsx(Route, { path: "/students", element: _jsx(Protected, { children: _jsx(Students, {}) }) }), _jsx(Route, { path: "/students/:id", element: _jsx(Protected, { children: _jsx(StudentProfile, {}) }) }), _jsx(Route, { path: "/staff", element: _jsx(Protected, { children: _jsx(Staff, {}) }) }), _jsx(Route, { path: "/allocation", element: _jsx(Protected, { children: _jsx(Allocation, {}) }) }), _jsx(Route, { path: "/timetable", element: _jsx(Protected, { children: _jsx(Timetable, {}) }) }), _jsx(Route, { path: "/attendance", element: _jsx(Protected, { children: _jsx(AttendanceMark, {}) }) }), _jsx(Route, { path: "/attendance/reports", element: _jsx(Protected, { children: _jsx(AttendanceReports, {}) }) }), _jsx(Route, { path: "/substitutions", element: _jsx(Protected, { children: _jsx(Substitutions, {}) }) }), _jsx(Route, { path: "/leave", element: _jsx(Protected, { children: _jsx(Leave, {}) }) }), _jsx(Route, { path: "/assignments", element: _jsx(Protected, { children: _jsx(Assignments, {}) }) }), _jsx(Route, { path: "/assignments/:id", element: _jsx(Protected, { children: _jsx(AssignmentDetail, {}) }) }), _jsx(Route, { path: "/exams", element: _jsx(Protected, { children: _jsx(Exams, {}) }) }), _jsx(Route, { path: "/exams/:examId/marks", element: _jsx(Protected, { children: _jsx(MarksEntry, {}) }) }), _jsx(Route, { path: "/fees", element: _jsx(Protected, { children: _jsx(Fees, {}) }) }), _jsx(Route, { path: "/notices", element: _jsx(Protected, { children: _jsx(Notices, {}) }) }), _jsx(Route, { path: "/audit", element: _jsx(Protected, { children: _jsx(AuditLog, {}) }) }), _jsx(Route, { path: "/setup", element: _jsx(Protected, { children: _jsx(Setup, {}) }) }), _jsx(Route, { path: "/change-password", element: _jsx(Protected, { children: _jsx(ChangePassword, {}) }) }), _jsx(Route, { path: "/me/attendance", element: _jsx(Protected, { children: _jsx(MyAttendance, {}) }) }), _jsx(Route, { path: "/me/results", element: _jsx(Protected, { children: _jsx(MyResults, {}) }) }), _jsx(Route, { path: "/me/fees", element: _jsx(Protected, { children: _jsx(MyFees, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}

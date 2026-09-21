import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/api';
import { Button, ErrorNote, Field, Input } from '../components/ui';
const DEMO = [
    { label: 'Principal', id: 'EMP0001' },
    { label: 'Teacher', id: 'EMP0006' },
    { label: 'Accounts', id: 'EMP0003' },
    { label: 'Student', id: 'ADM20260001' },
    { label: 'Parent', id: 'parent1' },
];
export default function Login() {
    const login = useAuth((s) => s.login);
    const navigate = useNavigate();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const user = await login(loginId, password);
            navigate(user.mustChangePassword ? '/change-password' : '/');
        }
        catch (err) {
            setError(errorText(err));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen grid lg:grid-cols-[1.1fr_1fr]", children: [_jsxs("div", { className: "hidden lg:flex flex-col justify-between bg-ink text-white p-10", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[20px] font-semibold", children: "Campus" }), _jsx("div", { className: "text-[13px] text-ink-300 mt-1", children: "Sunrise Vidyalaya & Junior College" })] }), _jsxs("div", { className: "max-w-md", children: [_jsx("h1", { className: "text-[34px] leading-[1.15] font-semibold", children: "Attendance, marks, fees and staff cover in one place." }), _jsx("p", { className: "text-[14.5px] text-ink-300 mt-4 leading-relaxed", children: "Class teachers mark the register in seconds. Subject teachers mark their own periods. When a teacher takes leave, the periods that need cover appear the moment the leave is approved." }), _jsxs("dl", { className: "mt-8 grid grid-cols-3 gap-4 text-[13px]", children: [_jsxs("div", { children: [_jsx("dt", { className: "text-ink-300", children: "Roles" }), _jsx("dd", { className: "text-[19px] font-semibold tabular mt-0.5", children: "8" })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-ink-300", children: "Modules" }), _jsx("dd", { className: "text-[19px] font-semibold tabular mt-0.5", children: "16" })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-ink-300", children: "Audit trail" }), _jsx("dd", { className: "text-[19px] font-semibold tabular mt-0.5", children: "Full" })] })] })] }), _jsx("p", { className: "text-[12px] text-ink-300", children: "Every action is logged with the user, time and value that changed." })] }), _jsx("div", { className: "flex items-center justify-center p-6 bg-white", children: _jsxs("form", { onSubmit: submit, className: "w-full max-w-[360px]", children: [_jsx("h2", { className: "text-[22px] font-semibold text-ink", children: "Sign in" }), _jsx("p", { className: "text-[13.5px] text-gray-500 mt-1", children: "Use your employee code, admission number or parent ID." }), _jsxs("div", { className: "mt-6 space-y-4", children: [_jsx(Field, { label: "Login ID", children: _jsx(Input, { value: loginId, onChange: (e) => setLoginId(e.target.value), placeholder: "EMP0001", autoFocus: true, required: true }) }), _jsx(Field, { label: "Password", children: _jsx(Input, { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true }) }), error && _jsx(ErrorNote, { text: error }), _jsx(Button, { type: "submit", disabled: busy, className: "w-full justify-center", children: busy ? 'Signing in…' : 'Sign in' })] }), _jsxs("div", { className: "mt-8 border-t border-line pt-4", children: [_jsxs("p", { className: "text-[12.5px] text-gray-500", children: ["Demo logins \u2014 password ", _jsx("span", { className: "font-medium text-gray-700", children: "Campus@123" })] }), _jsx("div", { className: "flex flex-wrap gap-1.5 mt-2", children: DEMO.map((d) => (_jsx("button", { type: "button", onClick: () => {
                                            setLoginId(d.id);
                                            setPassword('Campus@123');
                                        }, className: "text-[12px] border border-line rounded px-2 py-1 hover:border-teal hover:bg-teal-light", children: d.label }, d.id))) })] })] }) })] }));
}

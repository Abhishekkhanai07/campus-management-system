import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post, errorText } from '../lib/api';
import { Button, ErrorNote, Field, Input, Panel, PageTitle } from '../components/ui';
export default function ChangePassword() {
    const navigate = useNavigate();
    const [currentPassword, setCurrent] = useState('');
    const [newPassword, setNew] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirm)
            return setError('The two new passwords do not match');
        try {
            await post('/auth/change-password', { currentPassword, newPassword });
            setDone(true);
            setTimeout(() => navigate('/'), 900);
        }
        catch (err) {
            setError(errorText(err));
        }
    };
    return (_jsxs("div", { className: "max-w-md", children: [_jsx(PageTitle, { title: "Change password", subtitle: "Pick something only you know, at least 8 characters." }), _jsx(Panel, { children: _jsxs("form", { onSubmit: submit, className: "p-4 space-y-4", children: [_jsx(Field, { label: "Current password", children: _jsx(Input, { type: "password", value: currentPassword, onChange: (e) => setCurrent(e.target.value), required: true }) }), _jsx(Field, { label: "New password", children: _jsx(Input, { type: "password", value: newPassword, onChange: (e) => setNew(e.target.value), required: true }) }), _jsx(Field, { label: "Repeat new password", children: _jsx(Input, { type: "password", value: confirm, onChange: (e) => setConfirm(e.target.value), required: true }) }), error && _jsx(ErrorNote, { text: error }), done && _jsx("p", { className: "text-[13.5px] text-grass", children: "Password changed." }), _jsx(Button, { type: "submit", children: "Change password" })] }) })] }));
}

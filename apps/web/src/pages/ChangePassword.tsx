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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) return setError('The two new passwords do not match');
    try {
      await post('/auth/change-password', { currentPassword, newPassword });
      setDone(true);
      setTimeout(() => navigate('/'), 900);
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="max-w-md">
      <PageTitle title="Change password" subtitle="Pick something only you know, at least 8 characters." />
      <Panel>
        <form onSubmit={submit} className="p-4 space-y-4">
          <Field label="Current password">
            <Input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
          </Field>
          <Field label="New password">
            <Input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required />
          </Field>
          <Field label="Repeat new password">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
          {error && <ErrorNote text={error} />}
          {done && <p className="text-[13.5px] text-grass">Password changed.</p>}
          <Button type="submit">Change password</Button>
        </form>
      </Panel>
    </div>
  );
}

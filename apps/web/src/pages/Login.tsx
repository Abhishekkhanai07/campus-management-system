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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(loginId, password);
      navigate(user.mustChangePassword ? '/change-password' : '/');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* left: what the product does, in the institute's own words */}
      <div className="hidden lg:flex flex-col justify-between bg-ink text-white p-10">
        <div>
          <div className="text-[20px] font-semibold">Campus</div>
          <div className="text-[13px] text-ink-300 mt-1">Sunrise Vidyalaya &amp; Junior College</div>
        </div>

        <div className="max-w-md">
          <h1 className="text-[34px] leading-[1.15] font-semibold">
            Attendance, marks, fees and staff cover in one place.
          </h1>
          <p className="text-[14.5px] text-ink-300 mt-4 leading-relaxed">
            Class teachers mark the register in seconds. Subject teachers mark their own periods.
            When a teacher takes leave, the periods that need cover appear the moment the leave is approved.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-4 text-[13px]">
            <div>
              <dt className="text-ink-300">Roles</dt>
              <dd className="text-[19px] font-semibold tabular mt-0.5">8</dd>
            </div>
            <div>
              <dt className="text-ink-300">Modules</dt>
              <dd className="text-[19px] font-semibold tabular mt-0.5">16</dd>
            </div>
            <div>
              <dt className="text-ink-300">Audit trail</dt>
              <dd className="text-[19px] font-semibold tabular mt-0.5">Full</dd>
            </div>
          </dl>
        </div>

        <p className="text-[12px] text-ink-300">
          Every action is logged with the user, time and value that changed.
        </p>
      </div>

      {/* right: sign in */}
      <div className="flex items-center justify-center p-6 bg-white">
        <form onSubmit={submit} className="w-full max-w-[360px]">
          <h2 className="text-[22px] font-semibold text-ink">Sign in</h2>
          <p className="text-[13.5px] text-gray-500 mt-1">
            Use your employee code, admission number or parent ID.
          </p>

          <div className="mt-6 space-y-4">
            <Field label="Login ID">
              <Input
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="EMP0001"
                autoFocus
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            {error && <ErrorNote text={error} />}

            <Button type="submit" disabled={busy} className="w-full justify-center">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>

          <div className="mt-8 border-t border-line pt-4">
            <p className="text-[12.5px] text-gray-500">
              Demo logins — password <span className="font-medium text-gray-700">Campus@123</span>
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {DEMO.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setLoginId(d.id);
                    setPassword('Campus@123');
                  }}
                  className="text-[12px] border border-line rounded px-2 py-1 hover:border-teal hover:bg-teal-light"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

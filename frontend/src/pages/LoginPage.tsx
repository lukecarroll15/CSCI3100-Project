import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../auth/useAuth';
import { ApiRequestError } from '../api/client';

type Step = 'email' | 'code';

export default function LoginPage() {
  const navigate = useNavigate();
  const { requestOtp, verifyOtp } = useAuth();

  const appName = useMemo(
    () => (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'TaskFlow',
    []
  );

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSendCode = async () => {
    setMsg(null);
    setBusy(true);
    try {
      await requestOtp(email.trim());
      setStep('code');
      setMsg('Login code sent. Check your email (or backend logs if SMTP is not configured).');
    } catch (e) {
      if (e instanceof ApiRequestError) setMsg(`${e.code}: ${e.message}`);
      else setMsg('Failed to request OTP.');
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setMsg(null);
    setBusy(true);
    try {
      await verifyOtp(email.trim(), code.trim());
      navigate('/', { replace: true });
    } catch (e) {
      if (e instanceof ApiRequestError) setMsg(`${e.code}: ${e.message}`);
      else setMsg('Failed to verify OTP.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mb-8 inline-block rounded-lg border-2 border-gray-800 px-10 py-3 text-3xl text-gray-800">
          {appName}
        </div>

        <div className="w-96 rounded-xl border-2 border-gray-800 bg-white p-9 shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
          <h2 className="mb-6 border-b-2 border-gray-800 pb-3 text-xl">Sign In (OTP)</h2>

          {msg && (
            <div className="mb-4 rounded-md border border-gray-400 bg-gray-50 p-3 text-left text-sm text-gray-700">
              {msg}
            </div>
          )}

          {step === 'email' && (
            <>
              <Input
                label="Email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={onSendCode} className="mt-2 w-full" disabled={busy || !email.trim()}>
                {busy ? 'Sending...' : 'Send login code'}
              </Button>
            </>
          )}

          {step === 'code' && (
            <>
              <div className="mb-5 text-left">
                <div className="rounded-md border-2 border-gray-500 bg-gray-50 px-3 py-1.5 text-sm">
                  Email: {email || '[email]'}
                </div>
              </div>
              <Input
                label="One-time code"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button onClick={onVerify} className="mt-2 w-full" disabled={busy || !code.trim()}>
                {busy ? 'Verifying...' : 'Verify & continue'}
              </Button>
              <button
                onClick={() => setStep('email')}
                className="mt-4 block w-full cursor-pointer rounded-md border border-gray-400 p-2 text-center text-sm text-gray-500 underline hover:bg-gray-50"
                disabled={busy}
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ApiRequestError } from '../api/client';
import { useAuth } from '../auth/useAuth';
import type { OtpPurpose } from '../api/auth';

type Step = 'details' | 'code';

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.payload?.error?.message ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Unexpected error';
}

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [purpose, setPurpose] = useState<OtpPurpose>('login');
  const [step, setStep] = useState<Step>('details');

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loading && auth.user) navigate('/');
  }, [auth.loading, auth.user, navigate]);

  useEffect(() => {
    setStep('details');
    setCode('');
    setMessage(null);
  }, [purpose]);

  async function onSendCode() {
    setMessage(null);
    setBusy(true);
    try {
      await auth.requestOtp(email, purpose);
      setStep('code');
      setMessage('Code sent. Check your email (or Mailpit in dev).');
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setMessage(null);
    setBusy(true);
    try {
      await auth.verifyOtp(email, code, purpose, purpose === 'signup' ? displayName : undefined);
      navigate('/');
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">TaskFlow</h1>
            <p className="text-sm text-gray-600">Email OTP authentication</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={purpose === 'login' ? 'primary' : 'outline'}
              onClick={() => setPurpose('login')}
              disabled={busy}
            >
              Log in
            </Button>
            <Button
              variant={purpose === 'signup' ? 'primary' : 'outline'}
              onClick={() => setPurpose('signup')}
              disabled={busy}
            >
              Sign up
            </Button>
          </div>
        </div>

        {message ? (
          <div className="mb-4 rounded border border-gray-200 bg-gray-100 p-3 text-sm text-gray-800">
            {message}
          </div>
        ) : null}

        {step === 'details' ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>

            {purpose === 'signup' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Display name (optional)
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Nate"
                  type="text"
                  autoComplete="nickname"
                />
              </div>
            ) : null}

            <Button
              className="w-full"
              onClick={onSendCode}
              disabled={busy || email.trim().length === 0}
            >
              {busy ? 'Sending…' : purpose === 'signup' ? 'Send Sign-up Code' : 'Send Login Code'}
            </Button>

            {purpose === 'login' ? (
              <p className="text-xs text-gray-500">
                Only registered emails can log in. Use “Sign up” to create an account.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Signing up creates your user profile after you verify the code.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Verification code</label>
                <button
                  type="button"
                  className="text-sm text-gray-600 underline hover:text-gray-900"
                  onClick={() => setStep('details')}
                  disabled={busy}
                >
                  Change email
                </button>
              </div>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>

            <Button
              className="w-full"
              onClick={onVerify}
              disabled={busy || code.trim().length === 0}
            >
              {busy ? 'Verifying…' : purpose === 'signup' ? 'Create Account' : 'Log In'}
            </Button>

            <Button className="w-full" variant="outline" onClick={onSendCode} disabled={busy}>
              Resend code
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

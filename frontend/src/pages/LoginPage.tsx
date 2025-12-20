// login-styling-and-structure-LoginPage.tsx
import { useEffect, useMemo, useState } from 'react';
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

  const isSignup = purpose === 'signup';

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
      setMessage('Code sent. Check your [email] (or Mailpit in dev).');
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
      await auth.verifyOtp(email, code, purpose, isSignup ? displayName : undefined);
      navigate('/');
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Optional: if you already have a GitHub OAuth endpoint, set VITE_GITHUB_OAUTH_URL.
  const githubAuthHref = import.meta.env.VITE_GITHUB_OAUTH_URL ?? '/api/v1/auth/github';

  const wireframeBgStyle = useMemo(() => {
    // Subtle “wireframe” overlay (no asset needed)
    const svg = encodeURIComponent(`
      <svg width="1200" height="1200" viewBox="0 0 1200 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.45" stroke="white" stroke-opacity="0.22" stroke-width="2">
          <path d="M170 250 L560 120 L980 330 L600 470 Z"/>
          <path d="M220 510 L610 380 L1030 590 L650 740 Z"/>
          <path d="M300 170 L760 90 L1040 260 L600 360 Z"/>
          <path d="M240 780 L700 640 L1040 820 L620 980 Z"/>
          <path d="M420 240 L420 980"/>
          <path d="M600 150 L600 1020"/>
          <path d="M800 200 L800 980"/>
          <path d="M170 250 L240 780"/>
          <path d="M560 120 L700 640"/>
          <path d="M980 330 L1040 820"/>
        </g>
      </svg>
    `);

    return {
      backgroundImage: `url("data:image/svg+xml,${svg}")`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    } as const;
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT: Form */}
        <div className="relative isolate flex min-h-screen flex-col bg-white">
          <header className="absolute left-8 right-8 top-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icon can be swapped later */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm">
                <span className="text-sm font-semibold">TF</span>
              </div>
              <span className="text-lg font-semibold tracking-tight text-neutral-900">
                [TaskFlow]
              </span>
            </div>

            <button
              type="button"
              className="cursor-pointer text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => setPurpose(isSignup ? 'login' : 'signup')}
              disabled={busy}
            >
              {isSignup ? 'Log in' : 'Sign up'}
            </button>
          </header>

          <main className="flex flex-1 items-center justify-center px-8 py-20 sm:py-24">
            <div className="w-full max-w-md">
              <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
                {isSignup ? '[Create your account]' : '[Welcome back]'}
              </h1>
              <p className="mt-3 text-base text-neutral-500 sm:text-lg">
                {isSignup
                  ? 'Enter your [email] to sign up for [TaskFlow]'
                  : 'Enter your [email] to sign in to your account'}
              </p>

              {message ? (
                <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                  {message}
                </div>
              ) : null}

              {/* DETAILS STEP */}
              {step === 'details' ? (
                <div className="mt-8 space-y-6">
                  <Button
                    variant="outline"
                    className="h-12 w-full justify-center gap-2"
                    disabled={busy}
                    // Use href for a standard OAuth redirect flow.
                    onClick={() => {
                      window.location.href = githubAuthHref;
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="h-5 w-5 text-neutral-900"
                      fill="currentColor"
                    >
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    Login with [GitHub]
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-neutral-200" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-4 text-[11px] font-medium tracking-wider text-neutral-400">
                        OR CONTINUE WITH [EMAIL]
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-900">[Email]</label>
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        type="email"
                        autoComplete="email"
                      />
                    </div>

                    {isSignup ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-900">
                          Display [name] <span className="text-neutral-400">(optional)</span>
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
                      variant="primary"
                      className="h-12 w-full"
                      onClick={onSendCode}
                      disabled={busy || email.trim().length === 0}
                    >
                      {busy ? 'Sending…' : isSignup ? '[Send Sign-up Code]' : '[Send Login Code]'}
                    </Button>

                    <p className="text-center text-xs text-neutral-500">
                      By clicking continue, you agree to our{' '}
                      <a
                        className="cursor-pointer underline transition-colors hover:text-neutral-900"
                        href="#"
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        className="cursor-pointer underline transition-colors hover:text-neutral-900"
                        href="#"
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </div>
                </div>
              ) : (
                /* CODE STEP */
                <div className="mt-8 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-neutral-900">
                        Verification code
                      </label>
                      <button
                        type="button"
                        className="cursor-pointer text-sm font-medium text-neutral-500 underline hover:text-neutral-900 disabled:cursor-not-allowed"
                        onClick={() => setStep('details')}
                        disabled={busy}
                      >
                        Change [email]
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
                    variant="primary"
                    className="h-12 w-full"
                    onClick={onVerify}
                    disabled={busy || code.trim().length === 0}
                  >
                    {busy ? 'Verifying…' : isSignup ? 'Create Account' : 'Log In'}
                  </Button>

                  <Button
                    variant="outline"
                    className="h-12 w-full"
                    onClick={onSendCode}
                    disabled={busy}
                  >
                    Resend code
                  </Button>

                  <p className="text-center text-xs text-neutral-500">
                    Didn’t receive it? Check your spam folder (or Mailpit in dev).
                  </p>
                </div>
              )}
            </div>
          </main>

          <footer className="absolute bottom-6 left-8 text-sm text-neutral-400">
            TaskFlow Development Suite © 2025
          </footer>
        </div>

        {/* RIGHT: Testimonial Panel */}
        <div className="hidden bg-white lg:block">
          <div className="h-full p-6">
            <div className="relative h-full">
              <div
                className="orbital-glow pointer-events-none absolute inset-0 translate-y-3 scale-[0.97] rounded-[36px] opacity-90 blur-3xl"
                aria-hidden
              />
              <div className="relative z-10 flex h-full w-full items-center overflow-hidden rounded-[32px] bg-neutral-950 shadow-[0_28px_120px_rgba(15,23,42,0.35)]">
                {/* Background layers */}
                <div className="absolute inset-0 opacity-60" style={wireframeBgStyle} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.10),transparent_45%),radial-gradient(circle_at_70%_55%,rgba(255,255,255,0.08),transparent_55%)]" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />

                {/* Foreground content */}
                <div className="relative z-10 max-w-xl px-12">
                  <p className="text-5xl font-semibold leading-[1.05] tracking-tight text-white">
                    “[TaskFlow] <span className="italic">assisted</span> us to ship our MVP{' '}
                    <span className="italic">in weeks, not months.</span>”
                  </p>

                  <div className="mt-10 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold text-white ring-1 ring-white/10">
                      JD.
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white/90">John Doe</div>
                      <div className="text-sm italic text-white/60">
                        Senior Engineer at [Acme Inc.]
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur">
                    <span className="ripple-dot">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(255,255,255,0.10)]" />
                    </span>
                    Minimal By Default
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /RIGHT */}
      </div>
    </div>
  );
}

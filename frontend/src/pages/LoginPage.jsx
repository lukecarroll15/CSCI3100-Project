import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    licenseKey: '',
  });

  const handleChange = (field) => (e) => {
    let value = e.target.value;

    // Auto-format license key
    if (field === 'licenseKey') {
      value = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      let formatted = '';
      for (let i = 0; i < value.length && i < 12; i++) {
        if (i > 0 && i % 4 === 0) formatted += '-';
        formatted += value[i];
      }
      value = formatted;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleLogin = () => {
    // TODO: Implement actual login logic
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        {/* Company Name */}
        <div className="mb-8 inline-block rounded-lg border-2 border-gray-800 px-10 py-3 text-3xl text-gray-800">
          SecureVault
        </div>

        {/* Login Card */}
        <div className="w-96 rounded-xl border-2 border-gray-800 bg-white p-9 shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
          {/* Step 1: Username */}
          {step === 1 && (
            <div>
              <h2 className="mb-6 border-b-2 border-gray-800 pb-3 text-xl">Sign In</h2>
              <Input
                label="Username or Email"
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange('username')}
              />
              <Button onClick={handleNext} className="mt-3 w-full">
                Next
              </Button>
              <div className="mt-5 rounded-md border border-gray-400 p-3 text-center text-xs text-gray-500">
                Create account | Forgot username?
              </div>
            </div>
          )}

          {/* Step 2: Password */}
          {step === 2 && (
            <div>
              <h2 className="mb-6 border-b-2 border-gray-800 pb-3 text-xl">Enter Password</h2>
              <div className="mb-5 text-left">
                <div className="rounded-md border-2 border-gray-500 bg-gray-50 px-3 py-1.5 text-sm">
                  Username: {formData.username || '[username]'}
                </div>
              </div>
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange('password')}
              />
              <Button onClick={handleNext} className="mt-3 w-full">
                Next
              </Button>
              <button
                onClick={handleBack}
                className="mt-4 block w-full cursor-pointer rounded-md border border-gray-400 p-2 text-center text-sm text-gray-500 underline hover:bg-gray-50"
              >
                ← Back to Username
              </button>
              <div className="mt-5 rounded-md border border-gray-400 p-3 text-center text-xs text-gray-500">
                Forgot password?
              </div>
            </div>
          )}

          {/* Step 3: License Key */}
          {step === 3 && (
            <div>
              <h2 className="mb-6 border-b-2 border-gray-800 pb-3 text-xl">Company License Key</h2>
              <div className="mb-5 text-left">
                <div className="rounded-md border-2 border-gray-500 bg-gray-50 px-3 py-1.5 text-sm">
                  Username: {formData.username || '[username]'}
                </div>
              </div>
              <Input
                label="License Key (Format: AAAA-BBBB-CCCC)"
                type="text"
                placeholder="AAAA-BBBB-CCCC"
                maxLength={14}
                value={formData.licenseKey}
                onChange={handleChange('licenseKey')}
              />
              <Button onClick={handleLogin} className="mt-3 w-full">
                Sign In
              </Button>
              <button
                onClick={handleBack}
                className="mt-4 block w-full cursor-pointer rounded-md border border-gray-400 p-2 text-center text-sm text-gray-500 underline hover:bg-gray-50"
              >
                ← Back to Password
              </button>
              <div className="mt-5 rounded-md border border-gray-400 p-3 text-center text-xs text-gray-500">
                Contact your administrator for license key
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

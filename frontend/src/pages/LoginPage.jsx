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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        {/* Company Name */}
        <div className="text-3xl mb-8 text-gray-800 border-2 border-gray-800 rounded-lg px-10 py-3 inline-block">
          SecureVault
        </div>

        {/* Login Card */}
        <div className="bg-white border-2 border-gray-800 rounded-xl p-9 w-96 shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
          {/* Step 1: Username */}
          {step === 1 && (
            <div>
              <h2 className="text-xl mb-6 border-b-2 border-gray-800 pb-3">Sign In</h2>
              <Input
                label="Username or Email"
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange('username')}
              />
              <Button onClick={handleNext} className="w-full mt-3">
                Next
              </Button>
              <div className="text-xs text-gray-500 mt-5 border border-gray-400 rounded-md p-3 text-center">
                Create account | Forgot username?
              </div>
            </div>
          )}

          {/* Step 2: Password */}
          {step === 2 && (
            <div>
              <h2 className="text-xl mb-6 border-b-2 border-gray-800 pb-3">Enter Password</h2>
              <div className="mb-5 text-left">
                <div className="text-sm border-2 border-gray-500 rounded-md px-3 py-1.5 bg-gray-50">
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
              <Button onClick={handleNext} className="w-full mt-3">
                Next
              </Button>
              <button
                onClick={handleBack}
                className="mt-4 text-sm text-gray-500 underline cursor-pointer border border-gray-400 rounded-md p-2 block w-full text-center hover:bg-gray-50"
              >
                ← Back to Username
              </button>
              <div className="text-xs text-gray-500 mt-5 border border-gray-400 rounded-md p-3 text-center">
                Forgot password?
              </div>
            </div>
          )}

          {/* Step 3: License Key */}
          {step === 3 && (
            <div>
              <h2 className="text-xl mb-6 border-b-2 border-gray-800 pb-3">Company License Key</h2>
              <div className="mb-5 text-left">
                <div className="text-sm border-2 border-gray-500 rounded-md px-3 py-1.5 bg-gray-50">
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
              <Button onClick={handleLogin} className="w-full mt-3">
                Sign In
              </Button>
              <button
                onClick={handleBack}
                className="mt-4 text-sm text-gray-500 underline cursor-pointer border border-gray-400 rounded-md p-2 block w-full text-center hover:bg-gray-50"
              >
                ← Back to Password
              </button>
              <div className="text-xs text-gray-500 mt-5 border border-gray-400 rounded-md p-3 text-center">
                Contact your administrator for license key
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

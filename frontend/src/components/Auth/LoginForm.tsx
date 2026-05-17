/**
 * Login Form Component
 * 
 * A dual-purpose authentication form that handles both login and registration.
 * Users can toggle between modes without losing their place.
 * 
 * BEGINNER EXPLANATION:
 * This is the gateway to the application. It's like the front door:
 * - Existing users "unlock" the door with email + password (login)
 * - New users "get a key made" by creating an account (register)
 * - Forgot key? Click "Forgot Password" to get a new one
 * 
 * DUAL MODE DESIGN:
 * Instead of separate login and register pages, this component switches between
 * modes with a toggle. This provides better UX and code reusability.
 * 
 * LOGIN MODE:
 * - Shows: email, password fields
 * - Validates: credentials against database
 * - On success: Calls onLoginSuccess with user object
 * 
 * REGISTER MODE:
 * - Shows: full name, email, phone, user type, password, confirm password
 * - Validates: password match, minimum length, required fields
 * - Creates: new user account
 * - Auto-logs in: After successful registration
 * 
 * DEMO CREDENTIALS:
 * For testing, displays sample login credentials for each user type.
 * Remove this in production!
 * 
 * @param onLoginSuccess - Callback when user successfully logs in
 * @param onSwitchToRegister - Callback to switch to register mode (not used in dual mode)
 * @param onForgotPassword - Callback to show forgot password form
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Footer from '@/components/ui/footer';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';

interface LoginFormProps {
  onLoginSuccess: (user: any) => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export default function LoginForm({ onLoginSuccess, onSwitchToRegister, onForgotPassword }: LoginFormProps) {
  const { t } = useTranslation();

  // STATE: Toggle between login (true) and register (false) modes
  const [isLogin, setIsLogin] = useState(true);

  // STATE: Email address (required for both modes)
  const [email, setEmail] = useState('');

  // STATE: Password (required for both modes)
  const [password, setPassword] = useState('');

  // STATE: Password confirmation (register mode only)
  const [confirmPassword, setConfirmPassword] = useState('');

  // STATE: Full name (register mode only)
  const [fullName, setFullName] = useState('');

  // STATE: Phone number (register mode only)
  const [phone, setPhone] = useState('');

  // STATE: User type - pet_owner, veterinarian, or administrator (register mode only)
  const [userType, setUserType] = useState('');

  // STATE: Toggle password visibility (show/hide)
  const [showPassword, setShowPassword] = useState(false);

  // STATE: Error message to display
  const [error, setError] = useState('');

  // STATE: Loading indicator during API call
  const [loading, setLoading] = useState(false);

  /**
   * Handle Form Submission
   * 
   * This function handles both login and registration based on current mode.
   * Performs validation before making API calls.
   * 
   * LOGIN FLOW:
   * 1. Send email + password to backend
   * 2. Backend validates credentials
   * 3. If valid, returns user object and JWT token
   * 4. Token is stored automatically by API interceptor
   * 5. Call onLoginSuccess to navigate to dashboard
   * 
   * REGISTER FLOW:
   * 1. Validate password match
   * 2. Validate user type selected
   * 3. Validate password length (min 8 chars)
   * 4. Send registration data to backend
   * 5. Backend creates account
   * 6. Auto-login: Same as login flow above
   * 
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login with backend API
        const { user } = await authAPI.login(email, password);
        toast.success(t('toast.welcomeBack', { name: user.fullName }));
        onLoginSuccess(user);
      } else {
        // Registration logic
        if (password !== confirmPassword) {
          setError(t('validation.passwordsNotMatch'));
          setLoading(false);
          return;
        }
        if (!userType) {
          setError(t('validation.selectUserType'));
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError(t('validation.passwordTooShort'));
          setLoading(false);
          return;
        }

        // Register with backend API
        const { user } = await authAPI.register({
          email,
          password,
          fullName,
          phone,
          userType,
        });

        toast.success(t('toast.welcomeToPetcare', { name: user.fullName }));
        onLoginSuccess(user);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || t('errors.generic');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-petcare-beige to-petcare-golden/20">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-end">
              <LanguageSwitcher />
            </div>
            <div className="flex justify-center mb-4">
              <img
                src="/petcare-logo.png"
                alt="PetCare Logo"
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-petcare-navy">
              {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? t('auth.loginSubtitle')
                : t('auth.registerSubtitle')
              }
            </CardDescription>
            {isLogin && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <p className="font-medium text-blue-900 mb-2">{t('auth.demoCredentials')}</p>
                <div className="space-y-1 text-blue-800">
                  <p><strong>{t('auth.petOwner')}:</strong> owner@petcare.com / password123</p>
                  <p><strong>{t('auth.veterinarian')}:</strong> vet@petcare.com / password123</p>
                  <p><strong>{t('auth.administrator')}:</strong> admin@petcare.com / password123</p>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder={t('auth.fullNamePlaceholder')}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                    placeholder={t('auth.emailPlaceholder')}
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('auth.phoneNumber')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="pl-10"
                      placeholder={t('auth.phoneNumberPlaceholder')}
                    />
                  </div>
                </div>
              )}

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="userType">{t('auth.userType')}</Label>
                  <Select value={userType} onValueChange={setUserType} required>
                    <SelectTrigger>
                      <SelectValue placeholder={t('auth.userTypePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pet_owner">{t('auth.petOwner')}</SelectItem>
                      <SelectItem value="veterinarian">{t('auth.veterinarian')}</SelectItem>
                      <SelectItem value="administrator">{t('auth.administrator')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10"
                    placeholder={t('auth.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-10"
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                    />
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.processing') : (isLogin ? t('auth.signIn') : t('auth.createAccount'))}
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              {isLogin && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-petcare-primary hover:text-petcare-navy text-sm transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setFullName('');
                    setPhone('');
                    setUserType('');
                  }}
                  className="text-petcare-primary hover:text-petcare-navy text-sm transition-colors"
                >
                  {isLogin
                    ? t('auth.noAccount')
                    : t('auth.hasAccount')
                  }
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}

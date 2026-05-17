/**
 * Reset Password Form Component
 * 
 * This form allows users to set a new password using a reset token they received via email.
 * It validates the token, ensures passwords match, and updates the user's password securely.
 * 
 * BEGINNER EXPLANATION:
 * This is the second part of password recovery:
 * 1. User clicks the link from their email
 * 2. That link contains a special code (token) that proves they own the email
 * 3. This form extracts the token and lets them enter a new password
 * 4. Backend verifies token is valid and not expired, then updates password
 * 
 * TOKEN FLOW:
 * - Token is generated when user requests password reset (expires in 1 hour)
 * - Token is embedded in URL: website.com/reset#token=abc123
 * - We extract it from URL and send it with the new password
 * - Backend checks: Is token valid? Is it expired? Has it been used?
 * - If all checks pass, password is updated
 * 
 * SECURITY:
 * - Tokens expire after 1 hour
 * - Each token can only be used once
 * - Password must be at least 8 characters
 * - Token is cryptographically secure (random, unpredictable)
 * 
 * @param resetToken - Optional token passed as prop (usually from URL)
 * @param onSuccess - Callback when password is successfully reset
 * @param onBack - Callback to return to forgot password screen
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { getResetTokenFromURL } from '../../utils/passwordRecovery';
import { authAPI } from '@/lib/api';

interface ResetPasswordFormProps {
  resetToken?: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function ResetPasswordForm({ resetToken: propToken, onSuccess, onBack }: ResetPasswordFormProps) {
  const { t } = useTranslation();

  // STATE: New password entered by user
  const [password, setPassword] = useState('');

  // STATE: Password confirmation (must match password)
  const [confirmPassword, setConfirmPassword] = useState('');

  // STATE: Toggle visibility of password field
  const [showPassword, setShowPassword] = useState(false);

  // STATE: Toggle visibility of confirm password field
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // STATE: Loading indicator during API call
  const [loading, setLoading] = useState(false);

  // STATE: Error message if validation or reset fails
  const [error, setError] = useState('');

  // STATE: Success message after password is reset
  const [success, setSuccess] = useState('');

  // STATE: Whether token has been validated
  // If false, shows loading screen while checking token
  const [tokenValidated, setTokenValidated] = useState(true);

  // Get reset token from either props or URL hash
  // Props are used in testing, URL is used in production
  const token = propToken || getResetTokenFromURL();

  /**
   * EFFECT: Validate Reset Token
   * 
   * Runs once when component mounts to check if token exists.
   * If no token, shows error message.
   * 
   * In production, you might also validate with backend here,
   * but current implementation validates on submit.
   */
  useEffect(() => {
    if (!token) {
      setError(t('errors.noResetToken'));
    }
  }, [token]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!token) {
        setError(t('errors.noResetTokenAvailable'));
        setLoading(false);
        return;
      }

      if (!password.trim()) {
        setError(t('errors.enterNewPassword'));
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError(t('errors.passwordsNotMatch'));
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setError(t('errors.passwordTooShort'));
        setLoading(false);
        return;
      }

      const result = await authAPI.resetPassword(token, password);
      setSuccess(result.message || t('errors.resetSuccess'));
      // Auto-redirect after a short delay
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(t('errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while validating token
  if (!tokenValidated) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-petcare-beige to-petcare-golden/20">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center space-y-4 pt-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              <p className="text-gray-600">{t('resetPassword.validating')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error if token is invalid or missing
  if (!token || error.includes('invalid') || error.includes('expired') || error.includes('No reset token')) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-petcare-beige to-petcare-golden/20">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-petcare-navy">
                {t('resetPassword.invalidLink')}
              </CardTitle>
              <CardDescription>
                {t('resetPassword.linkExpired')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>

              <div className="text-sm text-gray-600">
                <p>{t('resetPassword.whyInvalid')}</p>
                <ul className="list-disc list-inside space-y-1 text-xs mt-2">
                  <li>{t('resetPassword.whyExpired')}</li>
                  <li>{t('resetPassword.whyUsed')}</li>
                  <li>{t('resetPassword.whyCopied')}</li>
                </ul>
              </div>

              <Button
                onClick={onBack}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('resetPassword.requestNew')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-petcare-beige to-petcare-golden/20">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-petcare-navy">
                {t('resetPassword.success')}
              </CardTitle>
              <CardDescription>
                {t('resetPassword.successMessage')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {success}
                </AlertDescription>
              </Alert>

              <p className="text-sm text-gray-600 text-center">
                {t('resetPassword.redirecting')}
              </p>

              <Button
                onClick={onSuccess}
                className="w-full"
              >
                {t('resetPassword.continue')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-petcare-beige to-petcare-golden/20">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/petcare-logo.png"
                alt="PetCare Logo"
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-petcare-navy">
              {t('resetPassword.title')}
            </CardTitle>
            <CardDescription>
              {t('resetPassword.subtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10"
                    placeholder={t('resetPassword.newPasswordPlaceholder')}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 pr-10"
                    placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password requirements */}
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">{t('resetPassword.requirements')}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('resetPassword.reqLength')}</li>
                  <li>{t('resetPassword.reqUppercase')}</li>
                  <li>{t('resetPassword.reqLowercase')}</li>
                  <li>{t('resetPassword.reqNumber')}</li>
                </ul>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {t('resetPassword.updating')}
                    </>
                  ) : (
                    t('resetPassword.updateButton')
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={onBack}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('resetPassword.backToLogin')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

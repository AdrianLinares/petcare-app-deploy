/**
 * Forgot Password Form Component
 * 
 * This form allows users to request a password reset link when they've forgotten their password.
 * It validates the email and sends a reset link to the user's registered email address.
 * 
 * BEGINNER EXPLANATION:
 * Think of this like the "Forgot Password" feature you see on any website.
 * User enters their email → System sends them a special link → They click link to reset password
 * 
 * FLOW:
 * 1. User enters their email address
 * 2. System validates email format
 * 3. Backend checks if email exists in database
 * 4. If exists, sends email with reset link containing a secure token
 * 5. Shows success message (even if email doesn't exist, for security)
 * 
 * SECURITY NOTE:
 * We don't reveal if an email exists in our database to prevent enumeration attacks.
 * We always show "If that email exists, we sent a link" regardless of whether it's real.
 * 
 * @param onBack - Callback function to return to login screen
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export default function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const { t } = useTranslation();

  // STATE: Email address entered by user
  const [email, setEmail] = useState('');

  // STATE: Loading indicator while API call is in progress
  const [loading, setLoading] = useState(false);

  // STATE: Whether form has been successfully submitted
  // Used to show the "Check Your Email" success screen
  const [submitted, setSubmitted] = useState(false);

  // STATE: Error message to display if something goes wrong
  const [error, setError] = useState('');

  // STATE: Success message from API
  const [success, setSuccess] = useState('');

  /**
   * Handle Password Reset Request
   * 
   * Called when user submits the forgot password form.
   * Validates email format and sends reset request to backend.
   * 
   * VALIDATION STEPS:
   * 1. Check if email is not empty
   * 2. Validate email format using regex pattern
   * 3. Send request to backend API
   * 4. Show success message (regardless of whether email exists)
   * 
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!email.trim()) {
        setError(t('errors.enterEmail'));
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError(t('errors.invalidEmail'));
        return;
      }

      const response = await authAPI.forgotPassword(email.trim());
      setSuccess(response.message || t('forgotPassword.instructionsSent'));
      setSubmitted(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(t('errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setSubmitted(false);
    setSuccess('');
    setError('');
    setEmail('');
  };

  if (submitted && success) {
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
                {t('forgotPassword.checkEmail')}
              </CardTitle>
              <CardDescription>
                {t('forgotPassword.instructionsSent')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {success}
                </AlertDescription>
              </Alert>

              <div className="text-sm text-gray-600 space-y-2">
                <p>{t('forgotPassword.checkSpam')}</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>{t('forgotPassword.spamFolder')}</li>
                  <li>{t('forgotPassword.correctEmail')}</li>
                  <li>{t('forgotPassword.emailBlocked')}</li>
                </ul>
              </div>

              <div className="flex flex-col space-y-2">
                <Button
                  onClick={handleTryAgain}
                  variant="outline"
                  className="w-full"
                >
                  {t('forgotPassword.sendAnother')}
                </Button>

                <Button
                  onClick={onBack}
                  variant="ghost"
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('forgotPassword.backToLogin')}
                </Button>
              </div>
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
              {t('forgotPassword.title')}
            </CardTitle>
            <CardDescription>
              {t('forgotPassword.subtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('forgotPassword.emailLabel')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    autoComplete="email"
                  />
                </div>
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
                      {t('forgotPassword.sending')}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t('forgotPassword.sendLink')}
                    </>
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
                  {t('forgotPassword.backToLogin')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

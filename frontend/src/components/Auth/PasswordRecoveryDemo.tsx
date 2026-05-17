/**
 * Password Recovery Demo Dashboard (DEVELOPMENT ONLY)
 * 
 * A testing and debugging tool for the password recovery system.
 * Shows simulated email logs and reset token status.
 * 
 * ⚠️ IMPORTANT: THIS IS FOR DEVELOPMENT/TESTING ONLY!
 * Remove or disable this component in production builds.
 * 
 * BEGINNER EXPLANATION:
 * In production, password reset emails would be sent via a real email service
 * (like SendGrid, AWS SES, etc.). But during development, we can't actually
 * send emails, so we simulate them and display them here.
 * 
 * Think of this as an "email inbox simulator" for testing.
 * 
 * WHAT IT SHOWS:
 * - List of all "emails" that would have been sent
 * - Reset links with tokens
 * - Token statistics (total, active, expired, used)
 * - Testing instructions
 * - Available test user accounts
 * 
 * HOW TO USE FOR TESTING:
 * 1. Go to login page, click "Forgot Password"
 * 2. Enter a test user's email
 * 3. Come back to this dashboard
 * 4. See the "email" with reset link
 * 5. Click "Test" button to try the reset flow
 * 6. Complete password reset
 * 7. Verify you can login with new password
 * 
 * FEATURES:
 * - Auto-refreshes every 5 seconds
 * - Copy reset links to clipboard
 * - Test reset links directly
 * - Clear logs button
 * - Color-coded token status
 * 
 * @returns Demo dashboard component
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { getDemoEmailLog, clearDemoEmailLog } from '../../lib/supabase';
import { getResetTokenStats } from '../../utils/passwordRecovery';

// ⚠️ DEVELOPMENT ONLY - Remove in production
export default function PasswordRecoveryDemo() {
  // STATE: List of simulated email logs
  const [emails, setEmails] = useState<any[]>([]);

  // STATE: Token statistics (total, active, expired, used)
  const [stats, setStats] = useState<any>(null);

  // STATE: Tracks which link was just copied (for showing "Copied!" feedback)
  const [copied, setCopied] = useState('');

  /**
   * Refresh Dashboard Data
   * 
   * Fetches latest email logs and token statistics from localStorage.
   * Called manually and automatically every 5 seconds.
   */
  const refreshData = () => {
    setEmails(getDemoEmailLog());
    setStats(getResetTokenStats());
  };

  /**
   * Clear All Logs
   * 
   * Deletes all simulated emails and resets the dashboard.
   * Useful for starting fresh during testing.
   */
  const clearLogs = () => {
    clearDemoEmailLog();
    refreshData();
  };

  /**
   * Copy Reset Link to Clipboard
   * 
   * Allows tester to copy the password reset URL for manual testing.
   * Shows "Copied!" feedback for 2 seconds.
   * 
   * @param link - The full reset URL with token
   */
  const copyResetLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(link); // Show "Copied!" on this specific button
      setTimeout(() => setCopied(''), 2000); // Clear after 2 seconds
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  /**
   * Open Reset Link for Testing
   * 
   * Extracts the token from URL and navigates to reset password page.
   * Simulates clicking the link in an email.
   * 
   * FLOW:
   * 1. Extract hash portion from URL (contains token)
   * 2. Set it as current page hash
   * 3. Reload page to trigger ResetPasswordForm component
   * 
   * @param link - The full reset URL
   */
  const openResetLink = (link: string) => {
    // URL format: http://localhost/#token=abc123
    // We extract: token=abc123
    const hashPart = link.split('#')[1] || '';
    window.location.hash = hashPart;

    // Reload to render ResetPasswordForm
    window.location.reload();
  };

  React.useEffect(() => {
    refreshData();
    // Auto-refresh every 5 seconds
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Password Recovery Demo Dashboard
            </CardTitle>
            <CardDescription>
              This panel shows simulated email logs and recovery tokens for testing purposes.
              In production, emails would be sent via a real email service.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex gap-4 mb-6">
              <Button onClick={refreshData}>Refresh Data</Button>
              <Button onClick={clearLogs} variant="outline">Clear Logs</Button>
            </div>

            {stats && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Tokens</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.expired}</div>
                  <div className="text-sm text-gray-600">Expired</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.used}</div>
                  <div className="text-sm text-gray-600">Used</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Email Activity</h3>
              {emails.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No emails sent yet. Try the "Forgot Password?" flow to see email logs here.
                  </AlertDescription>
                </Alert>
              ) : (
                [...emails]
                  .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                  .map((email, index) => (
                    <Card key={`${email.to}-${email.sentAt}`} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Mail className="h-4 w-4" />
                              <span className="font-semibold">{email.to}</span>
                              <Badge variant={email.type === 'password-reset' ? 'default' : 'secondary'}>
                                {email.type}
                              </Badge>
                            </div>

                            <div className="text-sm text-gray-600 mb-2">
                              <strong>Subject:</strong> {email.subject}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {new Date(email.sentAt).toLocaleString()}
                            </div>

                            {email.resetLink && (
                              <div className="mt-3 p-3 bg-gray-50 rounded border">
                                <div className="text-sm font-medium mb-2">Reset Link:</div>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-white px-2 py-1 rounded border flex-1 overflow-hidden">
                                    {email.resetLink}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyResetLink(email.resetLink)}
                                    className="flex items-center gap-1"
                                  >
                                    <Copy className="h-3 w-3" />
                                    {copied === email.resetLink ? 'Copied!' : 'Copy'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => openResetLink(email.resetLink)}
                                    className="flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Test
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Testing Instructions:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Go to the login page and click "Forgot your password?"</li>
                <li>2. Enter an email address of an existing user (e.g., sarah.johnson@email.com)</li>
                <li>3. Check this dashboard for the simulated email with reset link</li>
                <li>4. Click "Test" button next to the reset link to test the password reset flow</li>
                <li>5. Complete the password reset and verify you can login with the new password</li>
              </ol>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Available Test Users:</h4>
              <div className="text-sm text-yellow-800 space-y-1">
                <div><strong>Pet Owners:</strong> sarah.johnson@email.com, michael.chen@email.com, emma.rodriguez@email.com (password: password123)</div>
                <div><strong>Veterinarians:</strong> dr.martinez@petcare.com, dr.thompson@petcare.com (password: vetpass123)</div>
                <div><strong>Administrator:</strong> admin@petcare.com (password: adminpass123)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

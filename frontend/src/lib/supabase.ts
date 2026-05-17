/**
 * Supabase Client Configuration
 * 
 * BEGINNER EXPLANATION:
 * Supabase is a backend-as-a-service platform (like Firebase). It provides:
 * - Database (PostgreSQL)
 * - Authentication
 * - Storage
 * - Real-time subscriptions
 * 
 * This file creates a Supabase client that the app uses to communicate with
 * the Supabase backend. However, in this PetCare app, we're using Netlify
 * Functions for the backend instead of Supabase's built-in features.
 * 
 * Current Usage:
 * - Email service simulation (for password reset emails)
 * - Could be expanded to use Supabase Auth or Storage in the future
 * 
 * Environment Variables:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Public anonymous key (safe to expose in frontend)
 * 
 * Note: In Vite, environment variables must start with VITE_ to be accessible.
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
// BEGINNER NOTE: || provides fallback values if environment variables aren't set
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Create and export Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Email Service (Demo Implementation)
 * 
 * BEGINNER EXPLANATION:
 * This is a simulated email service for development/demo purposes.
 * In a real production app, you would integrate with:
 * - Supabase Auth (built-in email)
 * - SendGrid (popular email service)
 * - AWS SES (Amazon's email service)
 * - Mailgun, Postmark, etc.
 * 
 * What This Does:
 * 1. Logs email content to browser console
 * 2. Stores email in localStorage (so you can view it in PasswordRecoveryDemo)
 * 3. Simulates network delay
 * 4. Returns success/failure
 * 
 * Why Simulate?
 * - No need for email API keys during development
 * - Can test password reset flow without actual emails
 * - Faster development cycle
 * 
 * PRODUCTION WARNING:
 * Replace this with real email service before deploying!
 */
export const emailService = {
  async sendPasswordResetEmail(email: string, resetToken: string, resetLink: string): Promise<boolean> {
    try {
      // In a real application, you would integrate with an email service like:
      // - Supabase Auth (recommended)
      // - SendGrid
      // - AWS SES
      // - Nodemailer

      // For demo purposes, we'll log the email content and simulate success
      console.log('📧 Sending password reset email:');
      console.log('To:', email);
      console.log('Reset Link:', resetLink);
      console.log('Reset Token:', resetToken);
      console.log('Email Content:');
      console.log(`
        Subject: Reset Your PetCare Password
        
        Hello,
        
        You requested to reset your password for your PetCare account.
        
        Click the link below to reset your password:
        ${resetLink}
        
        This link will expire in 1 hour for security reasons.
        
        If you did not request this password reset, please ignore this email.
        
        Best regards,
        The PetCare Team
      `);

      // Store the email in localStorage for demo purposes
      const emailLog = JSON.parse(localStorage.getItem('emailLog') || '[]');
      emailLog.push({
        to: email,
        subject: 'Reset Your PetCare Password',
        resetToken,
        resetLink,
        sentAt: new Date().toISOString(),
        type: 'password-reset'
      });
      localStorage.setItem('emailLog', JSON.stringify(emailLog));

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  },

  async sendPasswordChangeConfirmation(email: string): Promise<boolean> {
    try {
      console.log('📧 Sending password change confirmation email to:', email);

      const emailLog = JSON.parse(localStorage.getItem('emailLog') || '[]');
      emailLog.push({
        to: email,
        subject: 'Password Changed Successfully - PetCare',
        sentAt: new Date().toISOString(),
        type: 'password-changed'
      });
      localStorage.setItem('emailLog', JSON.stringify(emailLog));

      return true;
    } catch (error) {
      console.error('Failed to send password change confirmation:', error);
      return false;
    }
  }
};

// Helper function to get demo email logs (for testing purposes)
export const getDemoEmailLog = () => {
  return JSON.parse(localStorage.getItem('emailLog') || '[]');
};

// Helper function to clear demo email logs
export const clearDemoEmailLog = () => {
  localStorage.removeItem('emailLog');
};

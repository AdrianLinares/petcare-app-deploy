/**
 * =============================================================================
 * APP.TSX - THE MAIN APPLICATION COMPONENT
 * =============================================================================
 * 
 * BEGINNER EXPLANATION:
 * This is the heart of our application! Think of it as the conductor of an orchestra.
 * It decides what to show based on whether someone is logged in or not.
 * 
 * What this file does:
 * 1. Manages who is logged in (the currentUser)
 * 2. Shows login forms if no one is logged in
 * 3. Shows the appropriate dashboard if someone IS logged in
 * 4. Handles password recovery
 * 5. Loads demo data for testing
 * 
 * =============================================================================
 */

// ==================== IMPORTS ====================
// "Import" means: bring in code from other files so we can use it here

// React imports - The core framework we're using
import React, { useState, useEffect } from 'react';
import { Agentation } from 'agentation';
// - useState: Creates state variables (data that can change)
// - useEffect: Runs code when component loads or data changes

// UI Component imports - Pre-built components for notifications and tooltips
import { Toaster } from '@/components/ui/sonner';        // Shows toast notifications (popup messages)
import { TooltipProvider } from '@/components/ui/tooltip'; // Provides tooltip functionality

// Authentication components - All the login/password screens
import LoginForm from './components/Auth/LoginForm';                 // The login screen
import ForgotPasswordForm from './components/Auth/ForgotPasswordForm'; // "Forgot password" screen
import ResetPasswordForm from './components/Auth/ResetPasswordForm';   // Reset password screen
import PasswordRecoveryDemo from './components/Auth/PasswordRecoveryDemo'; // Demo for testing

// Dashboard components - What users see after logging in
import PetOwnerDashboard from './components/Dashboard/PetOwnerDashboard';     // Pet owner view
import VeterinarianDashboard from './components/Dashboard/VeterinarianDashboard'; // Vet view
import AdminDashboard from './components/Dashboard/AdminDashboard';           // Admin view

// Type definitions - Tells TypeScript what shape our data should be
import { User, AuthState } from './types';

// Utility imports - Helper functions
import { getResetTokenFromURL } from './utils/passwordRecovery';    // Gets password reset token from URL
import { useTranslation } from 'react-i18next';                         // Internationalization
import { toast } from 'sonner';                                      // Function to show popup messages
import { authAPI, userAPI } from './lib/api';                        // Backend API service
import { initializeTestData } from './utils/testData';               // Demo data for development

// ==================== MAIN APP COMPONENT ====================
/**
 * This is the main component that runs the entire application.
 * Think of it as the "main()" function in other programming languages.
 */
const App = () => {
  const { t } = useTranslation();
  
  // ==================== STATE VARIABLES ====================
  // State is data that can change and will cause the component to re-render
  // Think of it as the app's memory
  
  /**
   * currentUser: Stores information about who is logged in
   * - If null: No one is logged in (show login form)
   * - If User object: Someone is logged in (show their dashboard)
   * 
   * Example: { id: '1', email: 'owner@petcare.com', fullName: 'John Doe', userType: 'pet_owner' }
   */
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  /**
   * loading: Tracks if the app is still loading
   * - true: Show loading spinner
   * - false: Show actual content
   */
  const [loading, setLoading] = useState(true);
  
  /**
   * authState: Tracks which authentication screen to show
   * - 'login': Show login form
   * - 'forgot-password': Show forgot password form
   * - 'reset-password': Show reset password form
   */
  const [authState, setAuthState] = useState<AuthState>({ view: 'login' });

  // ==================== SIDE EFFECTS (useEffect) ====================
  /**
   * useEffect: Runs code after the component renders
   * The empty array [] means: run this code ONCE when the component first loads
   * 
   * Think of this as the "startup" or "initialization" code that runs
   * when the app first opens.
   */
  useEffect(() => {
    // STEP 0: Initialize demo data in localStorage for development/demo
    initializeTestData();

    // STEP 1: Check if user has valid token and restore session
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token is still valid by fetching current user
          const user = await userAPI.getCurrentUser();
          setCurrentUser(user);
        } catch (error) {
          // Token is invalid or expired, clear it
          console.log('Session expired, please login again');
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
        }
      }
    };
    
    checkAuth();
    
    // STEP 3: Check if URL has a password reset token
    // Example URL: http://localhost:5173/#reset-password?token=abc123
    const resetToken = getResetTokenFromURL();
    if (resetToken) {
      // Found a reset token! Show the reset password form
      setAuthState({ view: 'reset-password', resetToken });
    }
    
    // STEP 4: Check if accessing demo dashboard
    // Example URL: http://localhost:5173/#demo
    if (window.location.hash === '#demo') {
      setAuthState({ view: 'demo' } as any);
    }
    
    // STEP 5: Finished loading, show the app!
    setLoading(false);
    
  }, []); // Empty array = run once on component mount

  // ==================== EVENT HANDLER FUNCTIONS ====================
  // These functions respond to user actions (clicking, typing, etc.)
  
  /**
   * handleLoginSuccess: Called after successful login from backend
   * 
   * HOW IT WORKS:
   * 1. Receives user data from backend API
   * 2. Sets current user in state
   * 3. Token is already stored by API service
   * 
   * PARAMETERS:
   * @param user - The authenticated user object from backend
   */
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    // Token is already stored in localStorage by authAPI.login()
  };

  /**
   * handleLogout: Logs the current user out
   * 
   * HOW IT WORKS:
   * 1. Clear the currentUser from state (app forgets who's logged in)
   * 2. Remove JWT token and user data from localStorage
   * 3. Show a success message
   * 4. React will re-render and show the login form again
   */
  const handleLogout = () => {
    authAPI.logout();                          // Clear token and saved data
    setCurrentUser(null);                      // Clear state: no one is logged in
    toast.success(t('toast.loggedOut'));  // Show goodbye message
  };

  /**
   * handleForgotPassword: User clicked "Forgot Password?"
   * 
   * This changes the view to show the forgot password form
   */
  const handleForgotPassword = () => {
    setAuthState({ view: 'forgot-password' }); // Switch to forgot password screen
  };

  /**
   * handleBackToLogin: User wants to go back to login screen
   * 
   * This is called from password reset forms when user clicks "Back to Login"
   */
  const handleBackToLogin = () => {
    setAuthState({ view: 'login' }); // Switch back to login screen
    
    // Clean up the URL (remove any #reset-password or #demo)
    if (window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  /**
   * handlePasswordResetSuccess: Password was successfully reset
   * 
   * After user resets their password, take them back to login
   */
  const handlePasswordResetSuccess = () => {
    setAuthState({ view: 'login' }); // Go to login screen
    
    // Clean up the URL hash
    if (window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // ==================== RENDERING ====================
  /**
   * This is where we decide what to show on the screen
   * React will call this section whenever state changes
   * 
   * There are 3 possible things to show:
   * 1. Loading spinner (while app initializes)
   * 2. Authentication screens (if no one is logged in)
   * 3. Dashboard (if someone is logged in)
   */

  // SCENARIO 1: Still loading? Show a spinner
  if (loading) {
    return (
      // Full-screen centered container
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {/* Spinning loading icon */}
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          {/* Loading text */}
          <p className="text-gray-600">Loading PetCare...</p>
        </div>
      </div>
    );
  }

  // SCENARIO 2: No one logged in? Show authentication forms
  if (!currentUser) {
    return (
      <TooltipProvider>  {/* Wraps app to provide tooltip functionality */}
        <Toaster />      {/* Component that shows toast notifications */}
        
        {/* Show LOGIN FORM if authState.view === 'login' */}
        {authState.view === 'login' && (
          <LoginForm 
            onLoginSuccess={handleLoginSuccess}      // Pass login success handler
            onSwitchToRegister={() => { }}           // Register handled in LoginForm
            onForgotPassword={handleForgotPassword}  // Pass forgot password function
          />
        )}
        
        {/* Show FORGOT PASSWORD FORM if authState.view === 'forgot-password' */}
        {authState.view === 'forgot-password' && (
          <ForgotPasswordForm onBack={handleBackToLogin} />  // Pass back button function
        )}
        
        {/* Show RESET PASSWORD FORM if authState.view === 'reset-password' */}
        {authState.view === 'reset-password' && (
          <ResetPasswordForm 
            resetToken={authState.resetToken}           // Pass the token from URL
            onSuccess={handlePasswordResetSuccess}      // What to do after success
            onBack={handleBackToLogin}                  // Back button
          />
        )}
        
        {/* Show DEMO PAGE if authState.view === 'demo' */}
        {(authState as any).view === 'demo' && (
          <PasswordRecoveryDemo />  // Demo page for testing password recovery
        )}
        {import.meta.env.DEV && <Agentation />}
      </TooltipProvider>
    );
  }

  // SCENARIO 3: Someone IS logged in! Show their dashboard
  /**
   * Different users see different dashboards:
   * - Pet Owner: See their pets, appointments, medical records
   * - Veterinarian: See all appointments, patient records
   * - Administrator: See everything, manage users
   */
  return (
    <TooltipProvider>
      <Toaster />
      
      {/* If user is a PET OWNER, show Pet Owner Dashboard */}
      {currentUser.userType === 'pet_owner' && (
        <PetOwnerDashboard 
          user={currentUser}        // Pass user info to dashboard
          onLogout={handleLogout}   // Pass logout function
        />
      )}
      
      {/* If user is a VETERINARIAN, show Veterinarian Dashboard */}
      {currentUser.userType === 'veterinarian' && (
        <VeterinarianDashboard 
          user={currentUser}
          onLogout={handleLogout}
        />
      )}
      
      {/* If user is an ADMINISTRATOR, show Admin Dashboard */}
      {currentUser.userType === 'administrator' && (
        <AdminDashboard 
          user={currentUser}
          onLogout={handleLogout}
        />
      )}
      {import.meta.env.DEV && <Agentation />}
    </TooltipProvider>
  );
};

export default App;

/**
 * 404 Not Found Page Component
 * 
 * BEGINNER EXPLANATION:
 * This page appears when users try to access a URL that doesn't exist in the app.
 * It's like a friendly error page that helps users get back on track.
 * 
 * When Does This Show?
 * - User types wrong URL (e.g., /random-page)
 * - User clicks broken link
 * - Page was moved or deleted
 * 
 * User-Friendly Features:
 * 1. Clear "404" message (standard HTTP error code for "not found")
 * 2. Explanation of what happened
 * 3. Two options to recover:
 *    - "Return Home" button: Goes to main page
 *    - "Go Back" button: Returns to previous page (like browser back button)
 * 
 * Why Have a 404 Page?
 * - Better user experience than blank page or browser error
 * - Keeps users in the app instead of leaving
 * - Maintains brand consistency even during errors
 * - Helps users navigate back to working pages
 * 
 * Technical Note:
 * This is registered as a catch-all route in the React Router configuration.
 * Any route that doesn't match defined paths will show this component.
 */

import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="space-y-3">
          <h1 className="text-8xl font-bold text-blue-600">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800">Page Not Found</h2>
          <p className="text-muted-foreground">The page you're looking for doesn't exist or may have been moved.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <a href="/">Return Home</a>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Welcome Page Component
 * 
 * BEGINNER EXPLANATION:
 * This is a placeholder landing page. In the current PetCare app, users
 * are redirected to the login page instead of seeing this.
 * 
 * Purpose:
 * - Shows a welcome message
 * - Could be expanded into a marketing landing page
 * - Could show app features, pricing, contact info, etc.
 * 
 * Current State:
 * This is a template page that's not currently used in the app flow.
 * The actual entry point is the login page (App.tsx handles routing).
 * 
 * CSS Classes Explained:
 * - min-h-screen: Minimum height of viewport (full screen height)
 * - flex flex-col: Flexbox layout in column direction
 * - items-center justify-center: Center content horizontally and vertically
 * - bg-gradient-to-br: Background gradient from top-left to bottom-right
 * - animate-in fade-in: Smooth fade-in animation when page loads
 */

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6 text-center">
      <div className="space-y-8 max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Welcome to MGX</h1>

        <p className="text-lg text-muted-foreground animate-in fade-in delay-300 duration-700">Let's build something amazing</p>
      </div>
    </div>
  );
}

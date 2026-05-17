import React from 'react';
import { Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-petcare-navy border-t border-petcare-golden/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2 text-sm text-petcare-beige">
            <span>© {currentYear} PetCare System. All rights reserved.</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-petcare-beige">
            <span>Developed by</span>
            <strong className="text-petcare-golden">Adrian Linares</strong>
            <Mail className="h-3 w-3 text-petcare-golden" />
            <a 
              href="mailto:jlinaresm8@soy.sena.edu.co" 
              className="text-petcare-secondary hover:text-petcare-golden hover:underline transition-colors"
            >
              jlinaresm8@soy.sena.edu.co
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

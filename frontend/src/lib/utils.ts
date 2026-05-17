/**
 * Utility Functions
 * 
 * BEGINNER EXPLANATION:
 * This file contains helper functions used throughout the application.
 * Currently has one main utility: cn() for combining CSS classes.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine and Merge CSS Classes
 * 
 * BEGINNER EXPLANATION:
 * This function intelligently combines multiple CSS class names, handling:
 * - Conditional classes
 * - Arrays of classes
 * - Tailwind CSS conflicts
 * 
 * Why Is This Needed?
 * Tailwind CSS sometimes has conflicting classes (e.g., "p-2" and "p-4" both
 * set padding). Without merging, both would apply, causing issues. This function
 * ensures only the last/most specific class is used.
 * 
 * How It Works:
 * 1. clsx(): Combines classes and handles conditionals
 * 2. twMerge(): Resolves Tailwind conflicts (keeps rightmost class)
 * 
 * Usage Examples:
 * ```typescript
 * // Simple combination
 * cn('text-lg', 'font-bold') // "text-lg font-bold"
 * 
 * // Conditional classes
 * cn('btn', isActive && 'btn-active') // "btn btn-active" or "btn"
 * 
 * // Resolve conflicts
 * cn('p-2 m-2', 'p-4') // "m-2 p-4" (p-2 removed, p-4 wins)
 * 
 * // Real component usage
 * <Button className={cn('btn', variant === 'primary' && 'btn-primary')} />
 * ```
 * 
 * @param {...ClassValue[]} inputs - Any number of class names or conditionals
 * @returns {string} Merged class string with conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

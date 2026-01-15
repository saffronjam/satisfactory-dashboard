import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names using clsx and merges Tailwind CSS classes
 * to handle conflicts properly. This is the standard utility pattern for shadcn/ui.
 *
 * @param inputs - Class values to combine (strings, objects, arrays)
 * @returns Merged class name string with Tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

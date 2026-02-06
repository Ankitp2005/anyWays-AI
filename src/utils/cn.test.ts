import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn utility', () => {
    it('merges class names correctly', () => {
        expect(cn('w-full', 'h-full')).toBe('w-full h-full');
    });

    it('handles conditional classes', () => {
        expect(cn('w-full', false && 'h-full', 'bg-red-500')).toBe('w-full bg-red-500');
    });

    it('merges tailwind conflicts', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('handles undefined/null', () => {
        expect(cn('w-full', undefined, null)).toBe('w-full');
    });
});

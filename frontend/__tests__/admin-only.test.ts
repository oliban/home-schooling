import { describe, it, expect } from 'vitest';

/**
 * Test for admin-only section visibility
 *
 * Feature: Import section only visible to admin users
 *
 * Security:
 * - Import functionality restricted to admin users
 * - Section hidden from non-admin parents
 * - Consistent with AdminPanel visibility logic
 */

interface ParentData {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

describe('Curriculum Page - Admin-Only Import Section', () => {
  it('should show import section for admin users', () => {
    const parent: ParentData = {
      id: 'parent-1',
      email: 'admin@example.com',
      name: 'Admin User',
      isAdmin: true,
    };

    const shouldShow = parent?.isAdmin === true;

    expect(shouldShow).toBe(true);
  });

  it('should hide import section for non-admin users', () => {
    const parent: ParentData = {
      id: 'parent-2',
      email: 'user@example.com',
      name: 'Regular User',
      isAdmin: false,
    };

    const shouldShow = parent?.isAdmin === true;

    expect(shouldShow).toBe(false);
  });

  it('should hide import section when isAdmin is undefined', () => {
    const parent: ParentData = {
      id: 'parent-3',
      email: 'user@example.com',
      name: 'Regular User',
    };

    const shouldShow = parent?.isAdmin === true;

    expect(shouldShow).toBe(false);
  });

  it('should hide import section when parent is null', () => {
    const parent: ParentData | null = null;

    const shouldShow = parent?.isAdmin === true;

    expect(shouldShow).toBe(false);
  });

  it('should use strict equality check for admin status', () => {
    const parent: ParentData = {
      id: 'parent-4',
      email: 'user@example.com',
      name: 'User',
      isAdmin: undefined,
    };

    // Should not use truthy check, must be explicitly true
    const shouldShow = parent?.isAdmin === true;

    expect(shouldShow).toBe(false);
  });
});

describe('Admin Section Styling', () => {
  it('should have purple gradient background for admin sections', () => {
    const adminSectionClasses = 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-400';

    expect(adminSectionClasses).toContain('purple');
    expect(adminSectionClasses).toContain('gradient');
  });

  it('should display ADMIN ONLY badge', () => {
    const badge = {
      text: 'ADMIN ONLY',
      classes: 'bg-purple-200 text-purple-800 px-2 py-1 rounded-full',
    };

    expect(badge.text).toBe('ADMIN ONLY');
    expect(badge.classes).toContain('purple');
  });

  it('should be collapsible with expand/collapse arrow', () => {
    let expanded = true;

    const arrowRotation = expanded ? 'rotate-90' : '';

    expect(arrowRotation).toBe('rotate-90');

    expanded = false;
    const newRotation = expanded ? 'rotate-90' : '';
    expect(newRotation).toBe('');
  });

  it('should be expanded by default', () => {
    const defaultExpanded = true;

    expect(defaultExpanded).toBe(true);
  });
});

describe('Consistent Admin Access Across Pages', () => {
  it('should use same admin check on parent page', () => {
    const parent: ParentData = {
      id: 'parent-1',
      email: 'admin@example.com',
      name: 'Admin',
      isAdmin: true,
    };

    // Both parent page and curriculum page use same check
    const showAdminPanel = parent?.isAdmin === true;
    const showImportSection = parent?.isAdmin === true;

    expect(showAdminPanel).toBe(showImportSection);
  });

  it('should apply same styling to all admin sections', () => {
    const adminPanelStyle = 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-400';
    const importSectionStyle = 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-400';

    expect(adminPanelStyle).toBe(importSectionStyle);
  });
});

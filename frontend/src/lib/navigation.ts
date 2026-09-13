/**
 * Global navigation model. The header, the drawer and the dashboard quick links
 * all render from this single list.
 */

import type { ElementType } from 'react';
import { Cpu, GitBranch, History, LayoutDashboard, Lightbulb } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: ElementType;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    description: 'Live station status, readings and charts',
    icon: LayoutDashboard,
  },
  {
    href: '/how-model-works',
    label: 'How our Model works',
    description: 'The detection pipeline explained step by step',
    icon: Cpu,
  },
  {
    href: '/root-cause',
    label: 'Root-Cause Classification',
    description: 'Why the system believes an anomaly happened',
    icon: GitBranch,
  },
  {
    href: '/explanations',
    label: 'Explanation & Recommendations',
    description: 'Every detected anomaly and how to resolve it',
    icon: Lightbulb,
  },
  {
    href: '/history',
    label: 'Anomaly History',
    description: 'Search and filter every stored reading',
    icon: History,
  },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const APP_VERSION = 'v2.5.0';

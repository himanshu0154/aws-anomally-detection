/**
 * Class-name joiner for the `components/ui` primitives (the `cn` helper that
 * shadcn/ui components import from `@/lib/utils`).
 *
 * Intentionally dependency-free: this project does not use shadcn/ui yet and has
 * neither `clsx` nor `tailwind-merge` installed, and the components under
 * `src/components/ui` pass static class strings that never need conflict
 * resolution. If the project adopts shadcn (see AGENTS.md), replace this body
 * with the standard `twMerge(clsx(inputs))` implementation — the public
 * signature stays the same, so no call site changes.
 */

export type ClassValue = string | number | null | undefined | boolean | ClassValue[];

function collect(value: ClassValue, out: string[]): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const entry of value) collect(entry, out);
    return;
  }
  out.push(String(value));
}

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  for (const input of inputs) collect(input, classes);
  return classes.join(' ');
}

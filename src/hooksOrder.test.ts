import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * React needs a component to call the same hooks in the same order on every render. Calling one
 * after an early `return` breaks that, and the page goes blank. The type checker cannot see it, so
 * this test reads each component and flags a hook call placed after an early return.
 *
 * It relies on the code style used here: a component's own statements are indented by two spaces.
 */

export function findHooksAfterEarlyReturn(source: string): string[] {
  const lines = source.split('\n');
  const found: string[] = [];
  let inComponent = false;
  let earlyReturnAt = -1;

  lines.forEach((line, index) => {
    if (/^(export )?function [A-Za-z]/.test(line)) {
      inComponent = true;
      earlyReturnAt = -1;
      return;
    }
    if (line === '}') {
      inComponent = false;
      return;
    }
    if (!inComponent) return;

    const next = (lines[index + 1] ?? '').trim();
    const isEarlyReturn = /^ {2}if \(.*\) return\b/.test(line) || (/^ {2}if \(.*\) \{$/.test(line) && next.startsWith('return'));
    if (isEarlyReturn && earlyReturnAt < 0) earlyReturnAt = index + 1;

    if (earlyReturnAt > 0 && /^ {2}(const .* = |let .* = )?use[A-Z]\w*\(/.test(line)) {
      found.push(`line ${index + 1}: ${line.trim()} (early return at line ${earlyReturnAt})`);
    }
  });
  return found;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('hook order', () => {
  it('finds a hook that comes after an early return', () => {
    const bad = [
      'export function Sheet({ slot }) {',
      '  const a = useThing();',
      '  if (!slot) {',
      '    return <Nothing />;',
      '  }',
      '  const b = useOther();',
      '  return <Thing />;',
      '}',
    ].join('\n');
    expect(findHooksAfterEarlyReturn(bad)).toHaveLength(1);

    const alsoBad = ['function Panel() {', '  if (!ready) return null;', '  useEffect(() => {}, []);', '  return null;', '}'].join('\n');
    expect(findHooksAfterEarlyReturn(alsoBad)).toHaveLength(1);
  });

  it('accepts hooks that all come before the early return', () => {
    const good = ['export function Sheet({ slot }) {', '  const a = useThing();', '  const b = useOther();', '  if (!slot) {', '    return <Nothing />;', '  }', '  return <Thing />;', '}'].join('\n');
    expect(findHooksAfterEarlyReturn(good)).toEqual([]);
  });

  it('holds for every screen and component in the app', () => {
    const problems = sourceFiles('src').flatMap((file) => findHooksAfterEarlyReturn(readFileSync(file, 'utf8')).map((issue) => `${file}: ${issue}`));
    expect(problems).toEqual([]);
  });
});

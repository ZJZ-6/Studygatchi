import { act, StrictMode, useContext } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeContext, ThemeProvider, themes } from '../src/components/ThemeProvider';

const storageKey = 'studygatchi.theme';
let container: HTMLDivElement;
let root: Root;

function ThemeControls() {
  const context = useContext(ThemeContext)!;
  return <>{Object.entries(themes).map(([name, theme]) => (
    <button key={name} onClick={() => context.setTheme(theme)}>{name}</button>
  ))}</>;
}

function mount() {
  act(() => root.render(
    <StrictMode><ThemeProvider><ThemeControls /></ThemeProvider></StrictMode>,
  ));
}

function expectColors(name: string) {
  const style = document.documentElement.style;
  expect(style.getPropertyValue('--bg-color')).toBe(themes[name].bg);
  expect(style.getPropertyValue('--text-color')).toBe(themes[name].text);
  expect(style.getPropertyValue('--card-bg')).toBe(themes[name].card);
  expect(style.getPropertyValue('--button-bg')).toBe(themes[name].button);
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
});

describe('theme persistence', () => {
  it('uses the default theme when no preference exists', () => {
    mount();
    expectColors('black');
  });

  it.each(Object.keys(themes))('restores saved %s colors on startup', (name) => {
    localStorage.setItem(storageKey, name);
    mount();
    expectColors(name);
    expect(localStorage.getItem(storageKey)).toBe(name);
  });

  it('saves a selection and restores it after remounting', () => {
    mount();
    const button = Array.from(container.querySelectorAll('button'))
      .find((element) => element.textContent === 'green')!;
    act(() => button.click());
    expectColors('green');
    expect(localStorage.getItem(storageKey)).toBe('green');
    act(() => root.unmount());
    root = createRoot(container);
    mount();
    expectColors('green');
  });

  it.each(['unknown', '', 'constructor', '__proto__'])('handles invalid saved name %j', (name) => {
    localStorage.setItem(storageKey, name);
    mount();
    expectColors('black');
  });

  it('uses default colors when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    mount();
    expectColors('black');
  });

  it('still changes colors when saving storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    mount();
    const button = Array.from(container.querySelectorAll('button'))
      .find((element) => element.textContent === 'pink')!;
    act(() => button.click());
    expectColors('pink');
  });
});

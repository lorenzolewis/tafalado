import { describe, expect, it } from 'vitest';
import { isCurrentPage, navigationDirection, seriesOf, viewSwitchDirection } from './nav';

describe('seriesOf', () => {
  it("gives a lesson page's series", () => {
    expect(seriesOf('/grammar/03')).toBe('grammar');
    expect(seriesOf('/supplementary/01')).toBe('supplementary');
    // The static build may serve the .html path.
    expect(seriesOf('/pronunciation/12.html')).toBe('pronunciation');
  });

  it('gives nothing for any other page', () => {
    expect(seriesOf('/')).toBeUndefined();
    expect(seriesOf('/feed.xml')).toBeUndefined();
    expect(seriesOf('/grammar')).toBeUndefined();
    expect(seriesOf('/grammar/3')).toBeUndefined();
  });
});

describe('navigationDirection', () => {
  it('follows history between other pages', () => {
    expect(navigationDirection('/', '/grammar/03', 'forward', true)).toBe('forward');
    expect(navigationDirection('/grammar/03', '/grammar/04', 'forward', true)).toBe('forward');
    expect(navigationDirection('/grammar/04', '/grammar/03', 'back', true)).toBe('back');
    expect(navigationDirection('/grammar/03', '/', 'forward', false)).toBe('forward');
  });

  it('goes back to home on desktop, even from a link', () => {
    expect(navigationDirection('/grammar/03', '/', 'forward', true)).toBe('back');
    expect(navigationDirection('/grammar/03.html', '/index.html', 'forward', true)).toBe('back');
    expect(navigationDirection('/grammar/03', '/', 'back', true)).toBe('back');
  });

  it('leaves home to home alone', () => {
    expect(navigationDirection('/', '/', 'forward', true)).toBe('forward');
  });
});

describe('viewSwitchDirection', () => {
  it('puts the Lessons view underneath every page', () => {
    expect(viewSwitchDirection('lessons')).toBe('back');
    expect(viewSwitchDirection('page')).toBe('forward');
    expect(viewSwitchDirection('home')).toBe('forward');
  });
});

describe('isCurrentPage', () => {
  const at = (href: string) => new URL(href, 'https://tafalado.lorenzo.soy');

  it('is the page shown, as the static build may serve it', () => {
    expect(isCurrentPage(at('/'), at('/'))).toBe(true);
    expect(isCurrentPage(at('/'), at('/index.html'))).toBe(true);
    expect(isCurrentPage(at('/grammar/03'), at('/grammar/03.html'))).toBe(true);
  });

  it('is not another page, another query or another origin', () => {
    expect(isCurrentPage(at('/'), at('/grammar/03'))).toBe(false);
    expect(isCurrentPage(at('/?q=1'), at('/'))).toBe(false);
    expect(isCurrentPage(new URL('https://example.com/'), at('/'))).toBe(false);
  });

  it('leaves fragments to the router: #lessons, or leaving it for the page', () => {
    expect(isCurrentPage(at('/#lessons'), at('/'))).toBe(false);
    expect(isCurrentPage(at('/'), at('/#lessons'))).toBe(false);
  });
});

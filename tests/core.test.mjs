// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePostListing, parseDiscussion } from '../harmony/entry/src/main/ets/core/parser.ts';
import { postsUrl, discussionUrl, normalizeSubreddit, validateAfter } from '../harmony/entry/src/main/ets/core/urls.ts';
import { DemoRepository } from '../harmony/entry/src/main/ets/core/demo.ts';
import { visibleComments } from '../harmony/entry/src/main/ets/core/comments.ts';

function listing(children, after = null) {
  return { kind: 'Listing', data: { children, after } };
}

function post(fields = {}) {
  return { kind: 't3', data: {
    id: 'abc123', name: 't3_abc123', title: 'A sample post', author: 'sample_author',
    subreddit: 'HarmonyOS', score: 42, num_comments: 5, created_utc: 1791110000,
    selftext: 'Markdown **body** & literal &amp;', url: 'https://example.com/old',
    url_overridden_by_dest: 'https://example.com/new', permalink: '/r/HarmonyOS/comments/abc123/sample/',
    thumbnail: 'https://example.com/thumb.png', is_video: true, over_18: true, ...fields
  } };
}

function comment(id, replies = '', fields = {}) {
  return { kind: 't1', data: {
    id, author: 'sample_reader', body: `Comment ${id}`, score: 8, replies, ...fields
  } };
}

function discussion(comments) {
  return JSON.stringify([listing([post()]), listing(comments)]);
}

test('feed URLs stay on OAuth Reddit and select a single normalized community', () => {
  const url = new URL(postsUrl('/r/HarmonyOS', 'hot'));
  assert.equal(url.origin, 'https://oauth.reddit.com');
  assert.equal(url.pathname, '/r/HarmonyOS/hot');
  assert.equal(url.searchParams.get('raw_json'), '1');
  assert.equal(url.searchParams.get('limit'), '25');
  assert.equal(normalizeSubreddit('  r/technology  '), 'technology');
});

test('top uses the day window and pagination preserves validated Reddit fullnames', () => {
  const top = new URL(postsUrl('popular', 'top', 't3_abc123'));
  assert.equal(top.searchParams.get('t'), 'day');
  assert.equal(top.searchParams.get('after'), 't3_abc123');
  assert.equal(new URL(postsUrl('popular', 'new')).searchParams.has('t'), false);
  assert.equal(validateAfter(''), '');
});

test('URL helpers reject path, query, sort, and cursor injection', () => {
  for (const name of ['', 'a', '../all', 'all?limit=1000', 'all/new', 'all+technology', 'a'.repeat(22), 'https://evil.example']) {
    assert.throws(() => postsUrl(name, 'hot'));
  }
  for (const cursor of ['t1_abc', 't3_abc&limit=999', '../abc', 't3_', 't3_abc/def']) {
    assert.throws(() => postsUrl('popular', 'hot', cursor));
  }
  assert.throws(() => postsUrl('popular', 'controversial'));
  assert.throws(() => discussionUrl('../abc'));
  assert.throws(() => discussionUrl('abc?raw_json=0'));
  assert.equal(new URL(discussionUrl('abc123')).pathname, '/comments/abc123');
});

test('post parsing maps upstream fields and preserves raw Markdown text', () => {
  const result = parsePostListing(JSON.stringify(listing([post()], 't3_abc123')));
  assert.equal(result.after, 't3_abc123');
  assert.deepEqual(result.posts[0], {
    id: 'abc123', fullname: 't3_abc123', title: 'A sample post', author: 'sample_author',
    subreddit: 'HarmonyOS', score: 42, commentCount: 5, createdUtc: 1791110000,
    selfText: 'Markdown **body** & literal &amp;', url: 'https://example.com/new',
    permalink: '/r/HarmonyOS/comments/abc123/sample/', thumbnail: 'https://example.com/thumb.png',
    isVideo: true, over18: true
  });
});

test('post parsing tolerates deleted fields and suppresses sentinel or unsafe media URLs', () => {
  const parsed = parsePostListing(JSON.stringify(listing([post({
    author: null, score: 'forty', num_comments: -5, created_utc: -4, selftext: null,
    thumbnail: 'nsfw', permalink: '//evil.example', url_overridden_by_dest: 'javascript:alert(1)',
    is_video: 'true', over_18: 1
  })]))).posts[0];
  assert.equal(parsed.author, '[deleted]');
  assert.equal(parsed.score, 0);
  assert.equal(parsed.commentCount, 0);
  assert.equal(parsed.createdUtc, 0);
  assert.equal(parsed.selfText, '');
  assert.equal(parsed.thumbnail, '');
  assert.equal(parsed.url, '');
  assert.equal(parsed.permalink, '/comments/abc123/');
  assert.equal(parsed.isVideo, false);
  assert.equal(parsed.over18, false);
});

test('malformed individual entries do not hide valid posts', () => {
  const result = parsePostListing(JSON.stringify(listing([
    null, 5, {}, { kind: 't3', data: [] }, post({ id: '../bad' }),
    post({ title: null }), { kind: 't1', data: post().data }, post()
  ])));
  assert.equal(result.posts.length, 1);
  assert.equal(result.after, '');
});

test('invalid listing envelopes, invalid JSON, and malformed cursors fail clearly', () => {
  for (const value of [null, [], 5, {}, { kind: 'Listing', data: null }, { kind: 'Listing', data: { children: 'bad' } }, { kind: 't3', data: { children: [] } }]) {
    assert.throws(() => parsePostListing(JSON.stringify(value)), /invalid listing/);
  }
  assert.throws(() => parsePostListing('{broken'));
  assert.throws(() => parsePostListing(JSON.stringify(listing([post()], 't3_bad&admin=1'))), /cursor/);
  assert.throws(() => parsePostListing(JSON.stringify(listing([post()], 123))), /cursor/);
});

test('nested comments flatten in depth-first order and preserve more placeholders', () => {
  const parsed = parseDiscussion(discussion([
    comment('c1', listing([
      comment('c2', listing([comment('c3')])),
      { kind: 'more', data: { id: '_', count: 4, parent_id: 't1_c1', children: ['c4'] } }
    ])),
    comment('c5')
  ]));
  assert.deepEqual(parsed.comments.map(item => item.depth), [0, 1, 2, 1, 0]);
  assert.deepEqual(parsed.comments.map(item => item.kind), ['comment', 'comment', 'comment', 'more', 'comment']);
  assert.equal(parsed.comments[0].parentId, 't3_abc123');
  assert.equal(parsed.comments[1].parentId, 't1_c1');
  assert.equal(parsed.comments[2].parentId, 't1_c2');
  assert.equal(parsed.comments[0].childCount, 6);
  assert.equal(parsed.comments[1].childCount, 1);
  assert.equal(parsed.comments[3].childCount, 4);
});

test('deleted comments, score fallback, empty replies, and corrupt siblings are handled', () => {
  const parsed = parseDiscussion(discussion([
    null, { kind: 't1', data: null }, comment('bad/id'),
    comment('c1', null, { author: null, body: null, score: undefined, ups: 11 }),
    comment('c2', ''), comment('c3', { kind: 'Listing', data: { children: 'bad' } })
  ]));
  assert.equal(parsed.comments.length, 3);
  assert.equal(parsed.comments[0].author, '[deleted]');
  assert.equal(parsed.comments[0].body, '[removed]');
  assert.equal(parsed.comments[0].score, 11);
});

test('more rows remain unique even when Reddit uses repeated sentinel IDs', () => {
  const parsed = parseDiscussion(discussion([
    { kind: 'more', data: { id: '_', count: 0 } },
    { kind: 'more', data: { id: '_', count: 5 } }
  ]));
  assert.notEqual(parsed.comments[0].id, parsed.comments[1].id);
  assert.equal(parsed.comments[0].body, 'Continue this thread');
  assert.equal(parsed.comments[1].childCount, 5);
});

test('discussion parser rejects missing post or comment listings', () => {
  for (const value of [null, {}, [], [listing([post()])], [listing([]), listing([])], [listing([post()]), {}]]) {
    assert.throws(() => parseDiscussion(JSON.stringify(value)));
  }
});

test('parser bounds excessively large or deeply nested responses', () => {
  assert.throws(() => parsePostListing(' '.repeat(8 * 1024 * 1024 + 1)), /too large/);
  let nested = comment('leaf');
  for (let index = 0; index < 70; index++) {
    nested = comment('c' + index.toString(36), listing([nested]));
  }
  assert.throws(() => parseDiscussion(discussion([nested])), /nesting depth/);
});

test('collapsing a comment hides descendants and keeps the next top-level sibling', () => {
  const rows = parseDiscussion(discussion([
    comment('c1', listing([comment('c2', listing([comment('c3')])), comment('c4')])),
    comment('c5')
  ])).comments;
  assert.deepEqual(visibleComments(rows, ['c1']).map(item => item.id), ['c1', 'c5']);
  assert.deepEqual(visibleComments(rows, ['c2']).map(item => item.id), ['c1', 'c2', 'c4', 'c5']);
  assert.deepEqual(visibleComments(rows, ['c1', 'c2']).map(item => item.id), ['c1', 'c5']);
  assert.equal(visibleComments(rows, []).length, 5);
});

test('demo feed pages through all invented posts without duplicates', async () => {
  const repository = new DemoRepository();
  const ids = [];
  let after = '';
  let pageCount = 0;
  do {
    const page = await repository.getPosts('popular', 'hot', after);
    ids.push(...page.posts.map(item => item.id));
    assert.ok(page.posts.every(item => item.author.startsWith('demo_')));
    assert.ok(page.posts.every(item => item.selfText.includes('Synthetic demo')));
    assert.ok(page.posts.every(item => item.url === '' && item.thumbnail === ''));
    after = page.after;
    pageCount++;
    assert.ok(pageCount <= 3);
  } while (after);
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids).size, 12);
  assert.equal(pageCount, 3);
});

test('demo sorting is deterministic and new/top have distinct ordering', async () => {
  const repository = new DemoRepository();
  const hot = await repository.getPosts('popular', 'hot');
  const newest = await repository.getPosts('popular', 'new');
  const top = await repository.getPosts('popular', 'top');
  assert.equal(hot.posts[0].id, 'd001');
  assert.equal(newest.posts[0].id, 'd007');
  assert.equal(top.posts[0].id, 'd00c');
  assert.deepEqual(await repository.getPosts('popular', 'top'), top);
  assert.ok(top.posts.every((item, index, items) => index === 0 || items[index - 1].score >= item.score));
});

test('demo community filters, unknown communities, and invalid cursors behave predictably', async () => {
  const repository = new DemoRepository();
  for (const community of ['HarmonyOS', 'technology', 'opensource']) {
    const page = await repository.getPosts(community.toUpperCase(), 'hot');
    assert.equal(page.posts.length, 4);
    assert.equal(page.after, '');
    assert.ok(page.posts.every(item => item.subreddit === community));
  }
  assert.deepEqual(await repository.getPosts('unlistedcommunity', 'hot'), { posts: [], after: '' });
  await assert.rejects(repository.getPosts('popular', 'hot', 't3_unknown'), /does not belong/);
  await assert.rejects(repository.getPosts('HarmonyOS', 'hot', 't3_d002'), /does not belong/);
});

test('demo objects are isolated and discussions contain nested synthetic comments', async () => {
  const repository = new DemoRepository();
  const first = await repository.getPosts('popular', 'hot');
  const original = first.posts[0].title;
  first.posts[0].title = 'mutated';
  assert.equal((await repository.getPosts('popular', 'hot')).posts[0].title, original);
  const detail = await repository.getDiscussion(first.posts[0]);
  assert.equal(detail.post.title, original);
  assert.equal(detail.comments[0].parentId, detail.post.fullname);
  assert.deepEqual(detail.comments.map(item => item.depth), [0, 1, 2, 1, 0, 1, 0]);
  assert.equal(detail.comments.at(-1).kind, 'more');
  assert.equal(visibleComments(detail.comments, [detail.comments[0].id]).length, 4);
  await assert.rejects(repository.getDiscussion({ ...first.posts[0], id: 'missing' }), /not included/);
});

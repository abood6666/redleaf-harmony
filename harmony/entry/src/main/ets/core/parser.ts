// SPDX-License-Identifier: GPL-3.0-or-later
// Field mapping follows upstream RedReader's RedditPost, RedditComment,
// RedditListing, RedditMore, and RedditFieldReplies models. raw_json=1 preserves
// original Markdown text, so HTML entities are not decoded a second time here.
import { Comment, Discussion, Listing, Post } from './models';
import { validateAfter } from './urls';

// Explicit wire interfaces keep the untrusted JSON boundary isolated without
// dynamic properties. Every consumed field is checked before entering the UI model.
interface WireThing {
  kind?: string;
  data?: WireData | null;
}

interface WireData {
  children?: WireThing[];
  after?: string | null;
  id?: string;
  name?: string;
  title?: string;
  author?: string | null;
  subreddit?: string;
  score?: number;
  ups?: number;
  num_comments?: number;
  created_utc?: number;
  selftext?: string | null;
  url?: string;
  url_overridden_by_dest?: string;
  permalink?: string;
  thumbnail?: string;
  is_video?: boolean;
  over_18?: boolean;
  body?: string | null;
  parent_id?: string;
  count?: number;
  replies?: WireThing | string | null;
}

const MAX_JSON_LENGTH: number = 8 * 1024 * 1024;
const MAX_COMMENT_DEPTH: number = 64;
const MAX_COMMENT_ROWS: number = 10000;

function stringValue(value: string | null | undefined, fallback: string = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: number | undefined, fallback: number = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getData(thing: WireThing): WireData | null {
  if (thing === null || typeof thing !== 'object' || Array.isArray(thing)) {
    return null;
  }
  const data: WireData | null | undefined = thing.data;
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  return data;
}

function listingData(thing: WireThing): WireData {
  const data: WireData | null = getData(thing);
  if (data === null || thing.kind !== 'Listing' || !Array.isArray(data.children)) {
    throw new Error('Reddit returned an invalid listing.');
  }
  return data;
}

function parsePost(thing: WireThing): Post | null {
  const data: WireData | null = getData(thing);
  if (data === null || thing.kind !== 't3') {
    return null;
  }
  const id: string = stringValue(data.id);
  const title: string = stringValue(data.title);
  const subreddit: string = stringValue(data.subreddit);
  if (!/^[a-z0-9]{1,16}$/.test(id) || title.length === 0 || subreddit.length === 0) {
    return null;
  }
  const thumbnail: string = stringValue(data.thumbnail);
  const permalink: string = stringValue(data.permalink);
  const destination: string = stringValue(data.url_overridden_by_dest, stringValue(data.url));
  const post: Post = {
    id: id,
    fullname: 't3_' + id,
    title: title,
    author: stringValue(data.author, '[deleted]'),
    subreddit: subreddit,
    score: numberValue(data.score),
    commentCount: Math.max(0, numberValue(data.num_comments)),
    createdUtc: Math.max(0, numberValue(data.created_utc)),
    selfText: stringValue(data.selftext),
    url: /^https?:\/\//i.test(destination) ? destination : '',
    permalink: /^\/(?!\/)/.test(permalink) ? permalink : '/comments/' + id + '/',
    thumbnail: /^https:\/\//i.test(thumbnail) ? thumbnail : '',
    isVideo: data.is_video === true,
    over18: data.over_18 === true
  };
  return post;
}

function parseListing(thing: WireThing): Listing {
  const data: WireData = listingData(thing);
  const children: WireThing[] = data.children as WireThing[];
  const posts: Post[] = [];
  for (const child of children) {
    const post: Post | null = parsePost(child);
    // As in upstream's MaybeParseError, one malformed item must not hide the feed.
    if (post !== null) {
      posts.push(post);
    }
  }
  if (data.after !== undefined && data.after !== null && typeof data.after !== 'string') {
    throw new Error('Reddit returned an invalid pagination cursor.');
  }
  const result: Listing = { posts: posts, after: validateAfter(stringValue(data.after)) };
  return result;
}

function appendComments(thing: WireThing, depth: number, parentId: string, rows: Comment[]): void {
  if (depth > MAX_COMMENT_DEPTH) {
    throw new Error('This discussion exceeds the supported nesting depth.');
  }
  const data: WireData = listingData(thing);
  const children: WireThing[] = data.children as WireThing[];
  for (const child of children) {
    if (rows.length >= MAX_COMMENT_ROWS) {
      throw new Error('This discussion exceeds the supported comment count.');
    }
    const value: WireData | null = getData(child);
    if (value === null) {
      continue;
    }
    const id: string = stringValue(value.id);
    if (child.kind === 'more') {
      const count: number = Math.max(0, Math.floor(numberValue(value.count)));
      const more: Comment = {
        id: 'more_' + parentId + '_' + rows.length.toString(),
        author: '',
        body: count > 0 ? count.toString() + ' more replies' : 'Continue this thread',
        score: 0,
        depth: depth,
        parentId: stringValue(value.parent_id, parentId),
        kind: 'more',
        childCount: count
      };
      rows.push(more);
      continue;
    }
    if (child.kind !== 't1' || !/^[a-z0-9]{1,16}$/.test(id)) {
      continue;
    }
    const comment: Comment = {
      id: id,
      author: stringValue(value.author, '[deleted]'),
      body: stringValue(value.body, '[removed]'),
      score: numberValue(value.score, numberValue(value.ups)),
      depth: depth,
      parentId: stringValue(value.parent_id, parentId),
      kind: 'comment',
      childCount: 0
    };
    rows.push(comment);
    const start: number = rows.length;
    const replies: WireThing | string | null | undefined = value.replies;
    if (replies !== null && replies !== undefined && typeof replies === 'object' && !Array.isArray(replies)) {
      const repliesData: WireData | null = getData(replies);
      if (repliesData !== null && replies.kind === 'Listing' && Array.isArray(repliesData.children)) {
        appendComments(replies, depth + 1, 't1_' + id, rows);
      }
    }
    for (let index: number = start; index < rows.length; index++) {
      comment.childCount += rows[index].kind === 'more' ? rows[index].childCount : 1;
    }
  }
}

function checkJsonSize(json: string): void {
  if (json.length > MAX_JSON_LENGTH) {
    throw new Error('Reddit returned a response that is too large.');
  }
}

export function parsePostListing(json: string): Listing {
  checkJsonSize(json);
  const parsed: WireThing = JSON.parse(json) as WireThing;
  return parseListing(parsed);
}

export function parseDiscussion(json: string): Discussion {
  checkJsonSize(json);
  const parsed: WireThing[] = JSON.parse(json) as WireThing[];
  if (!Array.isArray(parsed) || parsed.length < 2) {
    throw new Error('Reddit returned an invalid discussion.');
  }
  const listing: Listing = parseListing(parsed[0]);
  if (listing.posts.length === 0) {
    throw new Error('This post is unavailable.');
  }
  const comments: Comment[] = [];
  appendComments(parsed[1], 0, listing.posts[0].fullname, comments);
  const discussion: Discussion = { post: listing.posts[0], comments: comments };
  return discussion;
}

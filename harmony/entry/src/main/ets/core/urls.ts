// SPDX-License-Identifier: GPL-3.0-or-later
import { SortOrder } from './models';

const API_ORIGIN: string = 'https://oauth.reddit.com';

export function normalizeSubreddit(subreddit: string): string {
  const normalized: string = subreddit.trim().replace(/^\/?r\//i, '');
  if (!/^[a-zA-Z0-9_]{2,21}$/.test(normalized)) {
    throw new Error('Enter a community name using 2–21 letters, numbers, or underscores.');
  }
  return normalized;
}

export function validatePostId(postId: string): string {
  if (!/^[a-z0-9]{1,16}$/.test(postId)) {
    throw new Error('Invalid Reddit post ID.');
  }
  return postId;
}

export function validateAfter(after: string): string {
  if (after !== '' && !/^t3_[a-z0-9]{1,16}$/.test(after)) {
    throw new Error('Invalid Reddit pagination cursor.');
  }
  return after;
}

export function validateSort(sort: SortOrder): SortOrder {
  if (sort !== 'hot' && sort !== 'new' && sort !== 'top') {
    throw new Error('Unsupported post sort order.');
  }
  return sort;
}

export function postsUrl(subreddit: string, sort: SortOrder, after: string = ''): string {
  const community: string = normalizeSubreddit(subreddit);
  validateSort(sort);
  validateAfter(after);
  let url: string = API_ORIGIN + '/r/' + community + '/' + sort + '?limit=25&raw_json=1';
  if (sort === 'top') {
    url += '&t=day';
  }
  if (after.length > 0) {
    url += '&after=' + after;
  }
  return url;
}

export function discussionUrl(postId: string): string {
  return API_ORIGIN + '/comments/' + validatePostId(postId) + '?limit=100&sort=best&raw_json=1';
}

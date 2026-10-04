// SPDX-License-Identifier: GPL-3.0-or-later

export type SortOrder = 'hot' | 'new' | 'top';

export interface Post {
  id: string;
  fullname: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  commentCount: number;
  createdUtc: number;
  selfText: string;
  url: string;
  permalink: string;
  thumbnail: string;
  isVideo: boolean;
  over18: boolean;
}

// Comments are ordered depth-first; parentId is a Reddit fullname (t1_ or t3_).
export interface Comment {
  id: string;
  author: string;
  body: string;
  score: number;
  depth: number;
  parentId: string;
  kind: 'comment' | 'more';
  childCount: number;
}

export interface Listing {
  posts: Post[];
  after: string;
}

export interface Discussion {
  post: Post;
  comments: Comment[];
}

export interface RedditRepository {
  getPosts(subreddit: string, sort: SortOrder, after?: string): Promise<Listing>;
  getDiscussion(post: Post): Promise<Discussion>;
}

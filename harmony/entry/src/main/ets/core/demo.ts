// SPDX-License-Identifier: GPL-3.0-or-later
// All posts, handles, scores, and discussions in this file are invented demo data.
// This repository never sends a network request.
import { Comment, Discussion, Listing, Post, RedditRepository, SortOrder } from './models';
import { normalizeSubreddit, validateAfter, validateSort } from './urls';

const PAGE_SIZE: number = 4;
const FIXTURE_TIME: number = Date.UTC(2026, 9, 4, 12, 0, 0) / 1000;

function fixturePost(id: string, title: string, subreddit: string, score: number,
  hoursAgo: number, body: string): Post {
  const post: Post = {
    id: id,
    fullname: 't3_' + id,
    title: title,
    author: 'demo_' + subreddit.toLowerCase(),
    subreddit: subreddit,
    score: score,
    commentCount: 9,
    createdUtc: FIXTURE_TIME - hoursAgo * 3600,
    selfText: 'Synthetic demo discussion — not a live Reddit post.\n\n' + body,
    url: '',
    permalink: '',
    thumbnail: '',
    isVideo: false,
    over18: false
  };
  return post;
}

function fixturePosts(): Post[] {
  const posts: Post[] = [
    fixturePost('d001', 'A quieter way to read your communities', 'HarmonyOS', 248, 2,
      'Imagine a native reader that opens directly to your feed, keeps text comfortable, and lets you follow a conversation without distractions. What would you put in the first version?'),
    fixturePost('d002', 'Weekend project: a tiny, repairable desk computer', 'technology', 531, 5,
      'An imaginary weekend build using modular parts and a simple enclosure. The aim is to make upgrades approachable and keep the device useful for years.'),
    fixturePost('d003', 'What makes a first contribution feel welcoming?', 'opensource', 184, 1,
      'This sample discussion explores small issues, readable setup instructions, and thoughtful code reviews. Share an example of documentation you would want on day one.'),
    fixturePost('d004', 'Building a reading experience with ArkUI', 'HarmonyOS', 312, 7,
      'A fictional development journal about readable text, clear touch targets, and preserving your place in a conversation. This prototype uses native ArkUI components.'),
    fixturePost('d005', 'The best feature might be a longer battery life', 'technology', 426, 3,
      'An invented conversation about devices that last through a day. Which everyday improvements matter more to you than another headline specification?'),
    fixturePost('d006', 'A small checklist for a readable project README', 'opensource', 267, 9,
      'Start with what the project does, add one working example, explain how to run it, and show where to find help. What would you add to this fictional checklist?'),
    fixturePost('d007', 'How should a reader remember your place?', 'HarmonyOS', 91, 0.5,
      'A sample product question: should reopening a discussion return to the last comment, or start at the top? We are exploring simple options that respect your reading habits.'),
    fixturePost('d008', 'Small tools that make everyday work easier', 'technology', 153, 12,
      'This invented thread collects ideas for focused tools: a timer with one button, a local notes app, or a reader that stays out of the way.'),
    fixturePost('d009', 'Maintainers: which documentation gets used most?', 'opensource', 389, 4,
      'A fictional community survey about install guides, troubleshooting pages, examples, and migration notes. The sample comments are also invented.'),
    fixturePost('d00a', 'Trying a calmer comment layout on a small screen', 'HarmonyOS', 205, 6,
      'Nested replies can become narrow quickly. This sample asks how indentation, collapse controls, and comfortable spacing can make a long discussion easier to follow.'),
    fixturePost('d00b', 'A reading list for a less distracting weekend', 'technology', 74, 8,
      'A synthetic thread about choosing a few thoughtful articles and taking time to read them. No external articles or links are included in the demo.'),
    fixturePost('d00c', 'Celebrating the unglamorous work of maintenance', 'opensource', 617, 10,
      'Updating examples, reproducing bugs, and simplifying build steps all help a project survive. This invented discussion is a place to think about that work.')
  ];
  return posts;
}

function commentRow(id: string, body: string, score: number, depth: number,
  parentId: string, childCount: number): Comment {
  const comment: Comment = {
    id: id,
    author: 'demo_reader_' + id.slice(-1),
    body: body,
    score: score,
    depth: depth,
    parentId: parentId,
    kind: 'comment',
    childCount: childCount
  };
  return comment;
}

function fixtureComments(post: Post): Comment[] {
  let first: string = 'A clear README and one small, reproducible example would be a great starting point.';
  let reply: string = 'Agreed. A first contribution should not depend on knowing the whole project.';
  if (post.subreddit === 'HarmonyOS') {
    first = 'Comfortable text and remembering my place would be my first priorities for a native reader.';
    reply = 'I would also like to collapse a conversation and keep reading the next top-level reply.';
  } else if (post.subreddit === 'technology') {
    first = 'I like tools that are easy to understand, repair, and keep using for a long time.';
    reply = 'Simple defaults make a surprising difference in everyday use.';
  }
  const prefix: string = post.id;
  const comments: Comment[] = [
    commentRow(prefix + 'a', first + ' (Invented demo comment.)', 42, 0, post.fullname, 3),
    commentRow(prefix + 'b', reply, 18, 1, 't1_' + prefix + 'a', 1),
    commentRow(prefix + 'c', 'This nested reply helps demonstrate thread indentation and collapsing.', 7, 2,
      't1_' + prefix + 'b', 0),
    commentRow(prefix + 'd', 'A small, reliable first version sounds useful. We can add more after trying it.', 11, 1,
      't1_' + prefix + 'a', 0),
    commentRow(prefix + 'e', 'Thanks for making the sample easy to explore. All names and votes here are fictional.', 26, 0,
      post.fullname, 1),
    commentRow(prefix + 'f', 'Try changing the feed sort or opening another community to see the other demo posts.', 5, 1,
      't1_' + prefix + 'e', 0)
  ];
  const more: Comment = {
    id: 'more_' + prefix,
    author: '',
    body: '3 more replies · not included in this demo',
    score: 0,
    depth: 0,
    parentId: post.fullname,
    kind: 'more',
    childCount: 3
  };
  comments.push(more);
  return comments;
}

export class DemoRepository implements RedditRepository {
  async getPosts(subreddit: string, sort: SortOrder, after: string = ''): Promise<Listing> {
    const community: string = normalizeSubreddit(subreddit).toLowerCase();
    validateSort(sort);
    validateAfter(after);
    let posts: Post[] = fixturePosts();
    if (community !== 'popular' && community !== 'all') {
      posts = posts.filter((post: Post): boolean => post.subreddit.toLowerCase() === community);
    }
    if (sort === 'new') {
      posts.sort((left: Post, right: Post): number => right.createdUtc - left.createdUtc);
    } else if (sort === 'top') {
      posts.sort((left: Post, right: Post): number => right.score - left.score);
    }
    let start: number = 0;
    if (after.length > 0) {
      const previous: number = posts.findIndex((post: Post): boolean => post.fullname === after);
      if (previous < 0) {
        throw new Error('The demo pagination cursor does not belong to this feed.');
      }
      start = previous + 1;
    }
    const page: Post[] = posts.slice(start, start + PAGE_SIZE);
    const cursor: string = start + PAGE_SIZE < posts.length && page.length > 0 ? page[page.length - 1].fullname : '';
    const listing: Listing = { posts: page, after: cursor };
    return listing;
  }

  async getDiscussion(post: Post): Promise<Discussion> {
    const match: Post | undefined = fixturePosts().find((candidate: Post): boolean => candidate.id === post.id);
    if (match === undefined) {
      throw new Error('This post is not included in the demo.');
    }
    const discussion: Discussion = { post: match, comments: fixtureComments(match) };
    return discussion;
  }
}

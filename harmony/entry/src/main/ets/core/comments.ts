// SPDX-License-Identifier: GPL-3.0-or-later
import { Comment } from './models';

// Keep the collapsed row itself visible, hiding descendants until its next sibling.
// Retaining IDs for hidden descendants preserves their state when an ancestor reopens.
export function visibleComments(comments: Comment[], collapsedIds: string[]): Comment[] {
  const visible: Comment[] = [];
  let hiddenBelow: number = -1;
  for (const comment of comments) {
    if (hiddenBelow >= 0 && comment.depth > hiddenBelow) {
      continue;
    }
    hiddenBelow = -1;
    visible.push(comment);
    if (comment.kind === 'comment' && collapsedIds.indexOf(comment.id) >= 0) {
      hiddenBelow = comment.depth;
    }
  }
  return visible;
}

// SPDX-License-Identifier: GPL-3.0-or-later
import { common } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { Post, Comment, SortOrder, RedditRepository } from '../core/models';
import { DemoRepository } from '../core/demo';
import { visibleComments } from '../core/comments';

@Entry
@Component
struct Index {
  @State private screen: string = 'feed';
  @State private subreddit: string = 'popular';
  @State private sort: SortOrder = 'hot';
  @State private posts: Post[] = [];
  @State private after: string = '';
  @State private selected: Post | undefined = undefined;
  @State private comments: Comment[] = [];
  @State private collapsed: string[] = [];
  @State private busy: boolean = false;
  @State private error: string = '';
  @State private dark: boolean = false;
  @State private largeText: boolean = false;
  @State private preferenceError: string = '';
  private repository: RedditRepository = new DemoRepository();
  private settings: preferences.Preferences | undefined = undefined;
  private requestGeneration: number = 0;

  aboutToAppear(): void {
    this.loadSettings();
    this.loadFeed(false);
  }

  onBackPress(): boolean {
    if (this.screen !== 'feed') {
      this.goBack();
      return true;
    }
    return false;
  }

  private goBack(): void {
    this.requestGeneration++;
    this.screen = 'feed';
    this.busy = false;
    this.error = '';
  }

  private pageBackground(): string { return this.dark ? '#141416' : '#FAF8F5'; }
  private surface(): string { return this.dark ? '#222225' : '#FFFFFF'; }
  private ink(): string { return this.dark ? '#F4F1ED' : '#242326'; }
  private muted(): string { return this.dark ? '#B7B4B0' : '#68635F'; }
  private accent(): string { return this.dark ? '#FFABA9' : '#AF252D'; }
  private textSize(): number { return this.largeText ? 21 : 17; }

  private async loadSettings(): Promise<void> {
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      this.settings = await preferences.getPreferences(context, { name: 'reader_preferences' });
      this.dark = await this.settings.get('dark', false) as boolean;
      this.largeText = await this.settings.get('largeText', false) as boolean;
    } catch {
      this.preferenceError = 'Preferences are available for this session only.';
    }
  }

  private async saveSettings(): Promise<void> {
    if (!this.settings) { return; }
    try {
      await this.settings.put('dark', this.dark);
      await this.settings.put('largeText', this.largeText);
      await this.settings.flush();
      this.preferenceError = '';
    } catch {
      this.preferenceError = 'Could not save preferences. Your changes apply to this session.';
    }
  }

  private async loadFeed(append: boolean): Promise<void> {
    const generation = ++this.requestGeneration;
    this.busy = true;
    this.error = '';
    try {
      const listing = await this.repository.getPosts(this.subreddit, this.sort, append ? this.after : '');
      if (generation !== this.requestGeneration) { return; }
      this.posts = append ? this.posts.concat(listing.posts) : listing.posts;
      this.after = listing.after;
    } catch {
      if (generation === this.requestGeneration) { this.error = 'Unable to load posts. Please try again.'; }
    } finally {
      if (generation === this.requestGeneration) { this.busy = false; }
    }
  }

  private async openPost(post: Post): Promise<void> {
    const generation = ++this.requestGeneration;
    this.selected = post;
    this.comments = [];
    this.collapsed = [];
    this.screen = 'discussion';
    this.busy = true;
    this.error = '';
    try {
      const discussion = await this.repository.getDiscussion(post);
      if (generation !== this.requestGeneration) { return; }
      this.selected = discussion.post;
      this.comments = discussion.comments;
    } catch {
      if (generation === this.requestGeneration) { this.error = 'Unable to load comments. Please try again.'; }
    } finally {
      if (generation === this.requestGeneration) { this.busy = false; }
    }
  }

  private toggleComment(id: string): void {
    if (this.collapsed.includes(id)) {
      this.collapsed = this.collapsed.filter((value: string) => value !== id);
    } else {
      this.collapsed = this.collapsed.concat([id]);
    }
  }

  private changeCommunity(value: string): void {
    this.subreddit = value;
    this.posts = [];
    this.after = '';
    this.loadFeed(false);
  }

  @Builder
  private header() {
    Row({ space: 12 }) {
      if (this.screen !== 'feed') {
        Button('Back').fontSize(14).fontColor('#FFFFFF').backgroundColor('#9C1F27')
          .constraintSize({ minHeight: 48 }).onClick(() => this.goBack())
      }
      Column({ space: 3 }) {
        Text(this.screen === 'settings' ? 'Reader settings' : 'RedLeaf')
          .fontSize(25).fontWeight(FontWeight.Bold).fontColor('#FFFFFF')
        Text('HARMONY EDITION').fontSize(10).letterSpacing(2).fontColor('#FFE1DE')
      }.alignItems(HorizontalAlign.Start).layoutWeight(1)
      if (this.screen === 'feed') {
        Button('Settings').fontSize(14).fontColor('#FFFFFF').backgroundColor('#9C1F27')
          .constraintSize({ minHeight: 48 }).onClick(() => { this.screen = 'settings'; })
      }
    }.width('100%').padding({ left: 20, right: 20, top: 18, bottom: 18 }).backgroundColor('#BA252C')
  }

  @Builder
  private demoNotice() {
    Row({ space: 10 }) {
      Text('DEMO').fontSize(10).fontWeight(FontWeight.Bold).fontColor(this.accent())
        .padding({ left: 8, right: 8, top: 5, bottom: 5 })
        .border({ width: 1, color: this.accent(), radius: 5 })
      Text('Sample conversations · no Reddit connection')
        .fontSize(12).fontColor(this.muted()).layoutWeight(1)
    }.padding({ left: 20, right: 20, top: 12, bottom: 12 }).width('100%')
  }

  @Builder
  private communityPicker() {
    Scroll() {
      Row({ space: 8 }) {
        ForEach(['popular', 'HarmonyOS', 'technology', 'opensource'], (name: string) => {
          Button(name === 'popular' ? 'Popular' : 'r/' + name)
            .fontSize(14).fontWeight(this.subreddit === name ? FontWeight.Bold : FontWeight.Normal)
            .fontColor(this.subreddit === name ? '#FFFFFF' : this.ink())
            .backgroundColor(this.subreddit === name ? '#BA252C' : this.surface())
            .constraintSize({ minHeight: 48 }).onClick(() => this.changeCommunity(name))
            .accessibilityText((name === 'popular' ? 'Popular' : name) + (this.subreddit === name ? ', selected' : ''))
        }, (name: string) => name)
      }.padding({ left: 20, right: 20 })
    }.scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).height(60).width('100%')
  }

  @Builder
  private feedControls() {
    Row({ space: 8 }) {
      ForEach(['hot', 'new', 'top'], (value: string) => {
        Button(value === 'top' ? 'Top today' : (value === 'hot' ? 'Hot' : 'New'))
          .fontSize(14).fontColor(this.sort === value ? this.accent() : this.muted())
          .fontWeight(this.sort === value ? FontWeight.Bold : FontWeight.Normal)
          .backgroundColor(Color.Transparent).constraintSize({ minHeight: 48 })
          .onClick(() => {
            this.sort = value as SortOrder;
            this.posts = [];
            this.after = '';
            this.loadFeed(false);
          })
          .accessibilityText(value + (this.sort === value ? ', selected' : ''))
      }, (value: string) => value)
      Blank()
      Button('Refresh').fontSize(13).fontColor(this.muted()).backgroundColor(Color.Transparent)
        .constraintSize({ minHeight: 48 }).enabled(!this.busy).onClick(() => this.loadFeed(false))
    }.width('100%').padding({ left: 10, right: 10 })
  }

  @Builder
  private postCard(post: Post) {
    Column({ space: 10 }) {
      Row() {
        Text('r/' + post.subreddit).fontSize(12).fontWeight(FontWeight.Bold).fontColor(this.accent())
        Blank()
        Text('u/' + post.author).fontSize(12).fontColor(this.muted())
      }.width('100%')
      Button({ type: ButtonType.Normal }) {
        Text(post.title).fontSize(this.textSize()).fontWeight(FontWeight.Medium).fontColor(this.ink())
          .width('100%').textAlign(TextAlign.Start)
      }.backgroundColor(Color.Transparent).padding(0).constraintSize({ minHeight: 48 })
        .onClick(() => this.openPost(post)).accessibilityText(post.title + ', open discussion')
      Row({ space: 12 }) {
        Text(post.score.toString() + ' points').fontSize(12).fontColor(this.muted())
        Text('·').fontColor(this.muted())
        Text(post.commentCount.toString() + ' comments').fontSize(12).fontColor(this.muted())
        Blank()
        Text(post.isVideo ? 'VIDEO' : 'DISCUSSION').fontSize(9).fontWeight(FontWeight.Bold)
          .letterSpacing(1).fontColor(this.muted())
      }.width('100%')
    }.alignItems(HorizontalAlign.Start).padding(18).width('100%').backgroundColor(this.surface())
      .borderRadius(12)
  }

  @Builder
  private feed() {
    this.communityPicker()
    this.feedControls()
    if (this.error.length > 0) {
      Text(this.error).fontColor(this.accent()).padding(16)
    }
    List({ space: 10 }) {
      ForEach(this.posts, (post: Post) => {
        ListItem() { this.postCard(post) }
      }, (post: Post) => post.id)
      ListItem() {
        if (this.busy) {
          LoadingProgress().width(32).height(48).color(this.accent())
            .accessibilityText('Loading posts')
        } else if (this.after.length > 0) {
          Button('Load more posts').fontColor(this.accent()).backgroundColor(this.surface())
            .width('100%').constraintSize({ minHeight: 52 }).onClick(() => this.loadFeed(true))
        } else {
          Text(this.posts.length > 0 ? 'You’re all caught up with the demo.' : 'No posts in this community.')
            .fontSize(13).fontColor(this.muted()).padding(20).width('100%').textAlign(TextAlign.Center)
        }
      }
    }.layoutWeight(1).width('100%').padding({ left: 16, right: 16, bottom: 16 }).scrollBar(BarState.Auto)
  }

  @Builder
  private commentCard(comment: Comment) {
    Column({ space: 8 }) {
      if (comment.kind === 'more') {
        Text(comment.childCount.toString() + ' more replies · not loaded in this prototype')
          .fontSize(13).fontColor(this.muted()).padding(8)
      } else {
        Button({ type: ButtonType.Normal }) {
          Row({ space: 8 }) {
            Text(this.collapsed.includes(comment.id) ? '+' : '−').fontColor(this.accent()).fontSize(22)
            Text('u/' + comment.author).fontWeight(FontWeight.Medium).fontColor(this.ink())
              .fontSize(13).layoutWeight(1)
            Text(comment.score.toString() + ' pts').fontColor(this.muted()).fontSize(12)
          }.width('100%')
        }.backgroundColor(Color.Transparent).constraintSize({ minHeight: 48 }).padding(0)
          .onClick(() => this.toggleComment(comment.id))
          .accessibilityText((this.collapsed.includes(comment.id) ? 'Expand' : 'Collapse') + ' comment by ' + comment.author)
        if (!this.collapsed.includes(comment.id)) {
          Text(comment.body).fontSize(this.textSize() - 1).fontColor(this.ink())
            .lineHeight(this.textSize() + 7).width('100%')
        } else {
          Text('Thread collapsed').fontSize(12).fontColor(this.muted())
        }
      }
    }.alignItems(HorizontalAlign.Start).padding({ left: 12, right: 12, bottom: 14 })
      .margin({ left: Math.min(comment.depth, 5) * 12 }).backgroundColor(this.surface())
      .border({ width: { left: 2 }, color: this.accent() }).borderRadius(4)
  }

  @Builder
  private discussion() {
    List({ space: 10 }) {
      if (this.selected) {
        ListItem() {
          Column({ space: 14 }) {
            Text('r/' + this.selected.subreddit).fontColor(this.accent()).fontSize(13).fontWeight(FontWeight.Bold)
            Text(this.selected.title).fontSize(this.textSize() + 5).fontColor(this.ink()).fontWeight(FontWeight.Bold)
            Text('u/' + this.selected.author + '  ·  ' + this.selected.score.toString() + ' points')
              .fontSize(13).fontColor(this.muted())
            if (this.selected.selfText.length > 0) {
              Text(this.selected.selfText).fontSize(this.textSize()).fontColor(this.ink())
                .lineHeight(this.textSize() + 8)
            }
            Text('CONVERSATION').fontSize(11).letterSpacing(2).fontColor(this.muted()).margin({ top: 14 })
          }.alignItems(HorizontalAlign.Start).padding(18).width('100%')
        }
      }
      if (this.busy) {
        ListItem() { LoadingProgress().width(40).height(48).color(this.accent()).accessibilityText('Loading comments') }
      }
      if (this.error.length > 0) {
        ListItem() {
          Button('Retry loading comments').fontColor(this.accent()).backgroundColor(this.surface())
            .onClick(() => { if (this.selected) { this.openPost(this.selected); } })
        }
      }
      ForEach(visibleComments(this.comments, this.collapsed), (comment: Comment) => {
        ListItem() { this.commentCard(comment) }
      }, (comment: Comment) => comment.id)
      if (!this.busy && !this.error && this.comments.length === 0) {
        ListItem() { Text('No comments yet.').fontColor(this.muted()).padding(20) }
      }
    }.layoutWeight(1).width('100%').padding({ left: 16, right: 16, bottom: 20 }).scrollBar(BarState.Auto)
  }

  @Builder
  private settingsPage() {
    Scroll() {
      Column({ space: 20 }) {
        Text('Make room for reading.').fontSize(26).fontWeight(FontWeight.Bold).fontColor(this.ink())
        Text('Appearance').fontColor(this.accent()).fontSize(13).fontWeight(FontWeight.Bold)
        Row({ space: 12 }) {
          Text('Dark theme').fontSize(this.textSize()).fontColor(this.ink()).layoutWeight(1)
          Toggle({ type: ToggleType.Switch, isOn: this.dark }).selectedColor('#BA252C')
            .accessibilityText('Dark theme').onChange((value: boolean) => { this.dark = value; this.saveSettings(); })
        }.constraintSize({ minHeight: 52 })
        Row({ space: 12 }) {
          Text('Larger reading text').fontSize(this.textSize()).fontColor(this.ink()).layoutWeight(1)
          Toggle({ type: ToggleType.Switch, isOn: this.largeText }).selectedColor('#BA252C')
            .accessibilityText('Larger reading text').onChange((value: boolean) => { this.largeText = value; this.saveSettings(); })
        }.constraintSize({ minHeight: 52 })
        if (this.preferenceError.length > 0) {
          Text(this.preferenceError).fontColor(this.accent()).fontSize(13)
        }
        Divider().color(this.muted()).opacity(0.25)
        Text('About this preview').fontColor(this.accent()).fontSize(13).fontWeight(FontWeight.Bold)
        Text('An independent native HarmonyOS port prototype of RedReader. All conversations are invented samples. Reddit sign-in and live browsing are not available in this build.')
          .fontSize(this.textSize() - 1).fontColor(this.ink()).lineHeight(25)
        Text('Based on RedReader by QuantumBadger and contributors. Free software under GPL version 3 or later. This prototype is not endorsed by RedReader or Reddit.')
          .fontSize(14).fontColor(this.muted()).lineHeight(22)
        Text('0.1.0 · Native ArkUI').fontSize(12).fontColor(this.muted())
      }.alignItems(HorizontalAlign.Start).width('100%').padding(24)
    }.layoutWeight(1).width('100%')
  }

  build() {
    Column() {
      this.header()
      this.demoNotice()
      if (this.screen === 'settings') {
        this.settingsPage()
      } else if (this.screen === 'discussion') {
        this.discussion()
      } else {
        this.feed()
      }
    }.width('100%').height('100%').backgroundColor(this.pageBackground())
  }
}

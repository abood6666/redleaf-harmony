# RedLeaf — native HarmonyOS port of RedReader

## Audited upstream

The reference checkout is [QuantumBadger/RedReader at `946350213bebc1d8d0530a5a68a29a67f12f3fac`](https://github.com/QuantumBadger/RedReader/tree/946350213bebc1d8d0530a5a68a29a67f12f3fac), committed 3 October 2026: “Update version to 1.27.” All upstream links below use that immutable revision. The checkout was clean when audited on 4 October 2026.

There are 908 tracked files, including 392 Java, 85 Kotlin and 203 XML files. Of the Java/Kotlin files, 448 belong to the app, 24 to tests and 5 to the common library. No repository `AGENTS.md` was found.

The [Android build](https://github.com/QuantumBadger/RedReader/blob/946350213bebc1d8d0530a5a68a29a67f12f3fac/build.gradle.kts) uses AndroidX views/fragments, Jetpack Compose, Material, OkHttp, Kotlin serialization, Jackson, Media3, NetCipher WebKit and zstd JNI. Its APK and Java/Kotlin classes cannot serve as the native ArkTS application. This project translates selected behavior and data structures, then implements HarmonyOS services and ArkUI screens.

## Reuse and replacement

| Area | Upstream reference | Port approach |
| --- | --- | --- |
| Post/comment schemas | [`reddit/kthings/`](https://github.com/QuantumBadger/RedReader/tree/946350213bebc1d8d0530a5a68a29a67f12f3fac/src/main/java/org/quantumbadger/redreader/reddit/kthings) | Translate wire fields and defensive parsing into ArkTS. Remove Android `Parcelable` and model-side effects. |
| Sorting and pagination | [`reddit/url/`](https://github.com/QuantumBadger/RedReader/tree/946350213bebc1d8d0530a5a68a29a67f12f3fac/src/main/java/org/quantumbadger/redreader/reddit/url) | Preserve sort and cursor semantics; replace Android URI construction and context dependencies. |
| Feed and comment screens | [`fragments/`](https://github.com/QuantumBadger/RedReader/tree/946350213bebc1d8d0530a5a68a29a67f12f3fac/src/main/java/org/quantumbadger/redreader/fragments) | Rebuild navigation, lists, gestures and accessibility with ArkUI. |
| OAuth | [`RedditOAuth.kt`](https://github.com/QuantumBadger/RedReader/blob/946350213bebc1d8d0530a5a68a29a67f12f3fac/src/main/java/org/quantumbadger/redreader/reddit/api/RedditOAuth.kt) | Implement native HTTP and session lifecycle using this port's approved client configuration. |
| Cache | [`cache/`](https://github.com/QuantumBadger/RedReader/tree/946350213bebc1d8d0530a5a68a29a67f12f3fac/src/main/java/org/quantumbadger/redreader/cache) | Preserve useful freshness/account-isolation concepts; replace Android SQLite, filesystem and thread code. |
| Markdown | [`reddit/prepared/markdown/`](https://github.com/QuantumBadger/RedReader/tree/946350213bebc1d8d0530a5a68a29a67f12f3fac/src/main/java/org/quantumbadger/redreader/reddit/prepared/markdown) | Parser behavior is useful; replace Android spans/views with a native renderer. |
| Media | [`image/`](https://github.com/QuantumBadger/RedReader/tree/946350213bebc1d8d0530a5a68a29a67f12f3fac/src/main/java/org/quantumbadger/redreader/image) | Reimplement images, galleries, video and downloads using HarmonyOS APIs. |

The separate `redreader-common` module currently contains only five time utilities. `redreader-datamodel` has a build file but no implementation source, so there is no substantial platform-neutral core to import unchanged.

## First vertical slice

The initial native prototype uses synthetic demonstration content and exercises:

- A subreddit feed, sort selection and pagination.
- Opening a post and expanding/collapsing nested comments.
- Settings and a clear indication that content is a demonstration.
- Loading, empty and error states as the repository implementation grows.

This milestone does not establish live Reddit access or full RedReader feature parity. Synthetic fixtures should cover nullable cursors, deleted authors, empty comment replies and `more` placeholders. Reddit replies can be a `Listing`, an empty string or null; post/comment kinds are `t3`/`t1`.

## Live integration roadmap

1. **API access and transport.** Obtain approval for this independent application before enabling live requests; use the [application draft](API-APPLICATION.md). The [upstream contribution guide](https://github.com/QuantumBadger/RedReader/blob/946350213bebc1d8d0530a5a68a29a67f12f3fac/CONTRIBUTING.md) requires a separate installed-app client ID. Read its registration instructions together with Reddit's current [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy), which requires explicit API approval. RedReader's existing access arrangement does not automatically cover this port. Start with approved read-only access, an honest application-specific User-Agent, bounded requests, cancellation and rate-limit handling. Upstream anonymous browsing also uses OAuth; unauthenticated public JSON is not the integration plan.
2. **Secure sessions and accounts.** Add browser authorization and verified callback handling, random one-use state, minimum scopes, token expiry/refresh, protected credential storage, logout/revocation and account isolation. Do not copy the upstream fixed OAuth state or its broad scope list. Keep credentials out of source, logs and content caches.
3. **Native content rendering and media.** Implement links, Markdown, spoilers, images and galleries, followed by video playback and explicitly requested downloads. Validate remote URLs, media errors, cancellation, memory use and accessibility.
4. **Content cache.** Begin live testing without a persistent Reddit-content cache. Upstream stores versioned sessions in a SQLite table keyed by user, URL and session, with compressed payload files and age pruning. A Harmony cache needs bounded storage, account/configuration keys, timestamps, atomic updates, clear controls and a deletion-aware lifecycle. The [Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki) requires removing deleted content and author information and recommends routinely purging stored data within 48 hours. Expiry alone does not replace deletion handling.
5. **Account actions and parity.** Add subscriptions, saved items and history, then user-initiated voting, saving, replies, submissions and inbox features within approved scopes. Follow with themes, translations, tablet layouts and carefully controlled precaching. Revisit API approval if the requested scope changes.

## Build targets and validation

The intended compatibility floor is **HarmonyOS 5.0/API 12**, with **HarmonyOS 6.0/API 20** as the runtime target. The available local toolchain compiles against **SDK API 26**. These are separate settings: compiling with API 26 does not make API 26-only calls safe on API 12 devices. Keep the compatibility and target values explicit in [`harmony/build-profile.json5`](../harmony/build-profile.json5), and guard or avoid APIs above the compatibility floor. The build helper is [`scripts/build-harmony.ps1`](../scripts/build-harmony.ps1).

Required validation before calling the prototype installable or a live port:

- Complete the ArkTS/Hvigor build and inspect its diagnostics and generated HAP; compilation alone does not validate runtime behavior.
- Sign, install and run on a HarmonyOS emulator or device; exercise feed sorting, pagination, back navigation, comment collapse and settings persistence.
- Check API 12 and API 20 behavior, small/large screens, font scaling, contrast and screen-reader focus/announcements.
- Test parsing and repository boundaries with synthetic fixtures, including malformed records and `more` comments.
- After approval, test OAuth callbacks, expiry, revocation, rate limits, offline recovery and cancellation without recording credentials.
- Before adding accounts or cache persistence, verify isolation, logout cleanup, expiry and deletion handling.

This document records scope and acceptance criteria; it does not claim that these checks have passed. Build and runtime evidence belongs in the project status as it becomes available.

## License and attribution

The [README](https://github.com/QuantumBadger/RedReader/blob/946350213bebc1d8d0530a5a68a29a67f12f3fac/README.md) describes GPL version 3; source headers and the [in-app license notice](https://github.com/QuantumBadger/RedReader/blob/946350213bebc1d8d0530a5a68a29a67f12f3fac/src/main/assets/license.html) explicitly allow version 3 or any later version. Preserve **GPL-3.0-or-later** notices for derivative source, include the license, identify modifications and credit QuantumBadger and RedReader contributors. The upstream [changelog](https://github.com/QuantumBadger/RedReader/blob/946350213bebc1d8d0530a5a68a29a67f12f3fac/src/main/assets/changelog.txt) records contributor credits. This independent HarmonyOS prototype is not an endorsed upstream release.

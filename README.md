# RedReader for HarmonyOS — native port prototype

An independent **ArkTS + ArkUI** port project for HarmonyOS 5/6, using [RedReader](https://github.com/QuantumBadger/RedReader) as the reference. This is an early native implementation, not an official upstream release or a finished Reddit client.

## What works in the first slice

- Native Stage-model entry ability and ArkUI reader screens.
- Synthetic demonstration feeds for Popular, HarmonyOS, technology and opensource.
- Hot/New/Top sorting, pagination and refresh.
- Post detail, nested comments and thread collapse/expand.
- Dark theme and larger reading text, saved using native Preferences.
- Portable typed models, defensive Reddit JSON parsers and validated OAuth API URL builders.

**All displayed conversations are invented sample data.** The app has no live Reddit connection or account login. No upstream API key is included. Network transport, OAuth, media playback, Markdown rendering, account actions and deletion-aware offline caching are follow-up work.

## Open and build

Open the **`harmony/` directory** in DevEco Studio. This workspace was compiled with the installed DevEco Studio 26.0 toolchain and its bundled API 26 SDK, with a HarmonyOS 5.0/API 12 compatibility floor and HarmonyOS 6.0/API 20 target. Device compatibility still requires runtime testing; these settings are not a claim of tested compatibility.

From the repository root in PowerShell:

```powershell
.\scripts\build-harmony.ps1
```

For a different installation directory:

```powershell
.\scripts\build-harmony.ps1 -DevEcoPath 'D:\Huawei\DevEco Studio'
```

The helper uses DevEco's bundled Node, Java, SDK and Hvigor, and restores environment variables after the build. No signing configuration is committed. Configure your own development signing in DevEco Studio to install on a device. Keep private keys and signing profiles out of Git.

Verified locally on 4 October 2026: the unsigned HAP build succeeds and produces `harmony/entry/build/default/outputs/default/entry-default-unsigned.hap`. Packaged metadata reports minimum API 12, target API 20 and compiled SDK 26.0.0.32. Signing, installation, device behavior and screen-reader behavior are **not yet tested**. The build reports the expected missing-signing warning; a fresh build may also flag prototype module version `0.1.0` due to the bundled vendor validator.

## Core checks

With Node.js 24 and DevEco Studio installed:

```powershell
node tests/run-tests.mjs
```

The runner uses the TypeScript compiler bundled with DevEco Studio (or a local TypeScript installation / `TYPESCRIPT_PATH` override), type-checks the portable core strictly, and runs Node tests using synthetic data. Verified: **17 tests passed**, covering parsing, deleted/null fields, nested comments, collapse behavior, pagination, URL validation and fixture isolation. These checks do not substitute for native UI/device testing.

## Reddit access

Before enabling live access, this independent application needs its own approved integration. RedReader's accessibility exemption is not automatically granted to a port. See the [application draft](docs/API-APPLICATION.md) and Reddit's [current approval policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy).

The application draft has not been submitted. Personal identity, repository URL, distribution plans, funding and traffic estimates must reflect the actual project.

## Project layout

| Path | Purpose |
| --- | --- |
| `harmony/` | Native DevEco/ArkUI project |
| `harmony/entry/src/main/ets/core/` | Models, parsers, URL validation, synthetic repository, comment visibility |
| `harmony/entry/src/main/ets/pages/Index.ets` | Feed, discussion and reading settings |
| `tests/` | Portable core regression tests with synthetic data |
| `docs/PORTING.md` | Upstream audit, platform mapping and implementation roadmap |
| `docs/API-APPLICATION.md` | Reviewable API access request draft |
| `scripts/build-harmony.ps1` | Local unsigned HAP build |

## Upstream and license

Reference revision: [`946350213bebc1d8d0530a5a68a29a67f12f3fac`](https://github.com/QuantumBadger/RedReader/tree/946350213bebc1d8d0530a5a68a29a67f12f3fac), 3 October 2026, version 1.27. The local reference checkout under `upstream/RedReader` is ignored by this repository. The audit contains immutable links so the source can be retrieved independently.

RedReader is by **QuantumBadger and contributors**. This project replaces the Android runtime and UI with a new native HarmonyOS implementation and translates selected data/behavior concepts. It is licensed under **GPL-3.0-or-later**; see [LICENSE.txt](LICENSE.txt) and [NOTICE.md](NOTICE.md).

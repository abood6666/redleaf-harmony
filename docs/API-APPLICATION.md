# Reddit Data API application draft

Draft only. Nothing has been submitted. Replace the bracketed fields and confirm all commitments before submitting. Do not include passwords, access tokens, or signing credentials.

## Where to apply

[Developer API request form](https://support.reddithelp.com/hc/en-us/requests/new?tf_42139884615700=api_request_type_developer_clone&ticket_form_id=14868593862164), linked from the [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy). Checked 4 October 2026.

## Subject

Request for non-commercial Data API access: RedLeaf, a native HarmonyOS reader inspired by RedReader

## Project and benefit

I am developing RedLeaf, an independent, open-source native Reddit reader for HarmonyOS 5/6 using ArkTS and ArkUI, based on the design and behavior of the GPL-licensed RedReader Android project. This is an early prototype, not an official RedReader release or a project endorsed by its maintainer or Reddit.

The goal is a usable native reader on HarmonyOS phones and tablets, with readable text, explicit controls, adjustable text size, high-contrast themes, and navigable comment threads. Accessibility work is planned and must still be tested with HarmonyOS screen readers and users; we are not claiming accessibility certification or an existing user population.

## Why Devvit does not meet the use case

Our intended product is a standalone native HarmonyOS application with operating-system UI, navigation, storage, and accessibility integration. We are not proposing an app embedded in Reddit. Please advise whether this use case can be approved and what supported integration route we should use.

## Initial scope

Read-only, user-initiated browsing of subreddit post listings and comment threads using approved OAuth access. No automated posting, messaging, voting, bulk collection, resale, profiling, or AI training. Account interaction features would be requested separately if the approved scope needs to change.

Subreddits: [List initial test communities and explain intended general browsing scope honestly.]

## Distribution and scale

Current status: local native prototype using synthetic demonstration content; no live Reddit integration is enabled.

Initial audience: [Actual number of private testers.]

Distribution: [Private testing / intended public store and source repository, as applicable.]

Expected traffic: [Realistic total requests per minute/day and peak concurrency. Do not confuse a per-user estimate with the shared client limit.]

Source: https://github.com/abood6666/redleaf-harmony (upstream reference: https://github.com/QuantumBadger/RedReader).

Contact: [Reddit username without u/ and contact email.]

## Funding and request

The planned app will be free and non-commercial, with no ads or paid subscriptions (confirmed by the project owner on 4 October 2026). We request consideration for free API access and guidance on eligibility for a non-commercial accessibility-focused application. We understand that RedReader's existing agreement does not automatically cover this independent port.

## Proposed data handling

Before enabling live use, we will implement an honest app-specific User-Agent, approved OAuth credentials, rate-limit response handling, and a deletion-aware data lifecycle. The first live version is intended to avoid a persistent cache of Reddit content. Credentials will not be committed to source or logged. Any future offline cache will require a documented deletion and retention policy, implemented and tested before release.

## Relevant sources

- [Reddit Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki): authentication, eligible free usage limits, identification and deletion rules.
- [RedReader maintainer's exemption announcement](https://www.reddit.com/r/RedReader/comments/145du4j/update_4_redreader_granted_noncommercial/): historical agreement and separate credentials for other builds.
- [Upstream contribution instructions](https://github.com/QuantumBadger/RedReader/blob/master/CONTRIBUTING.md): client configuration; its self-service registration directions should be read together with Reddit's current approval policy.

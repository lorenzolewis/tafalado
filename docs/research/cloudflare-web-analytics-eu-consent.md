# Cloudflare Web Analytics and EU consent (issue #8)

Researched 2026-11-09 from primary sources: Cloudflare's docs, blog, DPA and policies; the EDPB; the BOE; and the AEPD and CNIL. I also read the live beacon script (`beacon.min.js`, version `2026.10.1`). **This is research, not legal advice.** "Unverified" means no primary source confirmed it.

## Bottom line

- **On a strict reading, the beacon needs consent in Spain.** The EDPB's 2024 guidelines treat a script that tells the browser to send device information (user agent, timings, referrer) as "gaining access" under ePrivacy Art. 5(3), cookies or not. Spain's LSSI art. 22.2 has no exemption for audience measurement. The AEPD says analytics "no están exentas" of consent.
- **The practical risk is low.** It sets no cookies, writes nothing to the device, keeps no identifiers and produces only aggregate stats. The AEPD calls first-party, aggregate, statistics-only analytics with notice and opt-out "poco probable" to be a privacy risk. I found no regulator decision that names Cloudflare Web Analytics.
- **Cloudflare itself is hedging.** It never says a banner isn't needed. Its default leaves EU visitors out, and it describes that toggle as a way "to comply with GDPR and CCPA". Compliance is left to the customer.
- **There are three realistic options:**
  1. Keep it for everyone, with no banner, and publish a privacy notice. This accepts a small legal risk.
  2. Use "Exclude EU". You lose most of the audience's data.
  3. Load the beacon only after an opt-in. That is the cleanest legally, but very few visitors will opt in.
- **Whatever you choose, publish a short privacy notice** (contents at the end). The DPA already applies through Cloudflare's self-serve terms, so there's nothing to sign.
- **The MP3 download count raises nothing material.** It runs server-side, writes only the episode path and reads nothing from the device.

## What the beacon actually does

- **No device storage.** Cloudflare says "We don't use any client-side state (like cookies or localStorage) for analytics purposes" ([launch blog](https://blog.cloudflare.com/privacy-first-web-analytics/), [product page](https://www.cloudflare.com/web-analytics/)). The script I read contains no `document.cookie`, `localStorage` or `sessionStorage`.
- **What it reads and sends** (from [the beacon script](https://static.cloudflareinsights.com/beacon.min.js)):
  - the page URL, with the query string, hash and credentials removed
  - `document.referrer`
  - `navigator.userAgent`, parsed into browser engine and OS version
  - `navigator.userAgentData.getHighEntropyValues(["platformVersion"])`
  - Performance and Resource Timing data
  - a per-page-load ID
- **Where it sends it.** It posts with `sendBeacon` to `/cdn-cgi/rum` (or `cloudflareinsights.com/cdn-cgi/rum`) "when the page has finished loading" ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)). The FAQ also says query strings aren't logged ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
- **IP addresses.** Cloudflare necessarily receives the IP with each request. The data goes "to the nearest Cloudflare data center", where edge pre-processing "removes personal information like IP addresses" before it is sent to a core data center ([RUM diaries blog](https://blog.cloudflare.com/the-rum-diaries-enabling-web-analytics-by-default/)).
- **No fingerprinting.** Cloudflare says it doesn't "fingerprint" individuals by IP, user agent "or any other data" ([product page](https://www.cloudflare.com/web-analytics/)). Visits are counted from referral or navigation events, not unique IPs ([launch blog](https://blog.cloudflare.com/privacy-first-web-analytics/)).
- **Retention.** Unsampled for 7 days, with six months viewable ([FAQ](https://developers.cloudflare.com/web-analytics/faq/)). The blog doesn't say Cloudflare reuses the data for its own purposes ([RUM diaries](https://blog.cloudflare.com/the-rum-diaries-enabling-web-analytics-by-default/)).

## What Cloudflare says about the EU

- **The default excludes the EU, and no reason is given.** The blog was published 17 Sep 2025, for a 15 Oct 2025 switch-on. It promises analytics "without ever collecting any personal data" but adds "(not applicable to traffic originating from the EU or UK)". The default "excludes data from EU visitors", which can be changed in the dashboard. Neither the blog nor the FAQ explains why ([blog](https://blog.cloudflare.com/the-rum-diaries-enabling-web-analytics-by-default/), [FAQ](https://developers.cloudflare.com/web-analytics/faq/)).
- **The changelog gives the clearest reason.** The "Exclude EU" toggle works by "safely dropping requests from visitors in the European Union to comply with GDPR and CCPA". Technically it drops "all metrics collected by our EU data centers", so it filters by data center, not by visitor nationality ([changelog](https://developers.cloudflare.com/changelog/post/2025-02-25-rum-exclude-eu/)). The page is dated Feb 2024 while its URL says 2025.
- **"No personal data", with an EU exception.** The docs say Web Analytics "does not collect or use your visitors' personal data" ([about](https://developers.cloudflare.com/web-analytics/about/)), but the blog's EU and UK exception above qualifies that.
- **Consent is never addressed.** No Cloudflare page I read says whether consent is needed. The GDPR hub says customers "are fully responsible for their own compliance with applicable law" ([trust hub](https://www.cloudflare.com/trust-hub/gdpr/)).
- **No Data Localization for this product.** Web Analytics is not compatible with the Customer Metadata Boundary. The footnote says it "collects the minimum amount of information" and offers excluding EU visitors instead ([DLS compatibility](https://developers.cloudflare.com/data-localization/compatibility/)).

## Contract side: DPA, roles, transfers

- **The DPA applies without signing.** It is incorporated by reference into the Self-Serve Subscription Agreement, and self-serve customers need "no action" for transfer mechanisms ([DPA v6.4, 3 Apr 2026](https://www.cloudflare.com/cloudflare-customer-dpa/), [trust hub](https://www.cloudflare.com/trust-hub/gdpr/)).
- **Roles.** The customer is the controller and Cloudflare the processor (DPA §2.3). End-user logs of the site's traffic are covered as "Customer Logs" (Annex 1), and Cloudflare won't use the data for marketing or advertising (§3.1(b)) ([DPA](https://www.cloudflare.com/cloudflare-customer-dpa/)). The privacy policy also calls Cloudflare a processor for customer content, with "no direct relationship with End Users" ([privacy policy, 4 Nov 2025](https://www.cloudflare.com/privacypolicy/)).
- **Transfers.** EU SCCs Modules 2 and 3 plus the UK Addendum (§6.2), and the EU–US Data Privacy Framework (§6.4) ([DPA](https://www.cloudflare.com/cloudflare-customer-dpa/)). Cloudflare says it has certified to the EU–US DPF, with SCCs as fallback ([privacy policy](https://www.cloudflare.com/privacypolicy/)).
- **Sub-processors.** None is listed for Web Analytics or the core network. Third parties are listed only for support, Developer Platform, Zero Trust, AI, Email Security and Cache Reserve ([sub-processors](https://www.cloudflare.com/gdpr/subprocessors/cloudflare-services/)).

## Law and regulator guidance

- **ePrivacy Art. 5(3).** Storing or accessing information in a user's terminal needs consent, except for access "for the sole purpose of carrying out the transmission" or "strictly necessary" for a service the user explicitly requested. This is quoted in [EDPB Guidelines 2/2023, footnote 4](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en); the official text is on [EUR-Lex](https://eur-lex.europa.eu/eli/dir/2002/58/oj), which blocked automated fetches.
- **EDPB Guidelines 2/2023, final v2.0 of 16 Oct 2024** ([page](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en), [PDF](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)):
  - **Not limited to personal data.** "Information" covers personal and non-personal data (¶6a, ¶12).
  - **JavaScript counts as access.** Code "where the accessing entity instructs the browser of the user to send asynchronous requests with the targeted information" is access that "clearly falls within the scope" (¶33). So does information that is generated locally and then sent to a server (¶53).
  - **User agent and HTTP context data.** Collecting these "can lead to the application of Article 5(3)" (¶43).
  - **Exemptions aren't analysed.** Applicability "does not systematically mean that consent needs to be collected" (¶40, ¶56).
  - **What this means here.** The beacon (JS that reads the user agent, platform version and timings, then sends them) fits ¶33 and ¶43, cookies or not.
- **Spain, LSSI art. 22.2.** Consent is required, with only the transmission and strictly-necessary exceptions. There is no audience-measurement exemption ([BOE consolidated text](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758)).
- **AEPD, *Guía sobre el uso de las cookies*, May 2024** ([PDF](https://www.aepd.es/guias/guia-cookies.pdf)):
  - **Scope.** It covers cookies "y tecnologías similares", web beacons and fingerprinting (§1).
  - **Analytics are not exempt.** Analytics cookies "no están exentas" of informed consent (§2.1.2(c)).
  - **But low risk under conditions.** Quoting WP29, the guide says they're unlikely to be a risk when they are first-party, aggregate, strictly statistical, disclosed, and the user can refuse (§2.1.2(c)).
- **France, CNIL** ([audience measurement page, 4 Jul 2025](https://www.cnil.fr/fr/solutions-pour-la-mesure-daudience)):
  - **There is an exemption** under art. 82 of the Loi Informatique et Libertés. It covers "traceurs" generally, not only cookies.
  - **Strict conditions:** the measurement must be "pour le compte exclusif de l'éditeur", produce only anonymous statistics, and involve no cross-site tracking, no combining with other data and no passing of non-anonymous data to third parties.
  - **Recommendations, not conditions:** inform users; trackers up to about 13 months; data up to 25 months.
  - **No list on the page.** It lists no exempted tools and doesn't mention Cloudflare. Providers get a [self-assessment tool](https://cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf) instead.
  - **Cloudflare's fit.** On paper it looks close to the conditions, but Cloudflare hasn't published a CNIL self-assessment. The French exemption also doesn't apply in Spain.
- **GDPR basics** ([EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)):
  - IP addresses are "online identifiers" (Recital 30), and dynamic IPs can be personal data ([CJEU C-582/14 *Breyer*](https://curia.europa.eu/juris/liste.jsf?num=C-582/14)). Cloudflare sees the IP briefly at the edge, so GDPR applies to that moment.
  - Legitimate interest (Art. 6(1)(f)) is the natural basis for aggregate analytics once the ePrivacy question is settled.
  - Art. 13 requires a notice. Art. 28 requires a processor contract, which the DPA covers.

## MP3 download count (Analytics Engine)

- **Nothing is read from the device.** `worker/downloads.ts` writes only `url.pathname` for full or `bytes=0-` GETs on `tafalado.lorenzo.soy`, and reads no IP, user agent or cookie. The Worker already handles the request to serve the file the user asked for. Logging which file it served doesn't read anything from the device or add a request (compare EDPB ¶33 and ¶55). The only header it reads is `Range`, to decide whether to count.
- **No personal data in what's written.** An episode path is not personal data.
- **Worth one line in the privacy notice** anyway, for transparency.
- *Unverified:* I couldn't confirm from the docs whether Analytics Engine adds any automatic columns besides a timestamp.

## Privacy notice: suggested contents (Spanish, plus Portuguese if wanted)

1. Who runs the site and a contact (Art. 13(1)(a)).
2. What is collected: page address without parameters, referrer, browser and OS type, load timings. There are no cookies and nothing is stored on the device. Cloudflare sees the IP, which is removed at the edge.
3. Purpose: aggregate visit statistics. Legal basis: legitimate interest.
4. Cloudflare as processor, transfers to the US under the DPF and SCCs, and 6 months of retention.
5. MP3 downloads counted by file name only.
6. Rights: access, objection, and a complaint to the AEPD (aepd.es). How to opt out: a content blocker, or blocking `cloudflareinsights.com`.

## Unverified / open questions

- **No regulator decision found.** No regulator decision or official statement names Cloudflare Web Analytics. Third-party blogs claim cookieless tools need no banner, and that the CNIL dropped its list of exempted tools on 1 Jan 2026; neither is confirmed on cnil.fr.
- **Exemptions for cookieless JS analytics.** Whether the AEPD would apply the "strictly necessary" exemption, or tolerate it like low-risk analytics, has no primary-source answer. The EDPB declined to analyse exemptions.
- **Free plan and the DPA.** Whether the Free plan is formally under the Self-Serve Subscription Agreement, and so the DPA, is likely but not stated outright.
- **DPF listing.** The live entry on dataprivacyframework.gov wasn't checked; Cloudflare's own policy is the source.
- **EUR-Lex text.** EUR-Lex blocked automated fetches, so the Directive and GDPR wording is cited from the EDPB's quotation and the official URLs, not re-read.
- **Reuse for Cloudflare's own purposes.** The privacy policy lets Cloudflare analyse "Network Data" for its own purposes. Whether Web Analytics beacon data counts as Network Data is not stated, and it matters for the CNIL "exclusive account" test.

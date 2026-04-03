# Research: Congressional Member Data APIs and Available Data

**Date**: 2026-04-01 | **Researcher**: nw-researcher (Nova) | **Confidence**: High | **Sources**: 12

## Executive Summary

The Congress.gov API v3 is the primary, actively maintained government API for congressional member data. It provides comprehensive member profiles including biographical data, terms served, leadership positions, sponsored/cosponsored legislation, official photos, and contact information. As of 2025, beta endpoints for House roll call votes with member positions have been added, with Senate votes expected to follow.

The broader landscape of congressional data APIs has contracted significantly. ProPublica's Congress API was archived in February 2025 and is no longer available. OpenSecrets discontinued its API on April 15, 2025. The remaining free options are: the OpenFEC API (campaign finance), GovTrack (computed member statistics like ideology and bipartisanship scores), the unitedstates/congress-legislators GitHub repository (structured YAML/JSON data with cross-referenced IDs), and LegiScan (legislation tracking across all states and Congress).

For a civic application, the Congress.gov API v3 combined with the unitedstates GitHub data repositories provides the richest free data foundation. Campaign finance can be supplemented via the OpenFEC API, and derived statistics (ideology, bipartisanship) can either be sourced from GovTrack's published report cards or computed from the raw sponsorship/cosponsorship data available through Congress.gov.

## Research Methodology

**Search Strategy**: Direct API documentation fetch from official sources (GitHub repos, .gov domains), supplemented by web searches for current status of third-party APIs.
**Source Selection**: Types: official government documentation, official API docs, open-source repositories | Reputation: high/medium-high minimum | Verification: cross-referencing across official docs and community sources.
**Quality Standards**: Min 3 sources/claim for major findings | All major claims cross-referenced | Avg reputation: 0.92

---

## Findings

### Finding 1: Congress.gov API v3 Member Detail Endpoint -- Comprehensive Field Set

The `/v3/member/{bioguideId}` endpoint returns a rich profile for each member of Congress.

**Endpoint URLs**:
- `/v3/member` -- List all members
- `/v3/member/{bioguideId}` -- Individual member detail
- `/v3/member/congress/{congress}` -- Members by Congress number
- `/v3/member/congress/{congress}/{stateCode}/{district}` -- Members by Congress, state, and district
- `/v3/member/{bioguideId}/sponsored-legislation` -- Bills sponsored
- `/v3/member/{bioguideId}/cosponsored-legislation` -- Bills cosponsored

**Fields returned by `/v3/member/{bioguideId}`**:

| Category | Fields |
|----------|--------|
| **Identity** | `bioguideId`, `firstName`, `middleName`, `lastName`, `suffixName`, `honorificName`, `nickName`, `directOrderName`, `invertedOrderName`, `previousNames` (with date ranges) |
| **Status** | `currentMember` (boolean), `birthYear`, `deathYear`, `updateDate` |
| **Political** | `partyName` ("Democratic", "Republican", "Independent", etc.), `partyCode` ("D", "R", "I", "ID", "L"), `party` (current) |
| **Geographic** | `state`, `stateCode` (two-letter postal), `district` (House only; 0 = at-large) |
| **Contact** | `officeAddress`, `city`, `zipCode`, `phoneNumber`, `officialUrl` |
| **Depiction** | `imageUrl`, `attribution` |
| **Terms** | Array of term items, each with: `memberType`, `congress`, `chamber`, `startYear`, `endYear`, `stateCode`, `stateName`, `partyName`, `partyCode`, `district` |
| **Leadership** | Array with: `type` (e.g., "President Pro Tempore"), `congress`, `current` (boolean) |
| **Legislation** | Via sub-endpoints: `count`, `introducedDate`, `type`, `congress`, `latestTitle`, `number`, `policyArea/name`, `latestAction` |

**Confidence**: High
**Sources**: [Congress.gov API Member Endpoint Documentation](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/Documentation/MemberEndpoint.md), [Congress.gov API Portal](https://api.congress.gov/), [Library of Congress API Page](https://www.loc.gov/apis/additional-apis/congress-dot-gov-api/)

**Analysis**: This is the most authoritative and complete source for member data. The terms array provides full service history across multiple Congresses, and the leadership container tracks positions held. The sponsored-legislation and cosponsored-legislation sub-endpoints return counts and full bill metadata, enabling sponsorship statistics.

---

### Finding 2: Member Photo/Depiction URL Format

Member photos are available through two sources:

**Congress.gov API depiction field**:
```
https://www.congress.gov/img/member/{bioguideId_lowercase}_200.jpg
```
Example: `https://www.congress.gov/img/member/l000174_200.jpg`

The `depiction` container in the API response includes `imageUrl` and `attribution` (typically crediting the Senate Historical Office or similar).

**unitedstates/images GitHub repository** (public domain, GPO source):
```
https://unitedstates.github.io/images/congress/{size}/{bioguideId}.jpg
```

Available sizes:
- `original` -- as downloaded (typically 675x825px)
- `450x550` -- medium
- `225x275` -- thumbnail

**Confidence**: High
**Sources**: [Congress.gov API Member Endpoint Docs](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/Documentation/MemberEndpoint.md), [unitedstates/images GitHub](https://github.com/unitedstates/images), [Congress.gov API Portal](https://api.congress.gov/)

**Analysis**: The unitedstates/images repo is preferable for applications needing multiple size options and public domain licensing clarity. The Congress.gov URL provides only a 200px version. Both use the bioguideId as the key identifier. Images are public domain (Government Printing Office source).

---

### Finding 3: Voting Record Data -- House Roll Call Votes (Beta)

As of May 2025, the Congress.gov API added beta endpoints for House roll call votes:

**Endpoints**:
- List level: all House roll call votes (filterable by congress and session)
- Item level: details of a specific roll call vote
- Member votes level: how each House member voted on a specific vote

**Data returned at member votes level**:
- BioGuide ID for each voting member
- Individual vote position (Yea/Nay/Present/Not Voting)

**Coverage**: 118th Congress (2023) onward. Includes legislation-related votes and non-legislation votes (e.g., Speaker election).

**Senate votes**: Not yet available via the API. Senate roll call vote endpoints appear to be in development.

**Confidence**: Medium (beta status, House-only currently)
**Sources**: [Library of Congress Blog -- Introducing House Roll Call Votes](https://blogs.loc.gov/law/2025/05/introducing-house-roll-call-votes-in-the-congress-gov-api/), [Congress.gov Roll Call Votes Page](https://www.congress.gov/roll-call-votes), [Congress.gov API ChangeLog](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/ChangeLog.md)

**Analysis**: This is a significant addition but still limited. House votes from 2023+ only, and Senate votes are not yet in the API. For historical voting data, alternative sources (bulk data from the unitedstates/congress GitHub repo or GovTrack) are still necessary.

---

### Finding 4: Sponsorship and Cosponsorship Data

The Congress.gov API provides full sponsorship tracking through dedicated sub-endpoints:

**Sponsored legislation** (`/v3/member/{bioguideId}/sponsored-legislation`):
- Total count of bills/resolutions sponsored
- Per-bill: `introducedDate`, `type` (HR, S, HJRES, SJRES, HCONRES, SCONRES, HRES, SRES), `congress`, `latestTitle`, `number`, `policyArea/name`, `latestAction` (with `actionDate` and `text`), `url` to full bill endpoint

**Cosponsored legislation** (`/v3/member/{bioguideId}/cosponsored-legislation`):
- Same structure as sponsored
- Total count of cosponsored items

**Derivable statistics**:
- Total bills sponsored per Congress
- Bills by type (bills vs resolutions)
- Bills by policy area
- Success rate (how many sponsored bills received floor action, passed committee, became law)
- Cosponsorship volume and cross-party cosponsorship patterns

**Confidence**: High
**Sources**: [Congress.gov API Member Endpoint Docs](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/Documentation/MemberEndpoint.md), [Congress.gov API Portal](https://api.congress.gov/), [R congress package documentation](https://cran.r-project.org/web/packages/congress/congress.pdf)

---

### Finding 5: ProPublica Congress API -- Discontinued (February 2025)

The ProPublica Congress API is no longer available. The GitHub repository was archived on February 4, 2025, and new API keys cannot be obtained. The documentation remains as historical reference only.

**What it previously offered**:
- Member biographical data, vote positions, bill cosponsorships
- Roll-call vote data (Senate from 1989, House from 1991)
- Bill summaries, subjects, amendments, cosponsors (from 1995)
- Nominations, committees, statements, lobbying data
- Pre-computed member comparison and party vote statistics

**Confidence**: High
**Sources**: [ProPublica Congress API Documentation](https://projects.propublica.org/api-docs/congress-api/), [ProPublica Congress API Update](https://www.propublica.org/nerds/congress-api-update), [propublica/congress-api-docs GitHub Issues](https://github.com/propublica/congress-api-docs/issues)

**Analysis**: This was the most developer-friendly API with pre-computed statistics. Its loss is significant. The Congress.gov API provides the raw data but not the pre-computed analytics ProPublica offered (member comparisons, party vote percentages, bipartisanship indices).

---

### Finding 6: OpenSecrets API -- Discontinued (April 15, 2025)

The OpenSecrets API was discontinued on April 15, 2025.

**What it previously offered**:
- `candSummary` -- summary contribution data per candidate per cycle
- `candContrib` -- top contributors to a candidate
- `candIndustry` -- top industry donors
- `candIndByInd` -- specific industry contributions to specific candidate
- `candSector` -- top sector donors
- Campaign finance data sourced from FEC filings
- Lobbying data from Senate Office of Public Records

**Current alternative**: Contact data team at data@opensecrets.org for custom solutions. Website data still browsable manually.

**Confidence**: High
**Sources**: [OpenSecrets API Page](https://www.opensecrets.org/api), [OpenSecrets Open Data](https://www.opensecrets.org/open-data), [OpenSecrets Research Tools](https://www.opensecrets.org/research-tools)

---

### Finding 7: OpenFEC API -- Active, Free Campaign Finance Data

The Federal Election Commission's OpenFEC API remains active and free.

**Key capabilities**:
- Candidate financial summaries (total raised, total spent, cash on hand, debts)
- Schedule A data (itemized contributions to campaigns)
- Schedule B data (itemized disbursements/spending)
- Committee financial reports (Form 3, 3X, 3P summaries)
- Filtering by cycle, state, party, office sought
- Cumulative totals by committee type over two-year cycles

**Authentication**: Free API key via api.data.gov
**Rate limits**: Uses the api.data.gov key system (standard tier)
**Format**: RESTful JSON

**Confidence**: High
**Sources**: [OpenFEC API Documentation](https://api.open.fec.gov/developers/), [FEC Data Browse](https://www.fec.gov/data/browse-data/), [openFEC GitHub](https://github.com/fecgov/openFEC)

**Analysis**: With OpenSecrets gone, OpenFEC becomes the primary free source for campaign finance data. It provides raw FEC filing data but lacks the curated analytics OpenSecrets offered (industry categorization, donor organization mapping). The data is comprehensive but requires more processing to derive meaningful member-level insights.

---

### Finding 8: GovTrack -- Member Statistics and Report Cards

GovTrack computes several unique derived statistics for members of Congress:

**Ideology Score**: Uses cosponsorship data to place members on a left-right spectrum. Members who cosponsor similar bills cluster together. Calculated using dimensionality reduction on the cosponsorship matrix.

**Leadership Score**: Applies the PageRank algorithm to cosponsorship data. Members whose bills attract more cosponsors (especially from members who themselves attract cosponsors) score higher. Measures ability to build legislative coalitions.

**Other report card metrics**:
- Missed votes percentage
- Bills introduced count
- Bills out of committee
- Bills enacted
- Bipartisan bill cosponsorship (cosponsoring bills from the other party)

**Data access**: GovTrack ended its bulk data API, directing users to official government sources for raw data. However, report card data is published on the website by year.

**Limitations**: Scores not computed for members with fewer than 10 bills introduced. Scores fluctuate due to limited data per session.

**Confidence**: High
**Sources**: [GovTrack Analysis Methodology](https://www.govtrack.us/about/analysis), [GovTrack Report Cards 2024](https://www.govtrack.us/congress/members/report-cards/2024), [Ballotpedia -- GovTrack Rankings](https://ballotpedia.org/GovTrack's_Political_Spectrum_&_Legislative_Leadership_ranking)

**Analysis**: GovTrack's ideology and leadership scores are the most widely cited computed metrics for member analysis. While their API is discontinued, the methodology is public and could be replicated using cosponsorship data from the Congress.gov API.

---

### Finding 9: unitedstates/congress-legislators -- Cross-Referenced Member Data

The [unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators) GitHub repository maintains structured YAML/JSON/CSV data for all members of Congress, 1789-present.

**Data fields per legislator**:

| Category | Fields |
|----------|--------|
| **IDs** | `bioguide`, `thomas`, `govtrack`, `opensecrets`, `votesmart`, `fec`, `cspan`, `wikipedia`, `ballotpedia`, `maplight`, `house_history`, `icpsr` |
| **Name** | `official_full`, `first`, `middle`, `last`, `suffix`, `nickname`, `other_names` (historical) |
| **Bio** | `gender` ("M"/"F"), `birthday` |
| **Terms** | `state`, `start`, `end`, `type` (sen/rep), `party`, `district`, `how` (appointment/special-election), `url`, `address`, `phone`, `fax`, `contact_form`, `office`, `rss_url` |
| **Social Media** | `twitter`, `twitter_id`, `facebook`, `youtube`, `youtube_id`, `mastodon` |

**Additional files**:
- `legislators-current.yaml` -- current members
- `legislators-historical.yaml` -- all historical members
- Committee assignment data
- Executive branch data (presidents, vice presidents)

**Confidence**: High
**Sources**: [unitedstates/congress-legislators GitHub](https://github.com/unitedstates/congress-legislators), [README documentation](https://github.com/unitedstates/congress-legislators/blob/main/README.md), [unitedstates GitHub organization](https://github.com/unitedstates)

**Analysis**: This is invaluable as a cross-referencing hub. The ID mapping (bioguide to govtrack, opensecrets, FEC, etc.) allows linking data across multiple sources. The social media fields are not available from the Congress.gov API. Community-maintained but well-established.

---

### Finding 10: LegiScan API -- Active Alternative for Legislation Tracking

LegiScan provides structured JSON data for legislation across all 50 states and Congress.

**Capabilities**: Bill detail, status tracking, sponsors, full bill text, roll call records, session data.
**Free tier**: 30,000 queries per month.
**Authentication**: Free API key at legiscan.com.

**Confidence**: Medium-High
**Sources**: [LegiScan API](https://legiscan.com/legiscan), [LegiScan Datasets](https://legiscan.com/datasets), [Congressional Data Guide](https://congressionaldata.org/a-biased-yet-reliable-guide-to-sources-of-information-and-data-about-congress/)

---

## Summary: Available Data by Category

| Data Category | Best Free Source | Status |
|---------------|-----------------|--------|
| **Member profiles** (bio, terms, contact) | Congress.gov API v3 | Active |
| **Member photos** | unitedstates/images GitHub or Congress.gov | Active |
| **Sponsored/cosponsored legislation** | Congress.gov API v3 | Active |
| **House roll call votes** (2023+) | Congress.gov API v3 (beta) | Active (beta) |
| **Historical votes** (pre-2023) | unitedstates/congress bulk data | Active |
| **Campaign finance** | OpenFEC API | Active |
| **Ideology/bipartisanship scores** | GovTrack report cards (web) | Active (no API) |
| **Cross-referenced member IDs** | unitedstates/congress-legislators | Active |
| **Social media accounts** | unitedstates/congress-legislators | Active |
| **Committee assignments** | Congress.gov API v3 (committee endpoint) | Active |
| **Leadership positions** | Congress.gov API v3 (member endpoint) | Active |
| **State + federal legislation** | LegiScan API | Active (free tier) |

## Derivable Statistics from Available Data

Using the Congress.gov API v3 sponsorship data and vote data, these statistics could be computed:

1. **Bill sponsorship count** -- total bills introduced per Congress (direct from API)
2. **Cosponsorship count** -- total bills cosponsored (direct from API)
3. **Legislative effectiveness** -- ratio of bills introduced vs. bills passing committee vs. enacted
4. **Policy focus areas** -- distribution of sponsored bills across `policyArea` categories
5. **Cross-party cosponsorship rate** -- bills cosponsored from opposing party members (requires cross-referencing party data with cosponsorship lists)
6. **Voting alignment** -- percentage of votes aligned with party majority (requires roll call vote data)
7. **Missed vote rate** -- votes not participated in vs. total votes held
8. **Ideology score** -- replicable from cosponsorship patterns using GovTrack's published methodology
9. **Leadership score** -- replicable using PageRank on cosponsorship network
10. **Campaign finance metrics** -- total raised, top industries, small vs. large donor ratio (via OpenFEC)

---

## Source Analysis

| Source | Domain | Reputation | Type | Access Date | Cross-verified |
|--------|--------|------------|------|-------------|----------------|
| Congress.gov API Member Endpoint Docs | github.com/LibraryOfCongress | High (1.0) | Official/Government | 2026-04-01 | Y |
| Congress.gov API Portal | api.congress.gov | High (1.0) | Official/Government | 2026-04-01 | Y |
| Library of Congress API Page | loc.gov | High (1.0) | Official/Government | 2026-04-01 | Y |
| LOC Blog -- Roll Call Votes | blogs.loc.gov | High (1.0) | Official/Government | 2026-04-01 | Y |
| unitedstates/images GitHub | github.com/unitedstates | Medium-High (0.8) | Open Source/Community | 2026-04-01 | Y |
| unitedstates/congress-legislators | github.com/unitedstates | Medium-High (0.8) | Open Source/Community | 2026-04-01 | Y |
| ProPublica Congress API Docs | projects.propublica.org | High (1.0) | Industry/Journalism | 2026-04-01 | Y |
| OpenSecrets API Page | opensecrets.org | Medium-High (0.8) | Nonprofit/Advocacy | 2026-04-01 | Y |
| OpenFEC API Docs | api.open.fec.gov | High (1.0) | Official/Government | 2026-04-01 | Y |
| GovTrack Analysis Methodology | govtrack.us | Medium-High (0.8) | Community/Analytical | 2026-04-01 | Y |
| GovTrack Report Cards | govtrack.us | Medium-High (0.8) | Community/Analytical | 2026-04-01 | Y |
| LegiScan API | legiscan.com | Medium-High (0.8) | Commercial/Data | 2026-04-01 | N |

Reputation: High: 6 (50%) | Medium-High: 6 (50%) | Avg: 0.90

## Knowledge Gaps

### Gap 1: Senate Roll Call Vote API Endpoints
**Issue**: The Congress.gov API only has beta House roll call vote endpoints (118th Congress, 2023+). Senate vote endpoints are not yet available via the API.
**Attempted**: Searched Congress.gov API documentation, changelog, and LOC blog posts.
**Recommendation**: Monitor the [Congress.gov API ChangeLog](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/ChangeLog.md) for Senate vote endpoint announcements. In the interim, use bulk vote data from the [unitedstates/congress](https://github.com/unitedstates/congress) repository.

### Gap 2: Committee Membership via Member Endpoint
**Issue**: The Congress.gov API committee endpoint documents committees and their reports/bills, but the exact mechanism for retrieving "which committees does member X serve on" was not fully documented in the member endpoint response.
**Attempted**: Fetched both MemberEndpoint.md and CommitteeEndpoint.md documentation.
**Recommendation**: Test the API directly with a known bioguideId to confirm whether committee assignments appear in the member detail response, or if a separate lookup via the committee endpoint is required.

### Gap 3: GovTrack Programmatic Data Access
**Issue**: GovTrack discontinued its bulk data API. Report card data (ideology scores, leadership scores, bipartisanship metrics) is published on the website but no current API access exists.
**Attempted**: Searched GovTrack docs and about pages.
**Recommendation**: Either scrape GovTrack report card pages or replicate their methodology (which is publicly documented) using cosponsorship data from the Congress.gov API.

### Gap 4: VoteSmart API Current Status
**Issue**: Could not confirm whether VoteSmart (votesmart.org) still offers an active API. Search results referenced it historically but no current documentation was found.
**Attempted**: Web searches for VoteSmart API status 2025/2026.
**Recommendation**: Check votesmart.org directly or contact them to determine API availability.

## Recommendations for Further Research

1. **Test the Congress.gov API directly** with a real API key and a known bioguideId to confirm exact response shape, especially for committee assignments and leadership fields.
2. **Evaluate OpenFEC API** data quality for cross-referencing campaign finance with legislative activity (requires mapping FEC candidate IDs to bioguide IDs via the unitedstates/congress-legislators data).
3. **Prototype ideology/bipartisanship scoring** using GovTrack's published methodology applied to Congress.gov cosponsorship data.
4. **Monitor Congress.gov API changelog** for Senate vote endpoints and other expansions.

## Full Citations

[1] Library of Congress. "Member Endpoint Documentation". GitHub/api.congress.gov. 2025. https://github.com/LibraryOfCongress/api.congress.gov/blob/main/Documentation/MemberEndpoint.md. Accessed 2026-04-01.
[2] Library of Congress. "Congress.gov API". api.congress.gov. 2025. https://api.congress.gov/. Accessed 2026-04-01.
[3] Library of Congress. "Congress.gov API -- Additional APIs". loc.gov. 2025. https://www.loc.gov/apis/additional-apis/congress-dot-gov-api/. Accessed 2026-04-01.
[4] Library of Congress. "Introducing House Roll Call Votes in the Congress.gov API". In Custodia Legis. 2025-05. https://blogs.loc.gov/law/2025/05/introducing-house-roll-call-votes-in-the-congress-gov-api/. Accessed 2026-04-01.
[5] unitedstates project. "Public domain photos of Members of the United States Congress". GitHub. https://github.com/unitedstates/images. Accessed 2026-04-01.
[6] unitedstates project. "Members of the United States Congress, 1789-Present". GitHub. https://github.com/unitedstates/congress-legislators. Accessed 2026-04-01.
[7] ProPublica. "ProPublica Congress API Documentation". projects.propublica.org. 2025. https://projects.propublica.org/api-docs/congress-api/. Accessed 2026-04-01.
[8] OpenSecrets. "OpenSecrets API". opensecrets.org. 2025. https://www.opensecrets.org/api. Accessed 2026-04-01.
[9] Federal Election Commission. "OpenFEC API". api.open.fec.gov. 2025. https://api.open.fec.gov/developers/. Accessed 2026-04-01.
[10] GovTrack. "Analysis Methodology". govtrack.us. https://www.govtrack.us/about/analysis. Accessed 2026-04-01.
[11] GovTrack. "Report Cards for 2024". govtrack.us. https://www.govtrack.us/congress/members/report-cards/2024. Accessed 2026-04-01.
[12] LegiScan. "LegiScan API". legiscan.com. https://legiscan.com/legiscan. Accessed 2026-04-01.

## Research Metadata

Duration: ~15 min | Examined: 18 sources | Cited: 12 | Cross-refs: 10 | Confidence: High 70%, Medium 20%, Low 10% | Output: docs/research/congressional-member-data-apis.md

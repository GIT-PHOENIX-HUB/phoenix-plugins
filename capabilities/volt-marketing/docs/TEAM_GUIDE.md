# Phoenix Electric Marketing — Team Guide

**For:** Stephanie and Ash
**From:** Shane
**Date:** March 23, 2026

---

## What's Happening

We're building an automated marketing system for Phoenix Electric based on the campaign plan Volt put together. The plan is solid, but it assumes we have a marketing department — we don't. So we're splitting the work into two lanes:

**Your lane (Human):** Research, decisions, content, vendor relationships, and platform management that requires a real person.

**Our lane (Code):** Automation that monitors campaigns, generates reports, manages posts, tracks calls, and alerts on weather events — so you're not spending 2+ hours a week staring at dashboards.

The goal: you do the thinking and the relationships. The system does the repetitive monitoring and reporting. Shane oversees both lanes and approves anything that involves money.

---

## How We Communicate

We set up a private GitHub repository called **phoenix-marketing**. This is where your research goes, decisions get logged, and the code team builds automation.

**Why GitHub instead of email/text/Slack:**
- Everything is version-controlled — we can see what was decided, when, and why
- The AI agents (Echo and Codex) can read your research directly and build accordingly — no game of telephone through Shane
- Nothing gets lost in a text thread or buried in an email chain

**What you need to do:**
1. Install **GitHub Desktop** (free) — this is a simple app, not a command line
2. Stephanie: accept the collaborator invite that was sent to your GitHub account (Stephanie7777777)
3. Ash: Shane will send your invite once we have your GitHub username
4. Clone the phoenix-marketing repo in GitHub Desktop
5. When you have findings to share, create or edit a markdown file in the `research/` folder, then commit and push

**If you've never used GitHub Desktop:** It's basically like Google Docs with a save button. You edit files on your computer, then click "Commit" and "Push" to share them. That's it. We can walk you through it the first time.

---

## Stephanie's Tasks

### Task 1: Google Business Profile Audit
**File:** `research/gbp-audit.md` (already created, fill it in)
**Priority:** Start immediately — this is the fastest win
**Time:** 1-2 hours

**What to do:**
1. Log into Google Business Profile (business.google.com) with the account that owns our Phoenix Electric listing
2. Check every field and note what's current vs what needs updating:
   - Business name, address, phone number — correct?
   - Business hours — do they match what we actually answer?
   - Service area — does it cover our actual service territory?
   - Categories — we should have at minimum: Electrician, Electrical Installation Service, Generator Installation Service. Check what's there and note what's missing
3. Look at our photos — do we have at least 5-10 recent job photos? If not, note that we need to add some. Good photos: panel upgrades, generator installs, before/after work, the truck, the team
4. Check reviews:
   - Are there any unanswered reviews? (Positive or negative)
   - Note how many total reviews we have and our current rating
   - If there are unanswered ones, draft quick responses (the AI can help with this later, but we need to know the current state first)
5. **Critical:** Write down the Google account email address that has OWNER access to this listing. We need this for automation later.

**Put your findings in** `research/gbp-audit.md` — the template is already there with checkboxes.

**What you get back from us:** Once this audit is done, we'll build automated GBP posting. You'll review and approve a library of post templates (seasonal promos, service highlights, storm response), and then the system posts on schedule without you touching it. You'll also get draft review responses that you just approve or edit before they go live.

---

### Task 2: Generac Co-Op Fund Research
**File:** `research/generac-coop-program.md` (already created, fill it in)
**Priority:** Start immediately — this is potentially free money
**Time:** 1-2 phone calls + follow-up

**What to do:**
1. Find our Generac Regional Sales Manager (RSM). If you don't have their direct contact:
   - Check any existing Generac correspondence or portal access
   - Call Generac dealer support and ask to be connected to your territory's RSM
   - Our territory: Colorado Springs / El Paso County
2. When you reach the RSM, ask these specific questions:
   - "Do we have co-op advertising funds available? What's our current balance?"
   - "What types of advertising qualify for reimbursement?" (Specifically ask about: Google Ads, Facebook ads, landing pages, print materials, vehicle wraps, direct mail)
   - "What's the reimbursement process? What proof do you need?" (Screenshots of ads? Invoices? Both?)
   - "Are there quarterly deadlines? Is this use-it-or-lose-it?"
   - "Do you have any marketing assets we can use?" (Logos, approved copy, landing page templates, lifestyle photos)
   - "Is there a co-op portal we should be logging into?"
3. Write down everything. Names, phone numbers, deadlines, dollar amounts.
4. If they send follow-up materials by email, save any documents and note what they sent.

**Put your findings in** `research/generac-coop-program.md`

**What you get back from us:** If co-op funds are available, we'll build the generator landing page using any Generac assets they provide, and structure our ad campaigns so the receipts qualify for reimbursement. The system will track spend in a format that matches their reimbursement requirements. You'll just need to submit the paperwork monthly (we'll generate the reports for you).

---

### Task 3: Facebook vs Nextdoor — Conversion History
**File:** `research/conversion-history.md` (already created, fill it in)
**Priority:** This week — needed before we commit ad budget to either platform
**Time:** 1 hour

**What to do:**
1. Go through the last 12 months of jobs in Service Fusion
2. For Facebook:
   - How many paying jobs can you trace back to a Facebook ad or Facebook lead?
   - Not "people who liked our page" — actual booked, paying jobs
   - Note the approximate revenue from those jobs if you can
3. For Nextdoor:
   - Same thing — how many paying jobs came from Nextdoor?
   - Include both organic (someone saw our profile/recommendations) and paid (Nextdoor ads)
   - Note the approximate revenue
4. If you have data from further back, include it, but 12 months is the minimum
5. At the bottom, write your honest recommendation:
   - Should we put money into Facebook ads? Or is it not worth it for us?
   - Should we prioritize Nextdoor instead?
   - Should we drop Facebook entirely and reallocate that budget?

**Why this matters:** Volt's plan puts a lot of weight on Facebook. Our real-world experience says Nextdoor converts way better. We need actual numbers before we tell Volt to adjust the plan. Your data is what drives this decision.

**Put your findings in** `research/conversion-history.md` — there's a table template ready.

**What you get back from us:** We'll take your recommendation to Volt and get the plan adjusted. If Nextdoor wins (which we expect), we'll shift budget and attention there. The system can't automate Nextdoor campaigns (no API for that), but it CAN track performance and generate reports so you know what's working.

---

### Task 4: GBP Post Template Review (Week 2)
**Time:** 30-45 minutes
**Depends on:** Task 1 being done first

**What to do:**
Echo will create 10-15 draft post templates for Google Business Profile. These are pre-written posts in categories like:
- Seasonal (summer AC load warnings, winter generator prep)
- Service highlights (panel upgrades, EV chargers, surge protection)
- Generator-specific (Generac dealer, backup power benefits)
- Storm response (damage assessment, emergency service availability)

You review them and:
1. Fix anything that doesn't sound like Phoenix Electric
2. Flag any claims we shouldn't make
3. Add details we'd want included (specific service areas, phone numbers, etc.)
4. Approve the ones that are good to go

These approved templates become the library that the system uses for automated posting. You control what goes out — the system just handles the scheduling and publishing.

---

### Task 5: Landing Page Content (Week 2)
**Time:** 1-2 hours
**Depends on:** Task 2 (Generac assets)

**What to do:**
We're building a landing page specifically for generator services. This is where ad traffic lands. You provide the content, we build the page.

What we need from you:
1. **Why Phoenix Electric for generators?** — 3-5 bullet points on why someone should choose us. What makes us different from other Generac dealers?
2. **Customer testimonials** — Do we have any happy generator customers? Even informal quotes from texts/emails work. If not, note which customers we could ask.
3. **Job photos** — Our best generator installation photos. Before/after if we have them.
4. **Service area specifics** — Which areas do we cover? Any areas we emphasize?
5. **Call to action** — When someone's ready, should they call? Fill out a form? Both? What phone number?
6. **Any Generac assets** from Task 2 — approved logos, copy, images they provide

Commit these to `research/` and we'll build the page.

**What you get back from us:** A fully built, deployed landing page that you review and approve. This is what Google Ads and any generator-specific campaigns will point to.

---

### Task 6: Weekly Review (Ongoing — starting Week 4)
**Time:** 30 minutes every Monday
**Depends on:** Automation being live

**What to do:**
Once the system is running, you'll have a simple weekly routine:
1. Run the marketing report command (or ask Echo to run it for you)
2. Review the numbers:
   - How much did we spend this week?
   - How many leads came in?
   - Which campaigns performed best/worst?
   - Any missed calls that need follow-up?
3. Approve or edit any pending GBP review responses
4. Note anything that feels off — costs too high, lead quality dropping, unexpected patterns
5. If we're running LSA (Local Services Ads): review leads from the week, dispute any invalid ones (wrong service area, spam, not electrical) within Google's system

**What you get back from us:** The report is generated automatically — you just read it and make decisions. No logging into 4 different dashboards. One report, one review, 30 minutes.

---

### Task 7: Generac Co-Op Reimbursement (Monthly — starting when ads are live)
**Time:** 1 hour per month
**Depends on:** Task 2 findings + active ad campaigns

**What to do:**
If Generac co-op funds are available (from Task 2):
1. The system generates a monthly ad spend report formatted for Generac's requirements
2. You review it for accuracy
3. Submit to Generac through whatever process the RSM described
4. Track reimbursement status

This is free money coming back. The system does the bookkeeping. You do the submission.

---

## Ash's Tasks

### Task A1: Google Ads Account Bootstrap (Immediate — 30 minutes)
**What to do:**
1. Go to ads.google.com and create a Google Ads account for Phoenix Electric
2. **DO NOT add billing info yet** — we just need the account to exist so you can access Keyword Planner
3. **DO NOT create any campaigns** — account only
4. Confirm you can access Keyword Planner (Tools > Keyword Planner in the dashboard)

That's it for now. This just unlocks the research tool.

### Task A2: Market Research Deep Dive (Week 1 — 3-4 hours)
**File:** `research/google-ads-market-data.md` (already created, fill it in)

**What to do:**
1. **Keyword Planner research** (in the Google Ads account from Task A1):
   - Search for "electrician colorado springs" — note the estimated CPC (cost per click) range
   - Search for our top 10 service keywords: electrician, electrical repair, panel upgrade, generator installation, EV charger installation, electrical inspection, lighting installation, whole house surge protector, emergency electrician, residential electrician — note CPC for each
   - Look at "competition" level (Low/Medium/High) for each keyword
   - Note the "top of page bid" estimates — that's what we'd actually pay

2. **Competitor research** (Google Ads Transparency Center — just Google "Google Ads Transparency Center"):
   - Search for competitors in our area: who's running Google Ads?
   - Note their ad copy — what are they saying?
   - How many ads do they have running?
   - Note which competitors show up in LSA (the map/guaranteed section at the top of Google)

3. **SpyFu free tier** (spyfu.com — you can see limited data for free):
   - Search for a competitor's domain
   - Note estimated monthly ad spend, number of keywords, top keywords
   - This gives you a rough sense of what the market looks like

4. **LSA research:**
   - Google "electrician near me" from a Colorado Springs location
   - Screenshot the LSA results (the "Google Guaranteed" section)
   - Note how many electricians are in LSA
   - If you can find any contractors willing to share their LSA cost per lead, note that (contractor forums, Facebook groups, etc.)

5. **Your recommendation:**
   - Based on the CPCs, competition, and our budget — is Google Ads worth it?
   - What would a realistic monthly budget be to get meaningful leads?
   - Should we start with LSA only, regular Google Ads only, or both?

**Put everything in** `research/google-ads-market-data.md`

**What you get back from us:** Real data to make the spending decision. No guessing. Shane reviews your findings and decides GO/NO-GO before a single dollar is committed.

### Task A3: Google Ads Full Setup (After Shane approves — 1-2 hours)
**Only after Shane says GO based on your research.**
1. Add billing information to the Google Ads account
2. Apply for a developer token (we'll give you exact instructions — it's a form in the account settings)
3. Create OAuth credentials in Google Cloud Console (we'll walk you through this step by step)
4. Share the credentials with Shane (NOT in GitHub — Shane will put them in our secure vault)

### Task A4: First Campaign Launch (Week 4 — 2-3 hours)
**Only after the automation tools are built and tested.**
We'll provide exact instructions for this when the time comes. You'll create the first campaign in Google Ads based on your research, pointing to the landing page we built.

---

## What You Can Expect From Us

| What | When | Details |
|------|------|---------|
| GBP post templates for review | Week 2 | 10-15 draft posts in categories you approve |
| Generator landing page draft | Week 2-3 | Built from your content (Task 5), you approve before it goes live |
| Automated GBP posting | Week 3 | Posts on schedule using your approved templates |
| Review response drafts | Week 3 | AI drafts responses to Google reviews, you approve before they publish |
| Weekly marketing report | Week 4 | One report covering all platforms — spend, leads, performance |
| Google Ads monitoring | Week 4+ | Automated budget tracking, alerts if spend runs hot, performance reports |
| Storm alert automation | Week 5+ | System detects severe weather, proposes campaign adjustments, waits for approval before acting |
| Call tracking reports | Week 3+ | Which campaign generated which phone call (if we set up CallRail) |

**The rule:** No money moves without Shane's approval. The system monitors, reports, and proposes. Humans make spending decisions.

---

## Timeline at a Glance

| Week | Your Focus | Our Focus |
|------|-----------|-----------|
| **Week 1** | GBP audit, Generac RSM call, FB vs Nextdoor data, Google Ads research | Repo setup, GBP post templates, API research |
| **Week 2** | Review post templates, provide landing page content | Build GBP automation, landing page |
| **Week 3** | Review landing page, approve templates | Build call tracking, campaign monitoring |
| **Week 4+** | Weekly 30-min reviews, monthly co-op submissions | Build weather alerts, reporting dashboard |

---

## Questions?

If something in this guide doesn't make sense, ask Shane. If you hit a wall on any task, note where you got stuck in the research file and commit what you have — partial progress is better than waiting. We can adjust.

The research templates in GitHub have checkboxes for every deliverable. Check them off as you go. If a task takes longer than estimated, that's fine — accuracy matters more than speed.

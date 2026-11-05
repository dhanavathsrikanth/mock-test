# Our Platform Enhancement and Monetisation Strategy

*Planning document · 4 November 2026*

> **Current execution scope:** we will enhance and validate the free platform first. The monetisation proposals below remain background ideas; they are not implementation instructions for this phase. See [Our Free Platform Enhancement Execution Plan](PLATFORM_EXECUTION_PLAN.md) for the reconciled development order and to-do backlog. Premium access and payments will be planned separately later.

## Our starting point

We have built a substantial foundation for an exam-preparation platform. Our implementation includes MCQ, MSQ, and NAT question types, timed practice, result analysis, bookmarks, spaced-repetition revision, and detailed performance analytics. We also have administrative workflows for importing questions, managing content, and investigating student reports.

Our next priority is to turn these capabilities into a dependable study experience that students return to and are willing to pay for. We will focus on verified content, a clear revision journey, and evidence from real student usage.

This document describes our proposed enhancements and business experiments. It does not claim that proposed features, pricing, content coverage, or commercial permissions are already in place.

## Part 1: Our go-to-market and product enhancement strategy

### 1. We will launch with a focused, verified question bank

We will build our launch around one or two flagship streams. Computer Science and Civil Engineering are candidates, but we will choose them only after checking our actual coverage, content quality, and student demand.

Our initial content ambition is complete coverage for a clearly defined period, potentially 2015–2026. That period is a target to assess, not a description of our current database.

Before we call a paper complete, we will verify its question count, source numbering, answer keys, marking rules, diagrams, explanations, and subject classifications. We will also record the rights basis for publishing its content.

For each stream, we will publish the exact years and papers available. Where content is incomplete, we will show what is available and what is still being prepared. We will announce release dates only when we can support them with a credible content schedule.

**Our intended outcome:** students can trust the coverage we advertise and find usable practice immediately after selecting a stream.

### 2. We will make structured revision our central product promise

Our spaced-repetition system gives us a useful positioning opportunity: helping students return to mistakes instead of losing them in a completed-test history.

We will position the platform as a **GATE practice and revision companion**, with the option to test the phrase **Intelligent GATE Revision Engine** in our marketing.

Our messaging will describe what the product actually does:

> We help you practise previous-year questions, understand your mistakes, and revisit questions when they are due for revision.

We will avoid claiming that our algorithm knows exactly what a student has forgotten. Our revision schedule uses recorded attempts and review feedback; we still need to validate how well it supports learning.

To strengthen this experience, we will make revision more prominent on the dashboard, explain why a question is due, and provide a clear next action after each test. We will also distinguish a failed revision-data request from a genuinely empty queue.

**Our intended outcome:** students understand why they should return after finishing a test.

### 3. We will improve the test experience around actual study conditions

We will assess whether we already provide a suitable scientific calculator and, if needed, add an accessible on-screen calculator to the test interface. Before presenting it as an exam simulation, we will verify its behaviour against the current official calculator experience. We will review any permissions needed before copying interface assets or branding.

We will evaluate a scratchpad or expandable working area for calculations. We will prototype it with students before committing to a complex drawing interface, particularly on small screens.

Our initial device strategy will be:

- **Laptop and desktop:** full-paper attempts, longer practice sessions, and detailed review.
- **Mobile web:** daily questions, shorter practice, bookmarks, and revision.

This is a working assumption to validate through usage data and student interviews. We will keep core workflows responsive on both device types.

**Our intended outcome:** our interface supports the way students solve engineering questions, including the need for calculations and written working.

### 4. We will establish content rights and explanation quality

We source much of our GATE question material from official downloadable papers and answer keys. We will not describe those papers as public domain or commercially licensed without evidence.

The [official GATE 2027 download page](https://gate2027.iitm.ac.in/download) provides papers and keys, but our review did not identify an explicit commercial reuse licence. Its footer includes an “All Rights Reserved” notice; that general notice does not establish ownership of every historical paper.

Indian copyright law contains educational and examination exceptions, but we will obtain advice on whether they apply to our specific implementation. We will not assume that keeping questions free, charging for analytics, accepting donations, or adding attribution resolves the underlying reproduction issue. See [Copyright Act, sections 51–52](https://www.copyright.gov.in/Copyright_Act_1957/chapter_xi.html).

Our content workflow will therefore include:

- A source and rights record for each imported batch, including question text and diagrams.
- Written clarification from the relevant rights holder, or a legal assessment of the applicable basis for reuse.
- Investigation of older datasets whose provenance is unclear.
- Independently written explanations, with technical review and documented contributor agreements.
- A correction process for inaccurate answers, unclear solutions, and display problems.

Where we commission solutions from subject experts or GATE rankers, we will require original work, agreed usage rights, and review against a consistent editorial standard.

If PYQ permissions remain unresolved, we can develop original or licensed mock content, or offer study tools that link to official papers without reproducing their questions.

**Our intended outcome:** we can explain both where our content came from and the basis on which we distribute it.

## Part 2: Our proposed monetisation model

### 1. We will test a simple freemium offering

Our preferred starting experiment is a useful free tier and one paid plan for a selected stream. The following allocation is provisional and depends on content rights, verified coverage, implementation work, and student feedback.

| Free tier: our entry experience | Premium tier: our proposed paid value |
| --- | --- |
| A clearly defined selection of PYQ practice, subject to reuse clearance | A broader verified archive, subject to reuse clearance |
| Daily question and basic streak tracking | Unlimited subject-wise, topic-wise, and custom practice |
| MCQ, MSQ, and NAT answer formats | Automated revision scheduling and progress tracking |
| Core results, including marks and deductions | Detailed performance trends and time-versus-performance analysis |
| Basic bookmarks and an explanation preview | Full original worked explanations and proposed bookmark folders |

We may test the latest three available years as the free selection and a 10–15-year archive as a future premium offer. We will advertise these ranges only after the content is complete, verified, and cleared for our intended use.

Some features in this table already exist in the application. Paid entitlements, usage limits, bookmark folders, and the final tier boundaries would require further implementation or verification.

### 2. We will charge for a clear improvement to the study workflow

Our paid proposition will focus on original explanations, convenient test creation, detailed progress tracking, and structured revision. We want students to understand what the payment helps them accomplish.

Where we are authorised to reproduce them, we can keep selected papers and standard keys freely accessible. We will treat pricing and content permissions as separate decisions: a value-added paywall does not itself clear rights to the underlying material.

### 3. We will test stream-specific pricing

We will explore a single-stream annual pass so students can purchase preparation relevant to their exam paper. A **₹499–₹999 annual range** is a pricing hypothesis from this plan, not an established market benchmark or a final price.

We will test willingness to pay through a small, clearly described paid pilot. We will measure purchases, repeat usage, support requests, and the cost of maintaining the content before expanding the offer.

We will state the access period, included features, content coverage, and refund terms clearly before purchase.

### 4. We will test a shorter revision pass

We will explore a limited-duration **Crash Revision Pass** in the months before the examination. October–January is an initial campaign window to test against the official exam calendar and our own usage data, rather than a verified claim about peak demand.

The offer could combine due revision, focused practice, original explanations, and progress summaries. We will give it a clear expiry date and avoid implying guaranteed marks or ranks.

### 5. We will keep alternative revenue paths available

If an integrated paid PYQ offering is not viable, we will evaluate:

- **Study-companion subscriptions:** planning, timers, and progress tracking alongside links to official papers.
- **Original mock-test packs:** independently authored or commercially licensed questions and solutions.
- **Software for tutors:** test creation and student analytics using content the tutor has the rights to supply.

Each route needs its own implementation and rights review. None removes every legal obligation automatically.

## Part 3: Our immediate execution priorities

| Priority | Our action | Evidence we need before moving forward |
| --- | --- | --- |
| 1 | Audit stream and paper coverage | A paper-level inventory showing verified, incomplete, and unavailable content |
| 2 | Resolve content provenance and rights | Documented source records and an assessed basis for the intended reuse |
| 3 | Select our flagship stream or streams | Sufficient verified coverage and evidence of student demand |
| 4 | Validate the complete student journey | Successful onboarding, test creation, saving, submission, review, and revision on target devices |
| 5 | Improve the revision experience | Clear due states, useful next actions, and accurate failure messages |
| 6 | Run a student pilot | Completed sessions, repeat usage, and actionable feedback |
| 7 | Implement and test paid access | Verified payments, correct entitlements, expiry handling, and clear purchase terms |
| 8 | Expand content and marketing | Evidence that students use, value, and purchase the initial offer |

## Decisions we still need to make

- Which one or two streams have the strongest verified question coverage and clearest student demand?
- What exact years and papers can we responsibly promise at launch?
- Will our first users primarily take full papers on laptops, or do we need to prioritise mobile practice?
- Which features will students pay for after experiencing the free product?
- What rights basis will cover each content category in our final offering?

We will use these decisions to define a focused launch scope, an achievable content schedule, and a paid pilot we can evaluate with real evidence.

---

# Second Part: Our Mobile-First Launch Roadmap for 2021–2026

## Our updated planning scope

We will develop this roadmap around six years of papers, **2021–2026**, across five target branches: **Computer Science (CS/CSE), Civil (CE), Mechanical (ME), Electrical (EE), and Electronics and Communication (EC)**.

For this roadmap, complete coverage across those branches is a planning premise supplied for the strategy, not a fresh audit of the live database. Before launch, we will verify every expected paper and shift, question count, key, diagram, explanation, and rights record. Six years of coverage does not mean only six papers per branch: some years include multiple sessions.

If our audit confirms that coverage, we will have a focused catalogue suitable for testing a commercial offer. We will still need evidence of demand and willingness to pay before calling the business commercially viable.

This second part refines the earlier strategy. **Mobile web becomes our primary product surface, with full desktop support.** The ₹199–₹299 exam-cycle pass below becomes our initial pricing experiment; the earlier ₹499–₹999 annual range remains an alternative for a broader future offer. Neither price is a commitment.

## 1. Our mobile-web product enhancements

### We will introduce short, focused practice sessions

We will give students a useful way to practise during short breaks, while travelling when practical, or between longer study sessions. Our mobile home screen will prioritise **Continue practice**, **Revise due questions**, and **Start a quick topic test**.

We will prototype 5-question and 10-question sessions, with optional time budgets such as 15 or 30 minutes. Timing will remain adjustable because question difficulty and calculation requirements vary. Our current question-count selector starts at 10, so a 5-question mode requires implementation.

We will keep full-paper tests available on mobile, while recommending a larger screen and uninterrupted study time for longer sessions. We will not require a desktop merely to access a full paper.

We will measure whether shorter sessions lead to completed practice and later revision, rather than assuming that more sessions always mean better learning.

### We will make calculator access work on a small screen

We will assess our existing calculator support and build or integrate a suitable scientific calculator where needed. Our target is functional familiarity with the current official GATE calculator, subject to verification and any relevant reuse permissions.

On mobile, we will test a resizable panel or bottom sheet that lets students refer to the question while calculating. We will check touch-target sizes, keyboard interactions, screen rotation, and whether the calculator obscures answer controls.

We will avoid describing it as an official calculator or copying protected branding without authorisation. Any claim of equivalence will require a documented comparison of functions and behaviour.

### We will improve equations, diagrams, and answer entry

Our app already uses KaTeX for mathematical notation. We will extend the existing narrow-screen handling and verify long equations, matrices, matching tables, circuit diagrams, and image-based choices on common phone sizes.

Our proposed improvements include:

- Tap-to-expand diagrams with zoom and a clear way to return to the question.
- Horizontal scrolling inside oversized equation blocks, without making the entire page overflow.
- Clear MSQ selection states and instructions.
- Reliable numerical input for decimals and negative values where relevant.
- Answer controls that remain reachable when the mobile keyboard is open.
- Visible saving and recovery feedback when the connection is unreliable.

We will also evaluate load time and image sizes on slower connections. Offline testing is not an existing promise; we will assess it separately before advertising it.

## 2. Our positioning and student acquisition strategy

### We will market a focused recent-paper archive accurately

We can test **“Modern GATE practice: 2021–2026”** as an editorial positioning theme. The [official IIT Bombay announcement for GATE 2021](https://www.esed.iitb.ac.in/sites/www.esed.iitb.ac.in/files/2020-09/GATE-2021.pdf) records revised syllabi and a question pattern including MCQ, MSQ, and NAT formats.

However, the [official GATE 2027 syllabus page](https://gate2027.iitm.ac.in/exam_papers_and_syllabus) states that syllabi have been revised again. We will map our archive to the current syllabus and identify gaps instead of claiming that all 2021–2026 content is automatically “100% pattern-aligned.” Older questions may also remain useful; their age alone does not make them irrelevant.

Our proposed headline is:

> **Practise GATE papers from 2021–2026. Turn mistakes into a focused revision routine.**

We will publish exact coverage by branch, year, and paper. We will distinguish recent-paper practice from complete preparation for every topic in the current syllabus.

### We will make daily questions easy to discover and share

We will develop shareable daily-question links and, where rights permit, original question graphics or previews. A shared link should open the relevant question or preview directly on mobile, retain its context through sign-in, and let the student continue into practice or revision.

We will test distribution through our own WhatsApp channels, Telegram channels, tutors, campus groups, and communities whose administrators permit relevant posts. We will avoid unsolicited bulk messages and misleading claims of affiliation with IITs or GATE.

The admin dashboard does not currently establish that share-card generation or messaging integrations exist. We will treat these as proposed enhancements, starting with ordinary share links before investing in automated publishing.

We will measure the journey from shared link to first completed question, account creation, first completed test, and a return visit. We will use those results to choose acquisition channels.

## 3. Our proposed low-cost branch pass

We will test a simple offer for students who want recent-paper practice and structured revision. Our initial experiment is a **₹199–₹299 one-time payment per branch for a clearly defined exam cycle**.

This price is a hypothesis. We will assess conversion, content-maintenance costs, payment costs, support effort, and refunds before deciding whether it is sustainable. We will show an exact access-expiry date at checkout instead of relying on the ambiguous phrase “until the next exam.”

| Tier | Our proposed access | Our pricing experiment |
| --- | --- | --- |
| Free | Verified 2021–2023 papers, daily question, basic streaks, and core results | ₹0 |
| Premium Branch Pass | Verified 2024–2026 papers, full revision workflow, detailed subject/topic performance tracking, and original worked explanations | ₹199–₹299 once per branch, with a stated expiry date |

**All reproduced question content in either tier remains subject to an established reuse basis.** The years in this table are proposed packaging, not a claim that we have commercial permission or have verified every paper.

### We will test the value students experience before asking them to pay

We will provide a useful free experience and a clear preview of premium explanations, analytics, and revision. We will test an alternative in which a recent paper remains available as a sample while premium access adds convenience and learning tools.

We will not assume that locking the newest questions or answers is the strongest offer. If recent official papers and keys are available elsewhere, students must be able to see why our explanations and workflow justify the price.

A lower price may reduce purchase hesitation, but we will not assume that every college student considers it affordable or that purchases will be impulsive. We will validate the offer through real purchases and feedback.

Keeping raw papers free while charging for revision is also an option, but it does not independently resolve copyright permission for the material we reproduce. The rights principles in the first part continue to apply.

## 4. Our existing explanation, authentication, and analytics foundation

We already have documented worked text explanations for imported papers. We will audit their completeness and depth across the five-branch, six-year scope before claiming that every question has a detailed step-by-step solution. We have not established a complete video-explanation library, so video will not form part of our initial promise.

Our login code uses **Supabase Auth**, with **Google sign-in** and **email/password sign-in** implemented. We will verify the deployed provider configuration and the sign-in journey on mobile before launch.

Our app includes **Vercel Analytics** for website analytics, alongside application database records and routes used for test performance, XP, and streaks. Authentication identifies the student; it does not calculate the streak. Our application logic and saved activity supply that behaviour.

We will define any additional acquisition and purchase events we need, check that they are recorded reliably, and avoid treating the presence of an analytics library as evidence that a complete conversion funnel is already measured.

## 5. Our launch sequence and success measures

1. **Confirm our catalogue:** audit every target branch, year, and paper; review explanation quality and content rights.
2. **Prepare mobile practice:** add short-session options, verify answer saving and numerical input, and improve diagram viewing.
3. **Strengthen revision:** make due questions easy to find and handle loading failures honestly.
4. **Recruit a small pilot:** test the complete journey with students from the intended branches and device mix.
5. **Test the branch pass:** implement server-verified payment confirmation, entitlements, expiry handling, and clear purchase terms before accepting payments.
6. **Expand acquisition carefully:** use the channels that produce returning students and sustainable paid demand.

We will track first-session completion, return usage after seven days, revision completion, paid conversion, refunds, and reported content errors. We will set numerical targets after gathering an initial baseline, and we will not present engagement alone as proof of improved exam performance.

## Our remaining decisions

- What does our paper-level audit confirm about complete 2021–2026 coverage across CS, CE, ME, EE, and EC?
- Which papers still need deeper worked explanations or corrections?
- Which current-syllabus topics are absent from our recent-paper archive?
- Which free sample gives students enough evidence to judge the paid offer?
- What exact expiry date and features will our first branch pass include?
- What do pilot students actually complete on mobile, and when do they switch to desktop?

We will use the answers to turn this roadmap into an implementation backlog and a paid pilot with a defined scope.

---

# Third Part: Our Execution Plan for Mobile Experience, Paid Access, and Growth

*Adapted from Response A into our platform's planning voice.*

## Our execution premise

We already have Google sign-in implemented alongside email/password authentication. We expect Google sign-in to reduce typing on mobile, but we will measure actual sign-in completion and verify provider configuration before making conversion claims.

Our independently authored, technically reviewed explanations can become valuable content assets where we hold the necessary rights. We will verify contributor agreements and originality before describing them as proprietary. Ownership of an explanation does not automatically authorise reproduction of the underlying question or diagram.

The coverage and rights checks in the earlier parts remain prerequisites for the proposed offer below. This section turns that strategy into specific product and launch work; it does not represent completed implementation.

## 1. Our mobile-web experience

### We will optimise technical text for stable, readable rendering

Our application uses KaTeX rather than MathJax. We will profile its existing rendering path before changing it. Asynchronous rendering alone does not prevent layout shifts and can introduce visible changes if content space is not reserved.

We will focus on stable equation containers, suitable font loading, cached or memoised rendering where useful, and predictable image dimensions. Where practical, we will evaluate rendering mathematical markup before it reaches the screen.

We will verify long equations, fractions, matrices, and explanations on small screens. Oversized content should scroll within its own region, while answer choices and navigation remain readable and reachable.

**Our acceptance criteria:** technical content fits or scrolls within its container, does not unexpectedly move answer controls, and remains legible without shrinking the entire page.

### We will provide a lightweight diagram viewer

We will assess the existing diagram experience and add any missing tap-to-expand behaviour. Circuit diagrams, stress–strain graphs, and flowcharts should open in a larger viewer with zoom, panning, and an obvious close control.

We will preserve source proportions, offer adequate image resolution, and restore the student's question position when the viewer closes. We will also check keyboard access and focus handling on desktop.

**Our acceptance criteria:** students can inspect small labels without losing their selected answer, test position, or access to the timer.

### We will strengthen session recovery around our existing backend

Our test client already attempts to save answers to Supabase as students respond. We will strengthen this with a recoverable local draft where needed, using browser storage appropriate to the data size and update frequency. We do not need to introduce Firestore solely for this feature.

Our proposed recovery design will:

- Save answer changes and the current question position locally, scoped to the authenticated account and test session.
- Show whether changes are saved remotely, pending synchronisation, or failed.
- Retry pending saves and reconcile local drafts with server records without silently overwriting newer answers.
- Preserve authoritative session timing and completed-test status on the server.
- Prevent an expired or submitted session from being reopened as an active test through a stale draft.
- Clear or isolate drafts when accounts change, and handle browser-storage failures explicitly.

We will test reloads, temporary disconnections, browser backgrounding, and returning after authentication expires. Browser storage can be cleared or unavailable, so we will promise tested recovery behaviour rather than guarantee that progress can never be lost. We will also verify that intentional navigation and automatic submission rules remain consistent with recovery.

## 2. Our paid-access experience

### We will test a single unlock rather than repeated purchase interruptions

We will offer one clearly described branch pass with a visible list of included features. We will avoid interrupting students with a new purchase prompt on every question.

| Access level | Our proposed inclusions | Price and duration |
| --- | --- | --- |
| Free | Verified 2021–2023 questions and original explanations; MCQ/MSQ/NAT practice; daily streaks and core results | ₹0 |
| Premium Branch Pass | Verified 2024–2026 practice and original step-by-step solutions; automated revision; subject/topic custom practice; detailed performance tracking | Test ₹199–₹299 per branch for a stated exam-cycle access period |

Our intended initial cycle is GATE 2027. “Valid until February 2027” is too imprecise for checkout copy: before selling the pass, we will set an exact expiry date, time, and timezone and explain whether post-exam review remains available.

All content access remains subject to the coverage and rights review described earlier. If that review changes what we can distribute, we will revise the offer before accepting payment.

### We will demonstrate value before requesting payment

We will use the free years to demonstrate explanation quality, readable questions, reliable saving, and useful results. We will provide a preview or limited trial of revision so students can judge its value before buying access.

Our hypothesis is that students who find the workflow useful may pay for expanded access. We will test this through purchases and repeat usage instead of assuming that reliance on the product guarantees conversion.

We will explain locked features clearly and preserve access to students' basic history. Payment handling will verify purchases on the server and apply the correct branch entitlement, expiry, and any refund-related changes.

## 3. Our growth and marketing experiments

### We will test question-led acquisition with truthful previews

We will create attractive, readable previews and direct links for selected practice questions where we have a basis to reproduce them. After sign-in, the student should return to the intended question rather than a generic dashboard. Any return destination must be validated by the application.

Our initial call to action can be simple:

> **Can you solve this GATE NAT question? Try it, check the solution, and save it for revision.**

We will use claims such as “84% answered incorrectly” only when supported by an adequate sample of recorded attempts. If we publish such a statistic, we will state the sample size and define what the percentage measures. We will not invent difficulty statistics or present our users as representative of all aspirants.

### We will position MSQ and NAT practice accurately

We can test **“Focused MSQ and NAT practice, with explanations and mistake revision”** as a campaign theme. We will explain answer formats and grading rules rather than make unsupported claims about a recent increase in MSQ frequency.

The [official GATE 2027 question-paper pattern](https://gate2027.iitm.ac.in/question_paper_pattern) states that MSQ and NAT questions have **no negative marking**, and that **MSQ questions have no partial marking**. We will ensure our copy, instructions, and grading reflect those rules. Historical questions will retain their verified source-specific marking data where applicable.

We will test relevant posts on LinkedIn, Telegram, and Reddit communities such as r/GATEtard, subject to each community's rules. We will disclose our connection to the app and share useful examples or product updates without unsolicited bulk posting.

Community acquisition requires time and effort even when advertising spend is low. We will compare channels by completed practice, return visits, and purchases before investing in larger campaigns.

### We will experiment with voluntary streak sharing

We will make study-streak cards easy to share without exposing email addresses, private answers, or other unnecessary account information. Students will choose whether to share and which service to use.

We may test a temporary premium preview, such as 24 hours of selected features, with clearly stated eligibility and expiry. We will avoid rewarding only the opening of a share dialog or claiming we can verify a WhatsApp status publication when the platform does not provide that evidence.

A milestone reward available after a genuine seven-day study streak is an alternative that avoids requiring public promotion. We will test whether either approach produces useful continued practice, and we will review applicable sharing-service rules before launch.

## 4. Our practical implementation order

| Stage | Our deliverable | Our completion check |
| --- | --- | --- |
| Mobile reliability | Stable technical content, usable diagram viewing, and tested session recovery | Students can complete and resume representative sessions on target devices |
| Offer readiness | Verified coverage, rights assessment, explanation review, and clear tier boundaries | Our public offer matches what we can deliver |
| Paid access | Checkout, server-verified payments, branch entitlements, and exact expiry rules | Successful, failed, duplicate, expired, and refunded payment cases behave correctly |
| Acquisition | Shareable previews and question-specific sign-in return paths | Shared links reach the intended content and preserve context |
| Pilot evaluation | A measured free-to-paid journey and student feedback | We can identify which features and channels produce returning, paying students |

We will implement these changes incrementally, retaining the earlier strategy as context while using pilot evidence to choose the next enhancement.

---

# Fourth Part: Our Tactical Launch Plan for a Seasonal Premium Pass

*Adapted from Response B into our platform's planning voice.*

## Our working advantage

Google sign-in and clear, step-by-step explanations give us a useful foundation for mobile study. We will use sign-in to reduce account-creation effort and make solutions easy to scan, revisit, and apply.

We will test whether students prefer our text explanations for particular tasks rather than assume text is always faster or more valuable than video. Our aim is to explain the method clearly, with readable equations, relevant diagrams, intermediate steps, and a final answer.

This part adds tactical experiments to the earlier roadmap. Our content verification, reuse assessment, mobile reliability work, and payment checks still apply before a paid launch.

## 1. Our mobile-web performance priorities

### We will load the useful content first

We will make question text, answer controls, and the first useful part of an explanation available promptly. We will defer below-the-fold diagrams, inactive charts, and other nonessential content where doing so improves measured performance.

We will not indiscriminately lazy-load every image or equation. A diagram needed to answer the current question must appear promptly, and delaying visible mathematics can interrupt reading. We will profile our existing KaTeX implementation, reserve content dimensions, and choose rendering boundaries based on the actual bottlenecks.

We will test representative circuit, numerical, and equation-heavy questions on constrained connections and typical student phones. We will measure loading, interaction responsiveness, and layout stability before and after changes, rather than advertise an “instant” experience without evidence.

### We will preserve the shared-question journey through sign-in

When a student opens a question link from WhatsApp, Telegram, or another source, we will retain its intended destination through authentication and any required exam or stream selection.

Our target journey is:

**Open shared link → preview the relevant content → sign in when needed → return to that question → answer and review.**

We will validate return destinations, handle unavailable or restricted questions clearly, and test the flow in common mobile browsers. If an embedded browser interferes with authentication, we will provide a clear route to continue in a supported browser.

We will describe this as a short sign-in flow, not guarantee that Google authentication always takes one tap. Account selection, consent, and session state can add steps.

## 2. Our seasonal Premium Pass experiment

### We will begin with one payment and a clear access period

We will initially test a **one-time seasonal branch pass at ₹199–₹299**, without automatic recurring billing. We will decide the final pilot price from feedback, costs, and observed purchases.

Our proposed label is **“Recent GATE Papers and Smart Revision Pass.”** We may test “Modern Pattern Tracker” as alternative copy, but we will explain the actual features and avoid implying complete alignment with every current-syllabus topic.

The pass will state the branch, included papers, features, exact expiry date, and refund terms before checkout. We will not imply that the price covers all five branches unless that is the offer we implement.

### We will keep the main tier structure consistent

The default proposal from the second and third parts remains our starting point:

| Free, signed-in access | Proposed Premium Branch Pass |
| --- | --- |
| Verified 2021–2023 questions and original worked explanations | Verified 2024–2026 papers and original worked explanations |
| Correct-answer displays suitable for MCQ, MSQ, and NAT | Full automated revision workflow |
| Basic marks, deductions, and results | Subject/topic custom practice and detailed performance tracking |
| Daily-question challenge and basic streak tracking | Time-versus-performance analytics and premium study tools |

Our correct-answer display will support multiple correct choices and numerical answers or accepted ranges where appropriate. We will not describe every answer key as a single A/B/C/D option.

### We will test a controlled preview of recent-paper solutions

The proposed conversion trigger requires a student to attempt a recent question before purchasing. That would conflict with a strict lock on all 2024–2026 access, so we will implement it only as a clearly defined sample or trial.

For example, a free student could attempt a selected 2024 question and see the correct answer, then encounter a premium explanation preview. We will keep this sample policy explicit and avoid suggesting that free users have unrestricted access to recent-paper tests.

Our purchase prompt could read:

> **Review the full derivation and schedule this question for revision. Unlock the [branch] pass for ₹199, with access until [exact expiry date].**

The price and expiry in the interface must match the actual offer. We will give students a clear way to continue without buying and will avoid repeated prompts during active tests.

We may use a short excerpt or a visual placeholder to preview the solution. If content is restricted, the server must enforce that restriction: sending the complete solution to the browser and applying a blur is not an access-control mechanism.

We will measure purchases, prompt dismissals, and subsequent study activity to assess whether this placement helps students understand the offer without disrupting review.

## 3. Our low-spend growth tactics

### We will present revision as a practical digital mistake book

We will explain the existing practice-to-revision connection in familiar terms:

> **Turn your PYQ mistakes into a revision queue you can return to on your phone.**

We will show what gets added, when it becomes due, and how review feedback affects later practice. We will avoid claiming that the app replaces every student's handwritten working or personal notes.

Our product demonstrations can follow one concrete journey: answer incorrectly, read the explanation, revisit the question later, and inspect the recorded progress.

### We will share useful worked examples in relevant communities

We will identify branch-specific student communities and seek permission where required before posting. Where content rights permit, we will share a readable worked example with a relevant practice link and disclose that we built the platform.

Our call to action can be:

> **Practise more from this paper and keep track of questions you want to revise.**

We will choose examples for their teaching value, verify their solutions, and avoid unsupported claims that a question is exceptionally difficult. Community marketing will have a staff-time cost even when it uses little advertising budget.

### We will use study milestones for relevant, optional reminders

Our application records, rather than Google Login alone, will identify five-day or seven-day study milestones. Authentication supplies account identity; our activity and streak logic supplies the study history.

We will respect the student's notification preferences and obtain any required consent before sending promotional email or push messages. Push delivery also requires browser permission. Students must be able to stop marketing messages without losing essential account access.

Our default milestone message can celebrate useful activity and offer a next action:

> **You have practised for seven days. Your next revision session is ready when you are.**

For students eligible to receive promotions, we may test a separate, limited-frequency offer for the relevant branch pass. We will avoid duplicate offers, exclude existing pass holders, and use genuine expiry dates.

We will advertise “30% off” only against a genuine, supportable reference price and show the actual amount payable. We will not manufacture a higher price, a countdown, or an “ends today” claim to create urgency.

We will evaluate reminder effectiveness through subsequent practice and purchases, alongside unsubscribes and complaints. Sending more notifications is not itself a success measure.

## 4. Our immediate delivery checklist

- [ ] Verify coverage, explanation quality, and the rights basis for the content included in the pilot.
- [ ] Measure mobile performance before choosing lazy-loading and rendering changes.
- [ ] Complete the shared-question return flow through sign-in and onboarding.
- [ ] Define the free sample policy and reconcile it with recent-paper restrictions.
- [ ] Choose one initial branch-pass price and an exact access-expiry date.
- [ ] Enforce premium access on the server and verify payment and entitlement handling.
- [ ] Prepare accurate worked examples and a digital mistake-book demonstration.
- [ ] Add milestone-based reminder rules that respect preferences and promotional eligibility.
- [ ] Review pilot completion, repeat usage, conversion, refunds, and content-error reports before expanding.

We will use this checklist to prepare a small, reviewable launch. We will expand the offer when we have evidence that students can use it reliably, understand its value, and choose to pay for it.

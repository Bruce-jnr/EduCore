# Sirbus public lesson-library investigation and EduPalGh adaptation

Investigated 28 October 2026 using the reverse-engineer-anything skill and REA capture_browser_scenario. All Sirbus actions were public navigation and waits in owned temporary headless Chrome profiles; cleanup reported terminated-owned-process. No sign-in, lesson creation, downloads behind authentication or other deliberate write actions were performed. Normal page scripts generated analytics traffic.

## Observed
- Public index https://sirbus.org/lesson-plans/ lists KG1/2, Basic1–9 and SHS1–3. Root evidence: ev_3a44d8aecf0ee2d4021152645cae7814240fa92fd5c2f3f4ad40faa05a8de307; DOM SHA-256 d8faa73d60231c012fdfffe854820b9987f894b78f425c48ff8ae8a18123c246.
- Basic1 class page links yearly scheme and three terms; term page lists subjects; Mathematics term1 lists 12 weeks. Navigation evidence ev_afff9b9b263a1656f0960ed813b557da89a332eb114a792150a82b563373e522. Snapshots immediately after clicks sometimes retained the previous route while navigation settled; direct page captures were used for details.
- Weekly note page https://sirbus.org/lesson-plans/basic-1/term-1/mathematics/week-1/ has curriculum reference fields, resources, competencies and teaching phases. Evidence ev_ad85d9769b650d28c4ad22e3841735dc5a6ef1e9cbea3057f58d1fe43f80a325. Yearly scheme lists subjects: ev_e149e00b5064c71a8bc09c3adc1f74d46fcbfdd7a7f088838c1e52bfba67dbfd.
- Screen/DOM shows max-width 1024px content, 3/2/1 column cards, 12px gaps, 20px card padding, 36px desktop/30px narrow headings, 14px card labels/body and a bordered creation CTA. Navigation has a rounded 896px container. EduPalGh adapts these measurements in lesson-library.css with existing theme tokens.
- __next_f, _next/static and RSC requests identify a Next.js/React frontend; utility classes indicate Tailwind styling; lucide-book-open SVGs and Radix trigger identifiers are present. Exact package versions, complete component library and backend are unverified. No framework replacement or extra dependency was necessary: user clarified “library” means curriculum content.
- Create on Web goes to /dashboard/lesson-notes/new/ and redirects to login without a session. Authenticated editor behavior and complete lesson corpus were not observed. The site also links a WhatsApp creation service; that third-party number/service is not integrated into EduPalGh.

## Implemented scope
Public /#/lesson-library browsing: class → term/yearly scheme → subject → 12 editable planning slots. Landing navbar links here. Public original starter notes support print; use-template preserves a validated catalog selection in sessionStorage through school sign-in and hands off to the existing tenant-scoped editor. Real class/subject IDs remain school-controlled. Original content is applied only to a matching Basic1 class/subject and remains unsaved until teacher review; remaining weeks are blank templates. Existing API validates assignments, ownership and revisions. No migrations or database contact were needed for this change.

## Content provenance and limits
The user requested the Ghana curriculum/content library, not UI libraries. No public reusable Sirbus content export or reuse licence was established. Sharing a country does not establish the same dataset. EduPalGh does not import Sirbus's complete collection or claim equivalent coverage.

Official NaCCA references:
- KG/primary (2019): https://nacca.gov.gh/learning-areas-subjects/new-standards-based-curriculum-2019/
- JHS: https://nacca.gov.gh/common-core-programme-ccp/
- SHS: https://nacca.gov.gh/secondary-education-curriculum/
- Primary teacher resource pack: https://nacca.gov.gh/wp-content/uploads/2019/06/TEACHER-RESOURCE-PACK-P1-P6.pdf

Subject/resource metadata comes from the official published catalog. Primary upper/lower and CCP groups differ. Kindergarten uses an integrated curriculum entry; SHS links the official collection rather than asserting unverified programme subjects. Some NaCCA live retrievals timed out, although official pages were available in search indexing; URLs are references, not an uptime guarantee or curriculum currency certification. Schools must confirm the applicable edition.

Three Basic1 starter lessons (mathematics, English and science) are original EduPalGh suggestions, not copied Sirbus notes or NaCCA-approved content. Standard/indicator codes remain blank until verified. Starters can be placed in any term and do not claim official week1 pacing. Other weeks are explicitly empty editable templates. Official documents remain hosted by NaCCA, with attribution and links; no complete copyrighted documents were republished. A full populated library still requires a reviewed, reusable content source or an authorized Sirbus export and subject-specialist review. Do not market this starter catalog as a complete approved termly corpus.

## Validation plan
Unit-test route/catalog validation, forged selections, starter shape and editor validation. Run existing Google and lesson-plan regressions, lint, production build. Use REA against a frontend-only preview for desktop/mobile navigation, theme, original notes, print controls and login handoff. No database or application-state writes are needed for those browser checks. Authenticated persistence remains covered by existing injected service tests; live persistence needs deployed lesson-plan schema/client.

## Executed verification
44 injected tests passed across library, lesson-plan and Google-auth suites; lint and production build passed. REA desktop screenshot was visually compared with Sirbus. Complete public navigation to Basic1 → Term1 → Mathematics → Week1 → school login passed (ev_1c64fa5c521bb4fcf11c2b684b0141f8f856b9b51f808a54f0915471c5535238); session-storage selection key was retained. Mobile 390×844 note rendering and dark-theme toggle passed without page errors (ev_5a4cfec08604c5181df4b5d586b6ddcb273a3df6c3d400fac7c619684a11580d). These checks used a temporary frontend with API pointed at closed localhost port9, so provider/config requests intentionally failed and no database was contacted. Browser checks did not authenticate, persist booklets or exercise OS print dialogs.

## Subsequent independent teacher access
The earlier school-login handoff described above has been replaced for public library actions by a separate teacher login and personal workspace. See [independent-teacher-workspace.md](independent-teacher-workspace.md) for the current routes, account separation, migration and validation status. Existing school booklets retain their own school access rules.

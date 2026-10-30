# International Pharmaceutical Abstracts (IPA) search strategy

Platform: Ovid (UIC Library). Entry URL (UIC proxy):
https://proxy.cc.uic.edu/login?url=https://ovidsp.ovid.com/ovidweb.cgi?T=JS&NEWS=n&PAGE=main&D=ipab

Northwestern University Libraries: IPA not found in the A-Z database list as of 2026-10-30; use UIC.

Purpose: fill the gap left by the PubMed-based review (reports/Wrong drug errors literature review.md),
which approximated IPA with a journal-restricted sweep of 25 pharmacy, nursing and informatics journals.
Target: pharmacy-practice studies, conference abstracts (ASHP Midyear, APhA, FIP, ACCP), state-board and
pharmacy-chain reports, and non-PubMed journals indexed in IPA, 2006-2026.

## Ovid syntax, run line by line in Advanced Search

1. (wrong drug* or wrong medication* or wrong medicine* or incorrect drug* or incorrect medication*).ti,ab.
2. (look-alike or lookalike or "look alike" or sound-alike or soundalike or "sound alike" or LASA).ti,ab.
3. ((drug* or medication* or medicine* or brand or proprietary or generic or nonproprietary) adj3 name*).ti,ab. and (confus* or similar* or mix-up* or mixup* or mistak*).ti,ab.
4. (name confusion or confused drug name* or confusable or confusability).ti,ab.
5. ("tall man" or tallman or "tall-man" or mixed-case or "mixed case").ti,ab.
6. ((syringe or ampoule or ampule or vial or drug or product) adj2 swap*).ti,ab.
7. ((drug or medication or product) adj2 (substitution or selection or mis-selection or misselection) adj3 error*).ti,ab.
8. ("pick list" or picklist or drop-down or dropdown or "drop down" or autocomplete or auto-complete).ti,ab. and (error* or wrong or incorrect).ti,ab.
9. exp medication errors/ or dispensing errors/ or (medication error* or dispensing error* or prescribing error* or administration error*).ti,ab.
10. 9 and (name* or label* or packag* or similar* or confus* or wrong drug* or wrong medication*).ti,ab.
11. or/1-8
12. 11 or 10
13. limit 12 to yr="2006 -Current"

Author checks (run separately, no year limit):
14. Lambert BL.au. or Lambert B.au.
15. (Cohen MR or Grissinger M or Vaida AJ or Gaunt MJ or Flynn EA or Barker KN or Schiff GD or Galanter WL).au.

## Export settings
Export sets 13, 14 and 15 as RIS or CSV with complete reference, abstract and subject headings.
Save as research_notes/Wrong drug errors literature review/ipa_export_<set>.ris.

## Screening rule
Keep any record that (a) reports a wrong-drug or LASA count, rate or share with a denominator,
(b) evaluates an intervention with a wrong-drug outcome, (c) is a pharmacy-venue or conference item
absent from the 459-entry reference list in reports/Wrong drug errors literature review.md,
or (d) is grey literature from a board of pharmacy, chain, PBM, or insurer.
Dedupe against the existing reference list by DOI, then by first author + year + title.

## Priority full-text pulls (paywalled items the review could not open)
- Keers RN et al. 2013 Ann Pharmacother 47(2):237-256 (subtype table: wrong drug share)
- Nanji KC et al. 2016 Anesthesiology 124(1):25-34 (Table 3 wrong-drug count)
- Truitt E et al. 2016 Hosp Pharm 51(6):474-483 (type-by-period table)
- Flynn EA, Barker KN, Carnahan BJ 2003 JAPhA 43(2):191-200 (wrong-drug numerator among 77 errors)
- Ro M, Jones R 2025 Patient Safety 7(2) (Tables 1-2 pair counts; images)
- Hicks RW, Becker SC, Cousins DD 2008 USP MEDMARX LASA data report (full report)
- Zhong W et al. 2016 BMJ Qual Saf 25(4):233-240 (full text)
- Lambert BL, Schroeder SR, Galanter WL 2016 BMJ Qual Saf 25(4):213-217 (full text)
- Shah K et al. 2016 Can J Hosp Pharm 69(5):394-402 (already read; confirm table)

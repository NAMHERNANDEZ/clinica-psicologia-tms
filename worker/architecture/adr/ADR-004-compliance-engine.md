# ADR-004: Compliance Engine Architecture

## Status
Accepted

## Context
The system must comply with NOM-004 (Mexico), COFEPRIS regulations, ISO 9001, and ISO 27001. Manual compliance checking is impractical at scale. An automated engine is needed to evaluate compliance rules against clinical data and generate actionable alerts.

## Decision
A rule-based compliance engine with the following structure:
- Rules define a check type (CHECK_EXISTS, CHECK_DATE, CHECK_BOOL, CHECK_REQUIRED, etc.)
- The cron job (02:00 daily) evaluates all enabled rules for all patients
- Failed checks generate alerts with severity (LOW/MEDIUM/HIGH/CRITICAL)
- Alerts are auto-resolved when the rule passes again
- Dashboard computes a score per norm and overall

## Consequences
- Pro: Automated compliance monitoring without human intervention
- Pro: Per-norma visibility (NOM vs COFEPRIS vs ISO)
- Pro: Historical tracking with `effective_from` / `effective_to`
- Con: Initial rule configuration requires compliance expertise
- Con: Score is heuristic-based, not a formal audit score

## Alternatives Considered
- External compliance SaaS — rejected due to data sovereignty concerns
- Manual compliance checking — rejected for scale (50+ chapters of clinical data)
- Simple checklist — rejected because rules need to be evaluable programmatically

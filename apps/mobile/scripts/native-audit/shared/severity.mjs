export const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

// `in` walks the prototype chain, so `severity: "constructor"` passes a
// membership test and then ranks as a function: every comparison against it is
// false, which silently disables the ESCALATED check. Own properties only, and
// every read of a severity goes through here rather than indexing the rank map
// directly.
export const isSeverity = value => typeof value === 'string' && Object.hasOwn(SEVERITY_RANK, value);

// The reading an unrated or unrecognised advisory gets: the strictest one short
// of critical. A severity this gate cannot rank is not a harmless one, and
// letting it through as `undefined` is how a finding stops matching any
// blocking threshold.
export const UNRATED_SEVERITY = 'high';

export const normalizeSeverity = value => (isSeverity(value) ? value : UNRATED_SEVERITY);

export const rankOf = value => SEVERITY_RANK[normalizeSeverity(value)];

// Sonatype reports a CVSS score rather than a severity label. The bands are CVSS
// v3's; a v2 vector — recognisable by having no `CVSS:` prefix, and still present
// on older records — has no `critical` band, so a v2 score can only ever land one
// band too high, never too low. An unscored advisory is not a harmless one, so it
// takes the strictest reading short of critical.
export function severityFromCvss(score) {
    if (!Number.isFinite(score) || score <= 0) return { severity: UNRATED_SEVERITY, rated: false };
    if (score >= 9) return { severity: 'critical', rated: true };
    if (score >= 7) return { severity: 'high', rated: true };
    if (score >= 4) return { severity: 'moderate', rated: true };
    return { severity: 'low', rated: true };
}

export function countBySeverity(findings) {
    const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
    // Normalised first, so an unrankable severity is counted as the `high` it is
    // treated as everywhere else instead of vanishing from the totals.
    for (const finding of findings) {
        const severity = normalizeSeverity(finding.severity);
        if (Object.hasOwn(counts, severity)) counts[severity]++;
    }
    return counts;
}

export const bySeverityThenName = (a, b) =>
    rankOf(b.severity) - rankOf(a.severity) ||
    (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

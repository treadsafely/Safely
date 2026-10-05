import { severityFromCvss } from '../shared/severity.mjs';
import { compareStrings } from '../shared/util.mjs';

const REPORT_URL = 'https://api.guide.sonatype.com/api/v3/component-report';
// The endpoint's own limit; the pod list is an order of magnitude smaller.
const BATCH_SIZE = 128;

// GHSA ids are three groups of four characters from base32's alphabet minus the
// ambiguous ones, so the pattern is exact rather than a length guess.
const GHSA_ID = /GHSA(?:-[23456789cfghjmpqrvwx]{4}){3}/i;

// One advisory is named several ways across databases, and an exception recorded
// against any of them has to keep matching: Sonatype keys by CVE, OSV by GHSA,
// and the GHSA id is only ever in the external references.
const aliasesOf = vulnerability =>
    [
        ...new Set([
            vulnerability.cve,
            vulnerability.displayName,
            ...(vulnerability.externalReferences ?? [])
                .map(reference => reference.match(GHSA_ID)?.[0])
                .filter(Boolean)
        ])
    ].filter(alias => typeof alias === 'string' && alias !== vulnerability.id);

const describeStatus = status => {
    if (status === 401 || status === 403) return ' — check SONATYPE_TOKEN';
    if (status === 402 || status === 429) return ' — the credit tier is exhausted';
    return '';
};

// CocoaPods advisories. Sonatype rather than Snyk because Snyk's REST API needs
// an Enterprise plan and this one does not; measured at ~0.093 credits per
// component against a free tier of 500 a month, so roughly 380 builds' worth of
// pods. The same arithmetic is why Maven stays on OSV — 309 coordinates would be
// ~29 credits a build.
export class SonatypeClient {
    constructor(http, { token = process.env.SONATYPE_TOKEN, batchSize = BATCH_SIZE } = {}) {
        this.http = http;
        this.token = token;
        this.batchSize = batchSize;
        this.creditsRemaining = null;
    }

    static purlOf(pod) {
        return `pkg:cocoapods/${pod.name}@${pod.version}`;
    }

    async query(pods) {
        if (!this.token) throw new Error('SONATYPE_TOKEN is not set');

        const snapshot = {};
        const details = {};
        const unknown = [];

        for (let start = 0; start < pods.length; start += this.batchSize) {
            const batch = pods.slice(start, start + this.batchSize);
            const byPurl = new Map(batch.map(pod => [SonatypeClient.purlOf(pod), pod]));
            const components = await this.#report([...byPurl.keys()]);

            for (const component of components) {
                const pod = byPurl.get(component.coordinates);
                if (!pod) continue;
                // A component Sonatype has never heard of comes back with no
                // description, and its empty vulnerability list means nothing.
                // That is the difference between "no known advisory" and "not in
                // the database", and a clean report rests on knowing which.
                if (!component.description) unknown.push(`${pod.name}@${pod.version}`);

                const vulnerabilities = component.vulnerabilities ?? [];
                if (!vulnerabilities.length) continue;

                snapshot[`${pod.name}@${pod.version}`] = vulnerabilities.map(
                    vulnerability => vulnerability.id
                );
                for (const vulnerability of vulnerabilities) {
                    details[vulnerability.id] = {
                        ...severityFromCvss(vulnerability.cvssScore),
                        summary: vulnerability.title ?? '',
                        aliases: aliasesOf(vulnerability),
                        url: vulnerability.reference ?? ''
                    };
                }
            }
        }

        return { snapshot, details, unknown: unknown.sort(compareStrings) };
    }

    async #report(coordinates) {
        return this.http.withRetries('sonatype component-report', async () => {
            const response = await this.http.request(REPORT_URL, {
                method: 'POST',
                headers: {
                    // Measured: only `Bearer` authenticates. `token <t>` and Basic
                    // with the token as the username both answer 401.
                    authorization: `Bearer ${this.token}`,
                    'content-type': 'application/json',
                    accept: 'application/json'
                },
                body: JSON.stringify({ coordinates }),
                describeStatus
            });
            const remaining = response.headers.get('x-credits-remaining');
            if (remaining) this.creditsRemaining = remaining;

            const components = await response.json();
            if (!Array.isArray(components))
                throw new Error('component-report answered with something other than an array');
            // An unindexed component still comes back, with no description — that
            // is what `unknown` is for. A purl missing from the answer entirely was
            // never looked at, and matching only what came back would report it as
            // a pod with no advisories.
            const answered = new Set(components.map(component => component.coordinates));
            const missing = coordinates.filter(purl => !answered.has(purl));
            if (missing.length)
                throw new Error(
                    `component-report answered about ${answered.size} of ${coordinates.length} component(s); ` +
                        `no answer for ${missing.join(', ')}`
                );
            return components;
        });
    }
}

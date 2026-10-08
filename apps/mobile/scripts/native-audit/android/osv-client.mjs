import { isSeverity, normalizeSeverity } from '../shared/severity.mjs';
import { compareStrings } from '../shared/util.mjs';

const BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const VULN_URL = 'https://api.osv.dev/v1/vulns';

// Maven advisories. No authentication, no rate limit worth pacing for, and the
// only ecosystem of the two that a public database covers.
export class OsvClient {
    constructor(http) {
        this.http = http;
    }

    // The batch endpoint answers with ids only, so severity needs a second call
    // per advisory.
    async query(coordinates) {
        const batch = await this.http.withRetries('osv querybatch', async () => {
            const payload = await this.http.postJson(BATCH_URL, {
                queries: coordinates.map(entry => ({
                    package: { name: entry.name, ecosystem: 'Maven' },
                    version: entry.version
                }))
            });
            // `results` is positional, so a short answer does not mean "these
            // coordinates are clean" — it means the tail of the batch went
            // unasked. Retried, then failed: a partial scan reading as a clean one
            // is the failure this gate exists to prevent.
            if (!Array.isArray(payload.results))
                throw new Error('querybatch answered without a `results` array');
            if (payload.results.length !== coordinates.length)
                throw new Error(
                    `querybatch answered ${payload.results.length} result(s) for ${coordinates.length} quer(ies)`
                );
            // Paging arrives per result once a package carries more advisories
            // than one page holds. Nothing here follows it, and quietly keeping
            // the first page would under-report that coordinate.
            const paged = payload.results
                .map((result, index) => (result.next_page_token ? coordinates[index].name : null))
                .filter(Boolean);
            if (paged.length)
                throw new Error(
                    `querybatch paged the answer for ${paged.join(', ')} — this client reads one page only`
                );
            return payload;
        });

        const snapshot = {};
        const ids = new Set();
        batch.results.forEach((result, index) => {
            const hits = (result.vulns ?? []).map(vuln => vuln.id);
            if (!hits.length) return;
            snapshot[`${coordinates[index].name}@${coordinates[index].version}`] = hits;
            for (const id of hits) ids.add(id);
        });

        const details = {};
        for (const id of [...ids].sort(compareStrings)) details[id] = await this.#detailsOf(id);
        return { snapshot, details };
    }

    async #detailsOf(id) {
        const record = await this.http.withRetries(`osv vulns/${id}`, () =>
            this.http.getJson(`${VULN_URL}/${id}`)
        );
        const published = record.database_specific?.severity;
        const severity = typeof published === 'string' ? published.toLowerCase() : null;
        return {
            // An advisory without a published severity is not a harmless one, and
            // neither is one whose label this gate cannot rank.
            severity: normalizeSeverity(severity),
            rated: isSeverity(severity),
            summary: record.summary ?? '',
            // The same advisory carries a GHSA id here and a CVE id in Sonatype,
            // so an exception recorded against either has to keep matching.
            aliases: record.aliases ?? [],
            url:
                record.references?.find(reference => reference.type === 'ADVISORY')?.url ??
                `https://osv.dev/vulnerability/${id}`
        };
    }
}

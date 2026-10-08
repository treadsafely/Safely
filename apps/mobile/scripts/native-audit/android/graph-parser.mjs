import { looksBinary, parseAppDependencies } from './dependencies-pb-parser.mjs';
import { GRADLE_CONFIGURATION, parseGradleTree } from './gradle-tree-parser.mjs';
import { parseSdkDependencies } from './sdk-dependencies-parser.mjs';

// `label` names the artifact a graph describes, `source` how it was produced.
export function parseAndroidGraph(text) {
    if (/^library \{/m.test(text))
        return {
            label: 'apk',
            source: 'agp :app:sdkReleaseDependencyData',
            coordinates: parseSdkDependencies(text)
        };
    return {
        label: 'gradle',
        source: `gradle :app:dependencies --configuration ${GRADLE_CONFIGURATION}`,
        coordinates: parseGradleTree(text)
    };
}

// The only graph describing what ships to Play: no `sdkDependencies.txt` there.
export function parseAndroidBundleGraph(bytes) {
    if (!looksBinary(bytes))
        throw new Error('this is the text form of the graph — pass it as --android, not --aab');
    return {
        label: 'aab',
        source: 'agp :app:bundleRelease dependencies.pb',
        coordinates: parseAppDependencies(bytes)
    };
}

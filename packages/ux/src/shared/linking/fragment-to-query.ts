export function fragmentToQuery(path: string): string {
    const hashIndex = path.indexOf('#');

    if (hashIndex === -1) {
        return path;
    }

    const fragment = path.slice(hashIndex + 1);
    const beforeFragment = path.slice(0, hashIndex);

    if (fragment === '') {
        return beforeFragment;
    }

    const separator = beforeFragment.includes('?') ? '&' : '?';

    return `${beforeFragment}${separator}${fragment}`;
}

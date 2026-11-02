export type DeepLinkNode =
    string | { readonly segment: string; readonly [child: string]: DeepLinkNode };

export type DeepLinkPath = { readonly segment: string; readonly path: string };

export type DeepLinkPaths<T> = T extends string
    ? DeepLinkPath
    : {
          readonly [K in keyof T as K extends 'segment' ? never : K]: DeepLinkPaths<T[K]>;
      } & DeepLinkPath;

type DeepLinkTree = Record<string, DeepLinkNode>;

type DeepLinkRoutes<T extends DeepLinkTree> = { readonly [K in keyof T]: DeepLinkPaths<T[K]> };

export function defineDeepLinkPaths<T extends DeepLinkTree>(tree: T): DeepLinkRoutes<T> {
    return buildChildren(tree, '') as DeepLinkRoutes<T>;
}

function buildChildren(tree: DeepLinkTree, parentPath: string): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(tree).map(([name, node]) => [name, buildNode(node, parentPath)])
    );
}

function buildNode(node: DeepLinkNode, parentPath: string): unknown {
    if (typeof node === 'string') {
        return { segment: node, path: `${parentPath}/${node}` };
    }

    const { segment, ...children } = node;
    const path = `${parentPath}/${segment}`;

    return { ...buildChildren(children, path), segment, path };
}

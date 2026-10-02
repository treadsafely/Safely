import type { ErrorInfo, PropsWithChildren, ReactNode } from 'react';
import { Component } from 'react';

import type { Logger } from '@safely/sync';

export type RootErrorBoundaryProps = PropsWithChildren<{
    logger: Logger;
    fallback: ReactNode;
}>;

type RootErrorBoundaryState = {
    hasError: boolean;
};

export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
    public state: RootErrorBoundaryState = { hasError: false };

    public static getDerivedStateFromError(): RootErrorBoundaryState {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.props.logger.error('fatal', error, errorInfo.componentStack);
    }

    public render(): ReactNode {
        return this.state.hasError ? this.props.fallback : this.props.children;
    }
}

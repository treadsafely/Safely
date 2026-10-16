import type { ErrorInfo, PropsWithChildren, ReactNode } from 'react';
import { Component } from 'react';

import type { Logger } from '@safely/sync';

export type ErrorBoundaryProps = PropsWithChildren<{
    logger: Logger;
    fallback: ReactNode;
}>;

type ErrorBoundaryState = {
    hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = { hasError: false };

    public static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.props.logger.error('render failed', error, errorInfo.componentStack);
    }

    public render(): ReactNode {
        return this.state.hasError ? this.props.fallback : this.props.children;
    }
}

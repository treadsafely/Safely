/* eslint-disable @typescript-eslint/explicit-member-accessibility */

export type XHREventSourceReadyState = -1 | 0 | 1 | 2;

export type XHREventSourceEventType = 'open' | 'message' | 'error' | 'done' | 'close';

export interface XHREventSourceOptions {
    method?: string;
    timeout?: number;
    timeoutBeforeConnection?: number;
    withCredentials?: boolean;
    body?: Document | XMLHttpRequestBodyInit | null;
    debug?: boolean;
    pollingInterval?: number;
    lineEndingCharacter?: string | null;
    headers?: Record<string, string>;
}

export interface XHREventSourceOpenEvent {
    type: 'open';
}

export interface XHREventSourceMessageEvent {
    type: string;
    data: string;
    url: string;
    lastEventId: string | null;
}

export type XHREventSourceErrorEvent =
    | {
          type: 'error';
          message?: string;
          xhrStatus?: number;
          xhrState?: number;
      }
    | { type: 'timeout' }
    | {
          type: 'exception';
          message: string;
          error: Error;
      };

export interface XHREventSourceDoneEvent {
    type: 'done';
}

export interface XHREventSourceCloseEvent {
    type: 'close';
}

export interface XHREventSourceEventMap {
    open: XHREventSourceOpenEvent;
    message: XHREventSourceMessageEvent;
    error: XHREventSourceErrorEvent;
    done: XHREventSourceDoneEvent;
    close: XHREventSourceCloseEvent;
}

export type XHREventSourceListener<T extends string> = (
    event: T extends keyof XHREventSourceEventMap
        ? XHREventSourceEventMap[T]
        : XHREventSourceMessageEvent
) => void;

export type GetAuthorizationHeader = () =>
    string | null | undefined | Promise<string | null | undefined>;

declare class XHREventSource {
    readonly ERROR: -1;
    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSED: 2;

    readonly CRLF: '\r\n';
    readonly LF: '\n';
    readonly CR: '\r';

    lastEventId: string | null;
    status: XHREventSourceReadyState;

    method: string;
    timeout: number;
    timeoutBeforeConnection: number;
    withCredentials: boolean;
    body: Document | XMLHttpRequestBodyInit | null | undefined;
    debug: boolean;
    interval: number;
    lineEndingCharacter: string | null;
    headers: Record<string, string>;
    url: string;
    getAuthorizationHeader?: GetAuthorizationHeader;

    constructor(
        url: string | { toString(): string },
        options?: XHREventSourceOptions,
        getAuthorizationHeader?: GetAuthorizationHeader
    );

    open(): Promise<void>;
    close(): void;

    addEventListener<T extends keyof XHREventSourceEventMap>(
        type: T,
        listener: XHREventSourceListener<T>
    ): void;
    addEventListener(type: string, listener: XHREventSourceListener<string>): void;

    removeEventListener<T extends keyof XHREventSourceEventMap>(
        type: T,
        listener: XHREventSourceListener<T>
    ): void;
    removeEventListener(type: string, listener: XHREventSourceListener<string>): void;

    removeAllEventListeners(type?: string): void;

    dispatch<T extends keyof XHREventSourceEventMap>(
        type: T,
        data: XHREventSourceEventMap[T]
    ): void;
    dispatch(type: string, data: XHREventSourceMessageEvent): void;
}

export default XHREventSource;

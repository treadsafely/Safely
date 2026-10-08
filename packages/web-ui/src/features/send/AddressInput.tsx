import type { FC } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import type { ContactMeta, PortfolioMeta } from '@safely/core';
import { ellipsisMiddle } from '@safely/core';
import { SuggestionSource, useTranslate } from '@safely/ux';
import XmarkCircle16 from '@safely/ux/assets/icons/16/xmark-circle-16.svg?react';

import {
    boxStyles,
    clearStyles,
    errorStyles,
    fieldStyles,
    inputStyles,
    labelStyles,
    pickedInputStyles,
    mirrorStyles,
    pickedRowStyles,
    recognisedNameStyles,
    rootStyles
} from './AddressInput.styles';
import { RecipientName } from './RecipientName';
import { Icon, Text } from '../../shared';

export type AddressInputProps = {
    value: string;
    error: string | undefined;
    portfolioMeta: PortfolioMeta | undefined;
    contactMeta: ContactMeta | undefined;
    source: SuggestionSource | undefined;
    onChange: (value: string) => void;
};

export const AddressInput: FC<AddressInputProps> = props => {
    const { value, error, portfolioMeta, contactMeta, source, onChange } = props;

    const t = useTranslate();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const nameRef = useRef<HTMLSpanElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    const [nameWidth, setNameWidth] = useState(0);
    const [nameOffset, setNameOffset] = useState({ left: 0, top: 0 });

    const hasMeta = portfolioMeta !== undefined || contactMeta !== undefined;
    const isPicked = hasMeta && source === SuggestionSource.SUGGESTIONS;
    const isRecognised = hasMeta && source === SuggestionSource.USER_DEFINED;
    const shortAddress = ellipsisMiddle(value);

    const focusEnd = (): void => {
        const input = inputRef.current;

        if (input === null) {
            return;
        }

        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    };

    useLayoutEffect(() => {
        if (isPicked) {
            focusEnd();
        }
    }, [isPicked, value]);

    useLayoutEffect(() => {
        setNameWidth(isRecognised ? (nameRef.current?.offsetWidth ?? 0) : 0);
    }, [isRecognised, portfolioMeta, contactMeta]);

    useLayoutEffect(() => {
        const mirror = mirrorRef.current;
        const text = mirror?.firstChild;

        if (!isRecognised || mirror === null || text === null || text === undefined) {
            return;
        }

        const range = document.createRange();
        range.setStart(text, 0);
        range.setEnd(text, value.length);

        const rects = range.getClientRects();
        const last = rects.item(rects.length - 1);
        const box = mirror.getBoundingClientRect();

        if (last !== null) {
            setNameOffset({ left: last.right - box.left, top: last.top - box.top });
        }
    }, [isRecognised, value, nameWidth]);

    return (
        <div className={rootStyles}>
            <Text variant="bodyM" tone="tertiary" className={labelStyles}>
                {t('send.recipient.label')}
            </Text>

            <div className={boxStyles} data-invalid={error !== undefined ? '' : undefined}>
                {isPicked ? (
                    <div className={pickedRowStyles} role="presentation" onClick={focusEnd}>
                        <RecipientName portfolioMeta={portfolioMeta} contactMeta={contactMeta} />

                        <textarea
                            ref={inputRef}
                            rows={1}
                            className={`${inputStyles} ${pickedInputStyles}`}
                            value={shortAddress}
                            spellCheck={false}
                            onChange={event =>
                                onChange(event.target.value.slice(shortAddress.length))
                            }
                        />
                    </div>
                ) : (
                    <div className={fieldStyles}>
                        <textarea
                            ref={inputRef}
                            autoFocus
                            rows={1}
                            className={inputStyles}
                            style={{ paddingRight: nameWidth === 0 ? undefined : nameWidth + 8 }}
                            value={value}
                            placeholder={t('send.recipient.placeholder')}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={event => onChange(event.target.value)}
                        />

                        {isRecognised && (
                            <div
                                ref={mirrorRef}
                                className={mirrorStyles}
                                style={{ paddingRight: nameWidth + 8, width: '100%' }}
                                aria-hidden
                            >
                                {value}
                            </div>
                        )}

                        {isRecognised && (
                            <span
                                ref={nameRef}
                                className={recognisedNameStyles}
                                style={{ left: nameOffset.left + 8, top: nameOffset.top - 2 }}
                            >
                                <RecipientName
                                    portfolioMeta={portfolioMeta}
                                    contactMeta={contactMeta}
                                />
                            </span>
                        )}
                    </div>
                )}

                {value.length > 0 && (
                    <button
                        type="button"
                        className={clearStyles}
                        aria-label={t('common.clear')}
                        onClick={() => onChange('')}
                    >
                        <Icon asset={XmarkCircle16} tone="tertiary" />
                    </button>
                )}
            </div>

            {error !== undefined && (
                <Text variant="bodyM" tone="accentRed" className={errorStyles}>
                    {t(error)}
                </Text>
            )}
        </div>
    );
};

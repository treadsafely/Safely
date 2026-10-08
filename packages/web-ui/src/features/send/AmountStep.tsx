import type { FC, MouseEvent } from 'react';

import type { AmountView } from '@safely/ux';
import {
    useActiveFiat,
    useAppContext,
    useAmountStepView,
    useNumberFormatter,
    useTranslate
} from '@safely/ux';
import SwapVertical20 from '@safely/ux/assets/icons/20/swap-vertical-20.svg?react';

import {
    alternativeStyles,
    amountInputStyles,
    amountRowStyles,
    approximateStyles,
    boxStyles,
    fieldStyles,
    labelStyles,
    maxStyles,
    statusRowStyles,
    suffixStyles
} from './AmountStep.styles';
import { useAmountInput } from './useAmountInput';
import { Icon, Text } from '../../shared';

export type AmountStepProps = {
    view: AmountView;
};

export const AmountStep: FC<AmountStepProps> = ({ view }) => {
    const t = useTranslate();
    const fiat = useActiveFiat();
    const { numberFormatLocale } = useAppContext();
    const formatter = useNumberFormatter();

    const {
        amountError,
        decimals,
        inputType,
        hasPrice,
        isMax,
        alternativeAmount,
        remainingBalance
    } = useAmountStepView({ view, formatter, fiatSymbol: fiat.id.symbol });

    const input = useAmountInput({
        amount: view.values.amount,
        decimals,
        locale: numberFormatLocale,
        onChange: view.setAmount,
        onPaste: view.pasteAmount
    });

    const handleBoxMouseDown = (event: MouseEvent<HTMLDivElement>): void => {
        if (event.target instanceof HTMLElement && event.target.closest('button, input')) {
            return;
        }

        event.preventDefault();
        input.inputRef.current?.focus();
    };

    const enterMax = 'enterMax' in view ? view.enterMax : undefined;
    const symbol =
        inputType === 'fiat' ? fiat.id.symbol : (view.parsed.asset?.amount.asset.symbol ?? '');

    return (
        <div className={fieldStyles}>
            <Text variant="bodyM" tone="tertiary" className={labelStyles}>
                {t('send.amount')}
            </Text>

            <div
                className={boxStyles}
                data-invalid={amountError !== undefined ? '' : undefined}
                onMouseDown={handleBoxMouseDown}
            >
                <div className={amountRowStyles}>
                    {isMax && <span className={approximateStyles}>≈</span>}

                    <input
                        ref={input.inputRef}
                        autoFocus
                        className={amountInputStyles}
                        value={input.value}
                        placeholder="0"
                        inputMode="decimal"
                        autoComplete="off"
                        onChange={input.onChange}
                        onPaste={input.onPaste}
                        onFocus={() => 'exitMax' in view && view.exitMax()}
                    />

                    <span className={suffixStyles}>{symbol}</span>
                </div>

                <button
                    type="button"
                    className={alternativeStyles}
                    disabled={!hasPrice}
                    onClick={() =>
                        view.setAmountInputType(inputType === 'fiat' ? 'crypto' : 'fiat')
                    }
                >
                    {alternativeAmount}
                    {hasPrice && <Icon asset={SwapVertical20} tone="secondary" />}
                </button>
            </div>

            <div className={statusRowStyles}>
                <Text variant="bodyM" tone={amountError === undefined ? 'tertiary' : 'accentRed'}>
                    {amountError !== undefined
                        ? t(amountError)
                        : isMax
                          ? t('send.maxHint')
                          : `${t('send.remaining')} ${remainingBalance}`}
                </Text>

                {enterMax !== undefined && view.isMaxAvailable && (
                    <button type="button" className={maxStyles} onClick={enterMax}>
                        {t('send.max')}
                    </button>
                )}
            </div>
        </div>
    );
};

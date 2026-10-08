import type { FC } from 'react';
import { useState } from 'react';

import type { FiatAsset } from '@safely/core';
import type { AmountUnit } from '@safely/ux';
import {
    useActiveFiat,
    useAvailableFiats,
    useMainBalanceUnit,
    useSetActiveFiat,
    useSetMainBalanceUnit,
    useTranslate
} from '@safely/ux';

import { AmountDisplaySettings } from './AmountDisplaySettings';
import { currencyRowStyles, listStyles, symbolStyles } from './SettingsSection.styles';
import { Cell, List, PageHeader, Text } from '../../../shared';

const MAIN_BALANCE_UNITS: AmountUnit[] = ['fiat', 'crypto'];

export const CurrencySettings: FC = () => {
    const t = useTranslate();
    const activeFiat = useActiveFiat();
    const availableFiats = useAvailableFiats();
    const { mutate: setActiveFiat } = useSetActiveFiat();

    const mainBalanceUnit = useMainBalanceUnit();
    const setMainBalanceUnit = useSetMainBalanceUnit();

    const [isAmountDisplayOpen, setIsAmountDisplayOpen] = useState(false);

    const selectFiat = (fiat: FiatAsset): void => {
        if (!activeFiat.id.isEq(fiat.id)) {
            setActiveFiat({ fiat });
        }
    };

    if (isAmountDisplayOpen) {
        return <AmountDisplaySettings onBack={() => setIsAmountDisplayOpen(false)} />;
    }

    return (
        <>
            <PageHeader title={t('currency.title')} hasDivider />

            <List className={listStyles}>
                <List.Title>{t('currency.localCurrency.title')}</List.Title>
                <List.Group variant="separated">
                    {availableFiats.map(fiat => (
                        <Cell
                            key={fiat.id.symbol}
                            isSelected={activeFiat.id.isEq(fiat.id)}
                            onClick={() => selectFiat(fiat)}
                        >
                            <Cell.Content>
                                <div className={currencyRowStyles}>
                                    <Text variant="labelL" className={symbolStyles}>
                                        {fiat.id.symbol}
                                    </Text>
                                    <Text variant="bodyL" tone="tertiary">
                                        {fiat.name}
                                    </Text>
                                </div>
                            </Cell.Content>
                            {activeFiat.id.isEq(fiat.id) && <Cell.Checkmark />}
                        </Cell>
                    ))}
                </List.Group>

                <List.Title>{t('currency.mainBalance.title')}</List.Title>
                <List.Group variant="separated">
                    {MAIN_BALANCE_UNITS.map(unit => (
                        <Cell
                            key={unit}
                            isSelected={mainBalanceUnit === unit}
                            onClick={() => setMainBalanceUnit(unit)}
                        >
                            <Cell.Content>
                                <Cell.Title>{t(`currency.mainBalance.options.${unit}`)}</Cell.Title>
                            </Cell.Content>
                            {mainBalanceUnit === unit && <Cell.Checkmark />}
                        </Cell>
                    ))}
                </List.Group>

                <List.Title>{t('currency.moreOptions.title')}</List.Title>
                <List.Group variant="separated">
                    <Cell onClick={() => setIsAmountDisplayOpen(true)}>
                        <Cell.Content>
                            <Cell.Title>{t('currency.moreOptions.amountDisplay.title')}</Cell.Title>
                            <Cell.Subtitle>
                                {t('currency.moreOptions.amountDisplay.subtitleWeb')}
                            </Cell.Subtitle>
                        </Cell.Content>
                        <Cell.Chevron />
                    </Cell>
                </List.Group>
            </List>
        </>
    );
};

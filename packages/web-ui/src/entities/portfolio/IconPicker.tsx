import type { FC } from 'react';

import type { PortfolioMetaIcon } from '@safely/core';
import { allowedPortfolioMetaColors, allowedPortfolioMetaEmojis } from '@safely/core';
import { iconPicker } from '@safely/web-ui/styled-system/recipes';

import { toWalletColorStyle } from './wallet-color';

export type IconPickerProps = {
    icon: PortfolioMetaIcon;
    onChange: (icon: PortfolioMetaIcon) => void;
    className?: string;
};

const styles = iconPicker();
const hoverableStyles = iconPicker({ isHoverable: true });

export const IconPicker: FC<IconPickerProps> = props => {
    const { icon, onChange, className } = props;

    return (
        <div className={className ?? styles.root}>
            <div className={styles.grid}>
                {allowedPortfolioMetaColors.map(color => (
                    <button
                        key={color}
                        type="button"
                        className={styles.option}
                        aria-label={color}
                        onClick={() => onChange({ type: 'color', value: color })}
                    >
                        <span className={styles.color} style={toWalletColorStyle(color)}>
                            {icon.type === 'color' && icon.value === color && (
                                <span
                                    className={styles.colorRing}
                                    style={toWalletColorStyle(color)}
                                />
                            )}
                        </span>
                    </button>
                ))}

                {allowedPortfolioMetaEmojis.map(emoji => (
                    <button
                        key={emoji}
                        type="button"
                        className={hoverableStyles.option}
                        aria-label={emoji}
                        onClick={() => onChange({ type: 'emoji', value: emoji })}
                    >
                        <span className={styles.emoji}>{emoji}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

import type { OptionalProperty } from '../../utils';

export interface PortfolioMeta {
    name: string;
    icon: PortfolioMetaIcon;
}

export const PORTFOLIO_NAME_MAX_LENGTH = 24;

export type NoIconPortfolioMeta = OptionalProperty<PortfolioMeta, 'icon'>;

export type PortfolioMetaIcon = PortfolioMetaIconEmoji | PortfolioMetaIconColor;
export type PortfolioMetaIconEmoji = {
    type: 'emoji';
    value: string;
};

export type PortfolioMetaIconColor = {
    type: 'color';
    value: string;
};

export const allowedPortfolioMetaColors = [
    '#1E90FF',
    '#FF5555',
    '#FFB347',
    '#3CCB7F',
    '#47C8FF',
    '#925CFF',
    '#FF479D',
    '#6E6E73'
];

export const allowedPortfolioMetaEmojis = [
    '🙂',
    '😎',
    '😝',
    '🤑',
    '😊',
    '🙃',
    '🥴',
    '😭',
    '🤡',
    '👽',
    '🐵',
    '🐻‍❄️',
    '🐻',
    '🐼',
    '🐶',
    '🐨',
    '🐲',
    '🐸',
    '🐙',
    '🦀',
    '🦫',
    '🐡',
    '🐋',
    '🐝',
    '🍀',
    '🌵',
    '🌳',
    '🍄',
    '🌿',
    '🌸',
    '🌺',
    '🌼',
    '🍋',
    '🍑',
    '🍏',
    '🍎',
    '🍊',
    '🍐',
    '🍓',
    '🥝',
    '🌽',
    '🍆',
    '🥦',
    '🥑',
    '🍔',
    '🥐',
    '🍩',
    '🧁',
    '🍪',
    '🍤',
    '🥩',
    '🍣',
    '🥞',
    '🥟',
    '🍾',
    '🍺',
    '⚽',
    '🏀',
    '⚾',
    '🎾',
    '🏈',
    '🏉',
    '🎲',
    '🎱',
    '🌍',
    '🌎',
    '🌏',
    '🧭',
    '🏝️',
    '🚂',
    '🛵',
    '🚌',
    '🚗',
    '🚙',
    '🚓',
    '🚜',
    '⛵',
    '🛩️',
    '🚀',
    '🛰️',
    '👟',
    '🎒',
    '🧳',
    '👜',
    '💵',
    '🪙',
    '⏰',
    '💍',
    '🧠',
    '🗿',
    '💎',
    '🔗',
    '⚙️',
    '🛠️',
    '📎',
    '🔩',
    '📦',
    '💿',
    '📽️',
    '📷',
    '💊',
    '🧿',
    '💥',
    '☁️'
];

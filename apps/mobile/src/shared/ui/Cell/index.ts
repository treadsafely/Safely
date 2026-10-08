import { CellContainer } from './Cell';
import {
    Content,
    Image,
    Row,
    Title,
    Subtitle,
    Value,
    Subvalue,
    Chevron,
    Checkmark
} from './components';

export const Cell = Object.assign(CellContainer, {
    Image,
    Content,
    Row,
    Title,
    Subtitle,
    Value,
    Subvalue,
    Chevron,
    Checkmark
});

export type { CellContainerProps } from './Cell';

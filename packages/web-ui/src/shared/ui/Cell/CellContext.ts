import { createContext, useContext } from 'react';

import type { CellRecipe } from '@safely/web-ui/styled-system/recipes';
import { cell } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

export type CellTone = NonNullable<RecipeVariants<CellRecipe>['tone']>;

export const CellContext = createContext(cell());

export const useCellStyles = () => useContext(CellContext);

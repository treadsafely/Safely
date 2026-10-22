import { createContext, useContext } from 'react';

import type { BannerRecipe } from '@safely/web-ui/styled-system/recipes';
import { banner } from '@safely/web-ui/styled-system/recipes';

import type { RecipeVariants } from '../recipe-variants';

export type BannerTone = NonNullable<RecipeVariants<BannerRecipe>['tone']>;

export const BannerContext = createContext(banner());

export const useBannerStyles = () => useContext(BannerContext);

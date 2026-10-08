import { defineRecipe } from '@pandacss/dev';

export const spinnerRecipe = defineRecipe({
    className: 'spinner',
    description: 'Indeterminate activity indicator',
    base: {
        display: 'block',
        color: 'inherit',
        animation: 'spin 0.8s linear infinite',
        '@media (prefers-reduced-motion: reduce)': {
            animation: 'spin 2.4s linear infinite'
        }
    }
});

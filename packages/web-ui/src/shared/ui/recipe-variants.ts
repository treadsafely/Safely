export type RecipeVariants<TRecipe extends { variantMap: Record<string, readonly unknown[]> }> = {
    [Key in keyof TRecipe['variantMap']]?: TRecipe['variantMap'][Key][number];
};

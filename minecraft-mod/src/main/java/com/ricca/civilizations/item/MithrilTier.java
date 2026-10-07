package com.ricca.civilizations.item;

import com.ricca.civilizations.Civilizations;
import net.minecraft.tags.BlockTags;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.Tier;
import net.minecraft.world.item.crafting.Ingredient;
import net.minecraft.world.level.block.Block;

/** Мифрил: между железом и алмазом по прочности, но быстрее и острее. */
public class MithrilTier implements Tier {
    public static final MithrilTier INSTANCE = new MithrilTier();

    @Override public int getUses() { return 1200; }
    @Override public float getSpeed() { return 9.0f; }
    @Override public float getAttackDamageBonus() { return 3.5f; }
    @Override public TagKey<Block> getIncorrectBlocksForDrops() { return BlockTags.INCORRECT_FOR_DIAMOND_TOOL; }
    @Override public int getEnchantmentValue() { return 18; }
    @Override public Ingredient getRepairIngredient() { return Ingredient.of(Civilizations.MITHRIL_INGOT.get()); }
}

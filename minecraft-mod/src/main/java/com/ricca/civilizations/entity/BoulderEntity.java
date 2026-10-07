package com.ricca.civilizations.entity;

import com.ricca.civilizations.Civilizations;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.projectile.ThrowableItemProjectile;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.HitResult;

/** Камень из катапульты. */
public class BoulderEntity extends ThrowableItemProjectile {
    public static final float DAMAGE = 12.0f;

    public BoulderEntity(EntityType<? extends ThrowableItemProjectile> type, Level level) {
        super(type, level);
    }

    public BoulderEntity(Level level, double x, double y, double z) {
        super(Civilizations.BOULDER.get(), x, y, z, level);
    }

    @Override
    protected Item getDefaultItem() {
        return Items.COBBLESTONE;
    }

    @Override
    protected void onHitEntity(EntityHitResult result) {
        super.onHitEntity(result);
        result.getEntity().hurt(damageSources().thrown(this, null), DAMAGE);
    }

    @Override
    protected void onHit(HitResult result) {
        super.onHit(result);
        if (!level().isClientSide) {
            level().levelEvent(2001, blockPosition(), Block.getId(Blocks.COBBLESTONE.defaultBlockState()));
            discard();
        }
    }
}

package com.ricca.civilizations.block;

import com.ricca.civilizations.Civilizations;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.EntityBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityTicker;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockState;

import javax.annotation.Nullable;

/** Катапульта: сама стреляет камнями по врагам ближайшего королевства. */
public class CatapultBlock extends Block implements EntityBlock {
    public CatapultBlock(Properties properties) {
        super(properties);
    }

    @Nullable
    @Override
    public BlockEntity newBlockEntity(BlockPos pos, BlockState state) {
        return new CatapultBlockEntity(pos, state);
    }

    @Nullable
    @Override
    public <T extends BlockEntity> BlockEntityTicker<T> getTicker(Level level, BlockState state, BlockEntityType<T> type) {
        if (level.isClientSide || type != Civilizations.CATAPULT_BE.get()) {
            return null;
        }
        return (lvl, pos, st, be) -> CatapultBlockEntity.serverTick(lvl, pos, st, (CatapultBlockEntity) be);
    }
}

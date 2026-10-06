package com.ricca.civilizations.block;

import com.ricca.civilizations.Civilizations;
import net.minecraft.core.BlockPos;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.EntityBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityTicker;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;

import javax.annotation.Nullable;

/** Ратуша. Правый клик — сводка по королевству. */
public class TownHallBlock extends Block implements EntityBlock {
    public TownHallBlock(Properties properties) {
        super(properties);
    }

    @Nullable
    @Override
    public BlockEntity newBlockEntity(BlockPos pos, BlockState state) {
        return new TownHallBlockEntity(pos, state);
    }

    @Nullable
    @Override
    public <T extends BlockEntity> BlockEntityTicker<T> getTicker(Level level, BlockState state, BlockEntityType<T> type) {
        if (level.isClientSide || type != Civilizations.TOWN_HALL_BE.get()) {
            return null;
        }
        return (lvl, pos, st, be) -> TownHallBlockEntity.serverTick(lvl, pos, st, (TownHallBlockEntity) be);
    }

    @Override
    protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
        if (level.isClientSide) {
            return InteractionResult.SUCCESS;
        }
        TownHallBlockEntity th = TownHallBlockEntity.at(level, pos);
        if (th == null) {
            return InteractionResult.PASS;
        }
        if (th.getKingdom().isEmpty()) {
            th.setKingdom(player.getName().getString());
        }
        th.sendStats(player);
        return InteractionResult.CONSUME;
    }
}

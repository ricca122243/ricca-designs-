package com.ricca.civilizations.block;

import com.ricca.civilizations.Civilizations;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.BlockTags;
import net.minecraft.tags.ItemTags;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.ItemInteractionResult;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
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

    /** Сдать предметы на склад королевства: брёвна, доски, камень, пшеница, хлеб, золото, изумруды. */
    @Override
    protected ItemInteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos, Player player,
                                              InteractionHand hand, BlockHitResult hit) {
        TownHallBlockEntity th = TownHallBlockEntity.at(level, pos);
        if (th == null || stack.isEmpty()) {
            return ItemInteractionResult.PASS_TO_DEFAULT_BLOCK_INTERACTION;
        }
        int count = stack.getCount();
        String what;
        int amount;
        if (stack.is(ItemTags.LOGS)) {
            amount = count * 4; what = "wood";
            if (!level.isClientSide) th.addWood(amount);
        } else if (stack.is(ItemTags.PLANKS)) {
            amount = count; what = "wood";
            if (!level.isClientSide) th.addWood(amount);
        } else if (stack.is(Items.COBBLESTONE) || stack.is(Items.STONE) || stack.is(Items.STONE_BRICKS)) {
            amount = count; what = "stone";
            if (!level.isClientSide) th.addStone(amount);
        } else if (stack.is(Items.WHEAT) || stack.is(Items.CARROT) || stack.is(Items.POTATO)) {
            amount = count; what = "food";
            if (!level.isClientSide) th.addFood(amount);
        } else if (stack.is(Items.BREAD)) {
            amount = count * 3; what = "food";
            if (!level.isClientSide) th.addFood(amount);
        } else if (stack.is(Items.GOLD_INGOT)) {
            amount = count * 5; what = "gold";
            if (!level.isClientSide) th.addGold(amount);
        } else if (stack.is(Items.EMERALD)) {
            amount = count * 10; what = "gold";
            if (!level.isClientSide) th.addGold(amount);
        } else {
            return ItemInteractionResult.PASS_TO_DEFAULT_BLOCK_INTERACTION;
        }
        if (!level.isClientSide) {
            if (!player.getAbilities().instabuild) {
                stack.shrink(count);
            }
            level.playSound(null, pos, SoundEvents.VILLAGER_YES, SoundSource.BLOCKS, 1.0f, 1.0f);
            player.displayClientMessage(Component.translatable("civilizations.townhall.deposited." + what, amount), true);
        }
        return ItemInteractionResult.sidedSuccess(level.isClientSide);
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

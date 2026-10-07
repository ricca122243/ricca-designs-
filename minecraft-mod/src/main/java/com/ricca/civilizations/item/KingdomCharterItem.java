package com.ricca.civilizations.item;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.block.TownHallBlockEntity;
import com.ricca.civilizations.entity.Profession;
import com.ricca.civilizations.entity.SettlerEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.Level;

import java.util.List;

/**
 * Королевская грамота. Кликните правой кнопкой по земле:
 * появится Ратуша и трое поселенцев, которые начнут строить дома.
 */
public class KingdomCharterItem extends Item {
    private static final int[][] SETTLER_OFFSETS = {{2, 0, 2}, {-2, 0, 2}, {2, 0, -2}, {-2, 0, -2}, {3, 0, 0}, {-3, 0, 0}, {0, 0, 3}, {0, 0, -3}};
    private static final Profession[] STARTING_PROFESSIONS = {Profession.BUILDER, Profession.BUILDER, Profession.BUILDER, Profession.LUMBERJACK, Profession.FARMER, Profession.WARRIOR, Profession.MINER, Profession.GUARD};

    public KingdomCharterItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResult useOn(UseOnContext context) {
        Level level = context.getLevel();
        Player player = context.getPlayer();
        if (player == null) {
            return InteractionResult.PASS;
        }

        BlockPos pos = context.getClickedPos().relative(context.getClickedFace());
        if (!level.getBlockState(pos).canBeReplaced()) {
            return InteractionResult.FAIL;
        }
        if (level.isClientSide) {
            return InteractionResult.SUCCESS;
        }

        String kingdomName = player.getName().getString();

        // Ставим ратушу
        level.setBlock(pos, Civilizations.TOWN_HALL.get().defaultBlockState(), 3);
        TownHallBlockEntity hall = TownHallBlockEntity.at(level, pos);
        if (hall != null) {
            hall.setKingdom(kingdomName);
        }

        // Призываем поселенцев
        for (int i = 0; i < SETTLER_OFFSETS.length; i++) {
            SettlerEntity settler = Civilizations.SETTLER.get().create(level);
            if (settler == null) {
                continue;
            }
            int[] o = SETTLER_OFFSETS[i];
            settler.moveTo(pos.getX() + 0.5 + o[0], pos.getY(), pos.getZ() + 0.5 + o[2], level.random.nextFloat() * 360f, 0f);
            settler.setTownHall(pos);
            settler.setKingdom(kingdomName);
            settler.setProfession(STARTING_PROFESSIONS[i]);
            settler.setPersistenceRequired();
            level.addFreshEntity(settler);
        }

        level.playSound(null, pos, SoundEvents.UI_TOAST_CHALLENGE_COMPLETE, SoundSource.PLAYERS, 1.0f, 1.0f);
        player.displayClientMessage(Component.translatable("civilizations.kingdom.founded", kingdomName), false);

        if (!player.getAbilities().instabuild) {
            context.getItemInHand().shrink(1);
        }
        // Основателю выдаётся жезл командира.
        giveItem(player, new ItemStack(Civilizations.COMMAND_STAFF.get()));
        giveItem(player, new ItemStack(Civilizations.KINGDOM_MAP.get()));
        return InteractionResult.CONSUME;
    }

    private static void giveItem(Player player, ItemStack stack) {
        if (!player.getInventory().add(stack)) {
            player.drop(stack, false);
        }
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable("item.civilizations.kingdom_charter.tooltip"));
    }
}

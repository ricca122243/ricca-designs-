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
        placeBanner(level, pos.above(), kingdomName);

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
        giveItem(player, new ItemStack(Civilizations.RULER_BOOK.get()));
        giveItem(player, new ItemStack(Civilizations.BLUEPRINT.get()));
        return InteractionResult.CONSUME;
    }

    /** Знамя королевства: цвет и два узора по имени — у каждого королевства свой флаг. */
    public static void placeBanner(Level level, BlockPos pos, String name) {
        net.minecraft.world.item.DyeColor[] colors = net.minecraft.world.item.DyeColor.values();
        int h = name.hashCode();
        net.minecraft.world.item.DyeColor base = colors[Math.floorMod(h, colors.length)];
        net.minecraft.world.item.DyeColor accent = colors[Math.floorMod(h >> 4, colors.length)];
        if (accent == base) accent = colors[Math.floorMod(h >> 4 + 1, colors.length)];
        net.minecraft.world.level.block.Block bannerBlock = net.minecraft.world.level.block.BannerBlock.byColor(base);
        if (!level.getBlockState(pos).canBeReplaced()) {
            return;
        }
        level.setBlock(pos, bannerBlock.defaultBlockState().setValue(net.minecraft.world.level.block.BannerBlock.ROTATION, Math.floorMod(h >> 8, 16)), 3);
        if (level.getBlockEntity(pos) instanceof net.minecraft.world.level.block.entity.BannerBlockEntity banner) {
            net.minecraft.resources.ResourceKey<net.minecraft.world.level.block.entity.BannerPattern>[] keys = new net.minecraft.resources.ResourceKey[]{
                    net.minecraft.world.level.block.entity.BannerPatterns.STRIPE_CENTER, net.minecraft.world.level.block.entity.BannerPatterns.CROSS,
                    net.minecraft.world.level.block.entity.BannerPatterns.RHOMBUS_MIDDLE, net.minecraft.world.level.block.entity.BannerPatterns.TRIANGLE_TOP,
                    net.minecraft.world.level.block.entity.BannerPatterns.STRIPE_DOWNRIGHT, net.minecraft.world.level.block.entity.BannerPatterns.CIRCLE_MIDDLE,
                    net.minecraft.world.level.block.entity.BannerPatterns.HALF_HORIZONTAL, net.minecraft.world.level.block.entity.BannerPatterns.STRAIGHT_CROSS,
                    net.minecraft.world.level.block.entity.BannerPatterns.STRIPE_TOP, net.minecraft.world.level.block.entity.BannerPatterns.CREEPER};
            var registry = level.registryAccess().lookupOrThrow(net.minecraft.core.registries.Registries.BANNER_PATTERN);
            net.minecraft.world.level.block.entity.BannerPatternLayers.Builder layers = new net.minecraft.world.level.block.entity.BannerPatternLayers.Builder();
            layers.add(registry.getOrThrow(keys[Math.floorMod(h >> 12, keys.length)]), accent);
            layers.add(registry.getOrThrow(keys[Math.floorMod(h >> 16, keys.length)]), colors[Math.floorMod(h >> 20, colors.length)]);
            ItemStack flag = new ItemStack(bannerBlock.asItem());
            flag.set(net.minecraft.core.component.DataComponents.BANNER_PATTERNS, layers.build());
            banner.fromItem(flag, base);
            banner.setChanged();
            level.sendBlockUpdated(pos, level.getBlockState(pos), level.getBlockState(pos), 3);
        }
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

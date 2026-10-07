package com.ricca.civilizations.item;

import com.ricca.civilizations.block.TownHallBlockEntity;
import com.ricca.civilizations.entity.Blueprint;
import com.ricca.civilizations.kingdom.KingdomSavedData;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.component.DataComponents;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.component.CustomData;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.Level;

import java.util.List;

/**
 * Чертёж: сами выбираете, где строить. Shift+клик в воздух — сменить тип постройки,
 * клик по земле — заказать постройку с углом в этой точке. Тип «карьер» переносит карьер шахтёров.
 */
public class BlueprintItem extends Item {
    private static final String[] TYPES = {"HOUSE", "WAREHOUSE", "PEN", "TOWER", "KEEP", "QUARRY"};

    public BlueprintItem(Properties properties) {
        super(properties);
    }

    private static int typeIndex(ItemStack stack) {
        CustomData data = stack.get(DataComponents.CUSTOM_DATA);
        return data == null ? 0 : Math.floorMod(data.copyTag().getInt("Type"), TYPES.length);
    }

    private static void setTypeIndex(ItemStack stack, int idx) {
        CompoundTag tag = new CompoundTag();
        tag.putInt("Type", Math.floorMod(idx, TYPES.length));
        stack.set(DataComponents.CUSTOM_DATA, CustomData.of(tag));
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (!level.isClientSide) {
            setTypeIndex(stack, typeIndex(stack) + 1);
            player.displayClientMessage(Component.translatable("civilizations.blueprint.type",
                    Component.translatable("civilizations.blueprint." + TYPES[typeIndex(stack)].toLowerCase())), true);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
    }

    @Override
    public InteractionResult useOn(UseOnContext context) {
        Level level = context.getLevel();
        Player player = context.getPlayer();
        if (player == null) return InteractionResult.PASS;
        if (!(level instanceof ServerLevel serverLevel)) return InteractionResult.SUCCESS;
        String me = player.getName().getString();
        TownHallBlockEntity hall = null;
        double bestD = 160.0 * 160.0;
        for (BlockPos pos : KingdomSavedData.get(serverLevel).halls(serverLevel)) {
            TownHallBlockEntity h = TownHallBlockEntity.at(level, pos);
            if (h == null || !h.getKingdom().equals(me)) continue;
            double d = pos.distSqr(context.getClickedPos());
            if (d < bestD) { bestD = d; hall = h; }
        }
        if (hall == null) {
            player.displayClientMessage(Component.translatable("civilizations.cmd.no_kingdom").withStyle(ChatFormatting.RED), false);
            return InteractionResult.CONSUME;
        }
        BlockPos origin = context.getClickedPos().relative(context.getClickedFace());
        String type = TYPES[typeIndex(context.getItemInHand())];
        if (type.equals("QUARRY")) {
            hall.setQuarryOrigin(origin);
            player.displayClientMessage(Component.translatable("civilizations.blueprint.quarry_set", origin.getX(), origin.getY(), origin.getZ()), false);
            return InteractionResult.CONSUME;
        }
        Blueprint bp = hall.orderAt(Blueprint.Type.valueOf(type), origin);
        player.displayClientMessage(Component.translatable("civilizations.blueprint.ordered",
                Component.translatable("civilizations.blueprint." + type.toLowerCase()), origin.getX(), origin.getY(), origin.getZ(),
                bp.totalWood(), bp.totalStone()), false);
        return InteractionResult.CONSUME;
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable("civilizations.blueprint.type", Component.translatable("civilizations.blueprint." + TYPES[typeIndex(stack)].toLowerCase())));
        tooltip.add(Component.translatable("item.civilizations.blueprint.tooltip").withStyle(ChatFormatting.GRAY));
    }
}

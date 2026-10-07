package com.ricca.civilizations.item;

import com.ricca.civilizations.block.TownHallBlockEntity;
import com.ricca.civilizations.client.ClientHooks;
import com.ricca.civilizations.kingdom.KingdomSavedData;
import net.minecraft.core.BlockPos;
import net.minecraft.core.component.DataComponents;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.component.CustomData;
import net.minecraft.world.level.Level;

import javax.annotation.Nullable;
import java.util.List;

/** Карта земель. Сервер записывает в предмет список королевств, клиент рисует экран. */
public class KingdomMapItem extends Item {
    public KingdomMapItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (level instanceof ServerLevel serverLevel) {
            writeData(stack, serverLevel, player);
        } else {
            ClientHooks.openKingdomMap();
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
    }

    private static void writeData(ItemStack stack, ServerLevel level, Player player) {
        CompoundTag tag = new CompoundTag();
        tag.putInt("PX", player.getBlockX());
        tag.putInt("PZ", player.getBlockZ());
        tag.putString("Me", player.getName().getString());
        ListTag list = new ListTag();
        for (BlockPos pos : KingdomSavedData.get(level).halls(level)) {
            TownHallBlockEntity hall = TownHallBlockEntity.at(level, pos);
            CompoundTag k = new CompoundTag();
            k.putString("Name", hall != null && !hall.getKingdom().isEmpty() ? hall.getKingdom() : "?");
            k.putInt("X", pos.getX());
            k.putInt("Z", pos.getZ());
            k.putInt("R", hall != null ? hall.territoryRadius() : 20);
            k.putInt("Pop", hall != null ? hall.settlers(level).size() : 0);
            k.putInt("Houses", hall != null ? hall.getHousesBuilt() : 0);
            k.putBoolean("Npc", hall != null && hall.isNpc());
            list.add(k);
        }
        tag.put("Kingdoms", list);
        stack.set(DataComponents.CUSTOM_DATA, CustomData.of(tag));
    }

    @Nullable
    public static CompoundTag readData(ItemStack stack) {
        CustomData data = stack.get(DataComponents.CUSTOM_DATA);
        return data == null ? null : data.copyTag();
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable("item.civilizations.kingdom_map.tooltip"));
    }
}

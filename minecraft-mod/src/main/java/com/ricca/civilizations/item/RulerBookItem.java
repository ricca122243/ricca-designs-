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

/** Книга правителя: окно с вкладками для управления королевством без команд. */
public class RulerBookItem extends Item {
    public RulerBookItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (level instanceof ServerLevel serverLevel) {
            writeData(stack, serverLevel, player);
        } else {
            ClientHooks.openRulerBook();
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
    }

    /** Сервер записывает в книгу сводку своего королевства и список соседей. */
    public static void writeData(ItemStack stack, ServerLevel level, Player player) {
        String me = player.getName().getString();
        KingdomSavedData data = KingdomSavedData.get(level);
        CustomData old = stack.get(DataComponents.CUSTOM_DATA);
        CompoundTag tag = old == null ? new CompoundTag() : old.copyTag();
        tag.putString("Me", me);
        TownHallBlockEntity mine = null;
        double bestD = Double.MAX_VALUE;
        ListTag list = new ListTag();
        for (BlockPos pos : data.halls(level)) {
            TownHallBlockEntity hall = TownHallBlockEntity.at(level, pos);
            if (hall == null) continue;
            if (hall.getKingdom().equals(me)) {
                double d = pos.distSqr(player.blockPosition());
                if (d < bestD) { bestD = d; mine = hall; }
                continue;
            }
            CompoundTag k = new CompoundTag();
            k.putString("Name", hall.getKingdom());
            k.putInt("Rel", data.relation(hall.getKingdom(), me));
            k.putInt("Dist", (int) Math.sqrt(pos.distSqr(player.blockPosition())));
            k.putBoolean("Npc", hall.isNpc());
            k.putInt("Defenders", hall.countDefenders(level));
            list.add(k);
        }
        tag.put("Kingdoms", list);
        if (mine != null) {
            tag.putBoolean("HasKingdom", true);
            tag.putString("Kingdom", mine.getKingdom());
            tag.putInt("Gold", mine.getGold());
            tag.putInt("Wood", mine.getWood());
            tag.putInt("Stone", mine.getStone());
            tag.putInt("Food", mine.getFood());
            tag.putInt("Iron", mine.getIron());
            tag.putInt("Pop", mine.settlers(level).size());
            tag.putInt("Soldiers", mine.countDefenders(level));
            tag.putInt("Houses", mine.getHousesBuilt());
            tag.putInt("Tier", mine.getTier());
            tag.putInt("Arms", mine.getArms());
            tag.putInt("Tax", mine.getTaxRate());
            tag.putInt("Villages", data.villagesOwnedBy(me));
            tag.putString("Buildings", (mine.isWarehouseBuilt() ? "W" : "") + (mine.isPenBuilt() ? "P" : "") + (mine.isTowerBuilt() ? "T" : "")
                    + (mine.isWallBuilt() ? "S" : ""));
        } else {
            tag.putBoolean("HasKingdom", false);
        }
        stack.set(DataComponents.CUSTOM_DATA, CustomData.of(tag));
    }

    @Nullable
    public static CompoundTag readData(ItemStack stack) {
        CustomData data = stack.get(DataComponents.CUSTOM_DATA);
        return data == null ? null : data.copyTag();
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable("item.civilizations.ruler_book.tooltip"));
    }
}

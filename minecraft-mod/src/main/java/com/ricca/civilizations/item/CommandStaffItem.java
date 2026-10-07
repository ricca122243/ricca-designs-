package com.ricca.civilizations.item;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.block.TownHallBlockEntity;
import com.ricca.civilizations.entity.Blueprint;
import net.minecraft.world.item.Items;
import com.ricca.civilizations.entity.Profession;
import com.ricca.civilizations.entity.SettlerEntity;
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
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.component.CustomData;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.Level;

import javax.annotation.Nullable;
import java.util.List;
import java.util.UUID;

/**
 * Жезл командира. Каждый игрок управляет жителями своим жезлом:
 *  - клик по жителю: выбрать его; клик по выбранному: следовать за мной / освободить;
 *  - Shift + клик по жителю: сменить профессию;
 *  - клик по земле: отправить выбранного жителя туда (стражник там встанет на пост);
 *  - клик по ратуше: сводка; Shift + клик по ратуше: нанять строителя за золото;
 *  - клик в воздух: список королевств вокруг.
 */
public class CommandStaffItem extends Item {
    private static final String SELECTED_KEY = "SelectedSettler";
    public static final int HIRE_COST = 50;

    public CommandStaffItem(Properties properties) {
        super(properties);
    }

    // --- Клик по жителю ---

    @Override
    public InteractionResult interactLivingEntity(ItemStack stack, Player player, LivingEntity target, InteractionHand hand) {
        if (!(target instanceof SettlerEntity settler)) {
            return InteractionResult.PASS;
        }
        if (player.level().isClientSide) {
            return InteractionResult.SUCCESS;
        }
        // В творческом режиме сюда приходит копия жезла, поэтому пишем в настоящий предмет из руки.
        stack = player.getItemInHand(hand);

        if (player.isShiftKeyDown()) {
            Profession next = Profession.byId(settler.getProfession().ordinal() + 1);
            ItemStack off = player.getOffhandItem();
            if (off.is(Items.BOW)) next = Profession.ARCHER;
            else if (off.is(Items.IRON_SWORD) || off.is(Items.STONE_SWORD)) next = Profession.WARRIOR;
            else if (off.is(Items.SHIELD)) next = Profession.GUARD;
            else if (off.is(Items.WOODEN_PICKAXE) || off.is(Items.STONE_PICKAXE) || off.is(Items.IRON_PICKAXE)) next = Profession.MINER;
            else if (off.is(Items.WOODEN_AXE) || off.is(Items.STONE_AXE) || off.is(Items.IRON_AXE)) next = Profession.LUMBERJACK;
            else if (off.is(Items.WOODEN_HOE) || off.is(Items.STONE_HOE) || off.is(Items.IRON_HOE)) next = Profession.FARMER;
            else if (off.is(Items.OAK_PLANKS)) next = Profession.BUILDER;
            settler.setProfession(next);
            settler.setProject(null, -1);
            say(player, Component.translatable("civilizations.staff.profession_changed", settler.getDisplayName()));
            return InteractionResult.CONSUME;
        }

        UUID selected = getSelected(stack);
        if (selected == null || !selected.equals(settler.getUUID())) {
            setSelected(stack, settler.getUUID());
            say(player, Component.translatable("civilizations.staff.selected", settler.getDisplayName()));
            return InteractionResult.CONSUME;
        }

        // Уже выбран: переключаем «следовать» / «свободен»
        if (settler.getFollowPlayer() != null || settler.getOrderPos() != null) {
            settler.setFollowPlayer(null);
            settler.setOrderPos(null);
            say(player, Component.translatable("civilizations.staff.released", settler.getDisplayName()));
        } else {
            settler.setOrderPos(null);
            settler.setFollowPlayer(player.getUUID());
            say(player, Component.translatable("civilizations.staff.following", settler.getDisplayName()));
        }
        return InteractionResult.CONSUME;
    }

    // --- Клик по блоку ---

    @Override
    public InteractionResult useOn(UseOnContext context) {
        Level level = context.getLevel();
        Player player = context.getPlayer();
        if (player == null) {
            return InteractionResult.PASS;
        }
        if (level.isClientSide) {
            return InteractionResult.SUCCESS;
        }
        BlockPos clicked = context.getClickedPos();

        // Ратуша
        if (level.getBlockState(clicked).is(Civilizations.TOWN_HALL.get())) {
            TownHallBlockEntity hall = TownHallBlockEntity.at(level, clicked);
            if (hall == null) {
                return InteractionResult.PASS;
            }
            if (player.isShiftKeyDown()) {
                String mine = player.getName().getString();
                if (hall.getKingdom().isEmpty() || hall.getKingdom().equals(mine)) {
                    // Заказ постройки: что в левой руке, то и строим.
                    ItemStack off = player.getOffhandItem();
                    Blueprint.Type orderType = off.is(Items.COBBLESTONE) ? Blueprint.Type.WALL
                            : off.is(Items.OAK_PLANKS) ? Blueprint.Type.HOUSE
                            : off.is(Items.CHEST) ? Blueprint.Type.WAREHOUSE : null;
                    if (orderType != null) {
                        Blueprint bp = hall.order(orderType);
                        say(player, Component.translatable("civilizations.staff.ordered." + orderType.name().toLowerCase(),
                                bp.totalWood(), bp.totalStone(), hall.getWood(), hall.getStone()));
                        return InteractionResult.CONSUME;
                    }
                    if (hall.hire(Profession.BUILDER, HIRE_COST)) {
                        say(player, Component.translatable("civilizations.staff.hired", HIRE_COST));
                    } else {
                        say(player, Component.translatable("civilizations.staff.no_gold", HIRE_COST, hall.getGold()).withStyle(ChatFormatting.RED));
                    }
                } else if (level instanceof ServerLevel serverLevel) {
                    // Чужая ратуша: захват, если защитников не осталось.
                    int defenders = hall.countDefenders(serverLevel);
                    if (defenders > 0) {
                        say(player, Component.translatable("civilizations.capture.defended", hall.getKingdom(), defenders).withStyle(ChatFormatting.RED));
                    } else {
                        hall.capture(serverLevel, mine);
                    }
                }
            } else {
                hall.sendStats(player);
            }
            return InteractionResult.CONSUME;
        }

        // Отправить выбранного жителя
        SettlerEntity settler = findSelected(context.getItemInHand(), level);
        if (settler == null) {
            say(player, Component.translatable("civilizations.staff.none_selected").withStyle(ChatFormatting.GRAY));
            return InteractionResult.CONSUME;
        }
        BlockPos target = clicked.relative(context.getClickedFace());
        settler.setFollowPlayer(null);
        settler.setOrderPos(target);
        if (settler.getProfession() == Profession.GUARD) {
            settler.setGuardPost(target);
            say(player, Component.translatable("civilizations.staff.guard_post", settler.getDisplayName()));
        } else {
            say(player, Component.translatable("civilizations.staff.sent", settler.getDisplayName()));
        }
        return InteractionResult.CONSUME;
    }

    // --- Клик в воздух: список королевств ---

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (!(level instanceof ServerLevel serverLevel)) {
            return InteractionResultHolder.success(stack);
        }
        List<BlockPos> halls = KingdomSavedData.get(serverLevel).halls(serverLevel);
        if (halls.isEmpty()) {
            say(player, Component.translatable("civilizations.staff.no_kingdoms").withStyle(ChatFormatting.GRAY));
            return InteractionResultHolder.consume(stack);
        }
        say(player, Component.translatable("civilizations.staff.kingdoms_title").withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD));
        for (BlockPos pos : halls) {
            TownHallBlockEntity hall = TownHallBlockEntity.at(level, pos);
            String name = hall != null && !hall.getKingdom().isEmpty() ? hall.getKingdom() : "?";
            int distance = (int) Math.sqrt(player.blockPosition().distSqr(pos));
            say(player, Component.translatable("civilizations.staff.kingdom_line", name, distance, direction(player.blockPosition(), pos),
                    pos.getX(), pos.getY(), pos.getZ()));
        }
        return InteractionResultHolder.consume(stack);
    }

    private static String direction(BlockPos from, BlockPos to) {
        int dx = to.getX() - from.getX();
        int dz = to.getZ() - from.getZ();
        if (Math.abs(dx) < 4 && Math.abs(dz) < 4) {
            return "·";
        }
        double angle = Math.toDegrees(Math.atan2(dz, dx)); // 0 = восток, 90 = юг
        String[] names = {"E", "SE", "S", "SW", "W", "NW", "N", "NE"};
        int idx = (int) Math.floor(((angle + 22.5 + 360) % 360) / 45.0);
        return names[idx];
    }

    // --- Выбранный житель хранится в самом жезле ---

    @Nullable
    private static UUID getSelected(ItemStack stack) {
        CustomData data = stack.get(DataComponents.CUSTOM_DATA);
        if (data == null) {
            return null;
        }
        CompoundTag tag = data.copyTag();
        return tag.hasUUID(SELECTED_KEY) ? tag.getUUID(SELECTED_KEY) : null;
    }

    private static void setSelected(ItemStack stack, UUID uuid) {
        CompoundTag tag = new CompoundTag();
        tag.putUUID(SELECTED_KEY, uuid);
        stack.set(DataComponents.CUSTOM_DATA, CustomData.of(tag));
    }

    @Nullable
    private static SettlerEntity findSelected(ItemStack stack, Level level) {
        UUID uuid = getSelected(stack);
        if (uuid == null || !(level instanceof ServerLevel serverLevel)) {
            return null;
        }
        Entity entity = serverLevel.getEntity(uuid);
        return entity instanceof SettlerEntity settler && settler.isAlive() ? settler : null;
    }

    private static void say(Player player, Component message) {
        player.displayClientMessage(message, false);
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable("item.civilizations.command_staff.tooltip1").withStyle(ChatFormatting.GRAY));
        tooltip.add(Component.translatable("item.civilizations.command_staff.tooltip2").withStyle(ChatFormatting.GRAY));
        tooltip.add(Component.translatable("item.civilizations.command_staff.tooltip3").withStyle(ChatFormatting.GRAY));
    }
}

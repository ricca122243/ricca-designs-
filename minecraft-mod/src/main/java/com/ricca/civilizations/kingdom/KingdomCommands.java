package com.ricca.civilizations.kingdom;

import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.context.CommandContext;
import com.ricca.civilizations.block.TownHallBlockEntity;
import com.ricca.civilizations.entity.Blueprint;
import com.ricca.civilizations.entity.Profession;
import com.ricca.civilizations.entity.SettlerEntity;
import com.ricca.civilizations.item.CommandStaffItem;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.RegisterCommandsEvent;

import javax.annotation.Nullable;

/** Команды /kingdom ... — их же вызывает меню управления. */
public class KingdomCommands {
    @SubscribeEvent
    public void onRegister(RegisterCommandsEvent event) {
        event.getDispatcher().register(Commands.literal("kingdom")
                .then(Commands.literal("hire").then(Commands.argument("profession", StringArgumentType.word()).executes(KingdomCommands::hire)))
                .then(Commands.literal("build").then(Commands.argument("type", StringArgumentType.word()).executes(KingdomCommands::build)))
                .then(Commands.literal("rally").executes(KingdomCommands::rally))
                .then(Commands.literal("home").executes(KingdomCommands::home))
                .then(Commands.literal("stats").executes(KingdomCommands::stats))
                .then(Commands.literal("list").executes(KingdomCommands::list)));
    }

    @Nullable
    private static TownHallBlockEntity myHall(ServerPlayer player) {
        ServerLevel level = player.serverLevel();
        String me = player.getName().getString();
        TownHallBlockEntity best = null;
        double bestD = Double.MAX_VALUE;
        for (BlockPos pos : KingdomSavedData.get(level).halls(level)) {
            TownHallBlockEntity hall = TownHallBlockEntity.at(level, pos);
            if (hall == null || !hall.getKingdom().equals(me)) continue;
            double d = pos.distSqr(player.blockPosition());
            if (d < bestD) {
                bestD = d;
                best = hall;
            }
        }
        if (best == null) {
            player.displayClientMessage(Component.translatable("civilizations.cmd.no_kingdom").withStyle(ChatFormatting.RED), false);
        }
        return best;
    }

    private static int hire(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity hall = myHall(player);
        if (hall == null) return 0;
        Profession profession;
        try {
            profession = Profession.valueOf(StringArgumentType.getString(ctx, "profession").toUpperCase());
        } catch (IllegalArgumentException e) {
            return 0;
        }
        if (hall.hire(profession, CommandStaffItem.HIRE_COST)) {
            player.displayClientMessage(Component.translatable("civilizations.cmd.hired", Component.translatable("entity.civilizations.settler." + profession.key()), CommandStaffItem.HIRE_COST), false);
        } else {
            player.displayClientMessage(Component.translatable("civilizations.staff.no_gold", CommandStaffItem.HIRE_COST, hall.getGold()).withStyle(ChatFormatting.RED), false);
        }
        return 1;
    }

    private static int build(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity hall = myHall(player);
        if (hall == null) return 0;
        Blueprint.Type type;
        try {
            type = Blueprint.Type.valueOf(StringArgumentType.getString(ctx, "type").toUpperCase());
        } catch (IllegalArgumentException e) {
            return 0;
        }
        Blueprint bp = hall.order(type);
        player.displayClientMessage(Component.translatable("civilizations.staff.ordered." + type.name().toLowerCase(),
                bp.totalWood(), bp.totalStone(), hall.getWood(), hall.getStone()), false);
        return 1;
    }

    private static int rally(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity hall = myHall(player);
        if (hall == null) return 0;
        int n = 0;
        for (SettlerEntity s : hall.settlers(player.serverLevel())) {
            if (s.isWarrior() && s.getProfession() != Profession.GUARD) {
                s.setOrderPos(null);
                s.setFollowPlayer(player.getUUID());
                n++;
            }
        }
        player.displayClientMessage(Component.translatable("civilizations.cmd.rally", n), false);
        return 1;
    }

    private static int home(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity hall = myHall(player);
        if (hall == null) return 0;
        for (SettlerEntity s : hall.settlers(player.serverLevel())) {
            s.setOrderPos(null);
            s.setFollowPlayer(null);
        }
        player.displayClientMessage(Component.translatable("civilizations.cmd.home"), false);
        return 1;
    }

    private static int stats(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity hall = myHall(player);
        if (hall == null) return 0;
        hall.sendStats(player);
        return 1;
    }

    private static int list(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        ServerLevel level = player.serverLevel();
        KingdomSavedData data = KingdomSavedData.get(level);
        player.displayClientMessage(Component.translatable("civilizations.staff.kingdoms_title").withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD), false);
        for (BlockPos pos : data.halls(level)) {
            TownHallBlockEntity hall = TownHallBlockEntity.at(level, pos);
            String name = hall != null && !hall.getKingdom().isEmpty() ? hall.getKingdom() : "?";
            int distance = (int) Math.sqrt(player.blockPosition().distSqr(pos));
            int rel = data.relation(name, player.getName().getString());
            player.displayClientMessage(Component.translatable("civilizations.cmd.kingdom_line", name, distance, pos.getX(), pos.getZ(), rel), false);
        }
        return 1;
    }
}

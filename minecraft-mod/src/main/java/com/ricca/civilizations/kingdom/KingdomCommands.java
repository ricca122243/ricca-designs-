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
                .then(Commands.literal("list").executes(KingdomCommands::list))
                .then(Commands.literal("rename").then(Commands.argument("name", StringArgumentType.word()).executes(KingdomCommands::rename)))
                .then(Commands.literal("tax").then(Commands.argument("rate", StringArgumentType.word()).executes(KingdomCommands::tax)))
                .then(Commands.literal("war").then(Commands.argument("name", StringArgumentType.word()).executes(ctx -> relation(ctx, -60))))
                .then(Commands.literal("peace").then(Commands.argument("name", StringArgumentType.word()).executes(ctx -> relation(ctx, 0))))
                .then(Commands.literal("gift").then(Commands.argument("name", StringArgumentType.word()).then(Commands.argument("gold", com.mojang.brigadier.arguments.IntegerArgumentType.integer(1, 500)).executes(KingdomCommands::gift))))
                .then(Commands.literal("where").executes(KingdomCommands::where))
                .then(Commands.literal("summon").executes(KingdomCommands::summon))
                .then(Commands.literal("quota").then(Commands.argument("resource", StringArgumentType.word()).then(Commands.argument("amount", com.mojang.brigadier.arguments.IntegerArgumentType.integer(0, 100000)).executes(KingdomCommands::quota))))
                .then(Commands.literal("view").executes(KingdomCommands::view)));
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
            if (s.isSoldier()) {
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

    private static int rename(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity hall = myHall(player);
        if (hall == null) return 0;
        String name = StringArgumentType.getString(ctx, "name");
        hall.rename(player.serverLevel(), name);
        player.displayClientMessage(Component.translatable("civilizations.cmd.renamed", name), false);
        return 1;
    }

    private static int tax(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity hall = myHall(player);
        if (hall == null) return 0;
        String rate = StringArgumentType.getString(ctx, "rate").toLowerCase();
        int r = rate.startsWith("l") || rate.startsWith("н") ? 0 : rate.startsWith("h") || rate.startsWith("в") ? 2 : 1;
        hall.setTaxRate(r);
        player.displayClientMessage(Component.translatable("civilizations.cmd.tax", Component.translatable("civilizations.tax." + r)), false);
        return 1;
    }

    @Nullable
    private static TownHallBlockEntity hallByName(ServerLevel level, String name) {
        for (BlockPos pos : KingdomSavedData.get(level).halls(level)) {
            TownHallBlockEntity hall = TownHallBlockEntity.at(level, pos);
            if (hall != null && hall.getKingdom().equalsIgnoreCase(name)) return hall;
        }
        return null;
    }

    /** Война: отношения −60. Мир: отношения 0, стоит 50 золота, НПС соглашается, если его армия не больше вашей. */
    private static int relation(CommandContext<CommandSourceStack> ctx, int target) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity mine = myHall(player);
        if (mine == null) return 0;
        ServerLevel level = player.serverLevel();
        TownHallBlockEntity other = hallByName(level, StringArgumentType.getString(ctx, "name"));
        if (other == null) {
            player.displayClientMessage(Component.translatable("civilizations.cmd.unknown").withStyle(ChatFormatting.RED), false);
            return 0;
        }
        KingdomSavedData data = KingdomSavedData.get(level);
        String me = player.getName().getString();
        if (target < 0) {
            data.adjustRelation(me, other.getKingdom(), target - data.relation(me, other.getKingdom()));
            level.getServer().getPlayerList().broadcastSystemMessage(Component.translatable("civilizations.cmd.war", me, other.getKingdom()).withStyle(ChatFormatting.RED), false);
            return 1;
        }
        if (mine.getGold() < 50) {
            player.displayClientMessage(Component.translatable("civilizations.staff.no_gold", 50, mine.getGold()).withStyle(ChatFormatting.RED), false);
            return 0;
        }
        if (other.countDefenders(level) > mine.countDefenders(level)) {
            player.displayClientMessage(Component.translatable("civilizations.cmd.peace_refused", other.getKingdom()).withStyle(ChatFormatting.RED), false);
            return 0;
        }
        mine.addGold(-50);
        data.adjustRelation(me, other.getKingdom(), -data.relation(me, other.getKingdom()));
        level.getServer().getPlayerList().broadcastSystemMessage(Component.translatable("civilizations.cmd.peace", me, other.getKingdom()).withStyle(ChatFormatting.GREEN), false);
        return 1;
    }

    private static int gift(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity mine = myHall(player);
        if (mine == null) return 0;
        ServerLevel level = player.serverLevel();
        TownHallBlockEntity other = hallByName(level, StringArgumentType.getString(ctx, "name"));
        int gold = com.mojang.brigadier.arguments.IntegerArgumentType.getInteger(ctx, "gold");
        if (other == null) {
            player.displayClientMessage(Component.translatable("civilizations.cmd.unknown").withStyle(ChatFormatting.RED), false);
            return 0;
        }
        if (mine.getGold() < gold) {
            player.displayClientMessage(Component.translatable("civilizations.staff.no_gold", gold, mine.getGold()).withStyle(ChatFormatting.RED), false);
            return 0;
        }
        mine.addGold(-gold);
        int rel = other.receiveGift(level, player.getName().getString(), gold / 5);
        player.displayClientMessage(Component.translatable("civilizations.gift", other.getKingdom(), rel), false);
        return 1;
    }

    private static int where(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity hall = myHall(player);
        if (hall == null) return 0;
        BlockPos p = hall.getBlockPos();
        player.displayClientMessage(Component.translatable("civilizations.cmd.where", p.getX(), p.getY(), p.getZ(),
                (int) Math.sqrt(p.distSqr(player.blockPosition()))), false);
        return 1;
    }

    /** Собрать всех жителей у ратуши (например, перед набегом). */
    private static int summon(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity hall = myHall(player);
        if (hall == null) return 0;
        int n = 0;
        for (SettlerEntity s : hall.settlers(player.serverLevel())) {
            s.setFollowPlayer(null);
            s.setOrderPos(hall.getBlockPos().offset(player.serverLevel().random.nextInt(7) - 3, 0, player.serverLevel().random.nextInt(7) - 3));
            n++;
        }
        player.displayClientMessage(Component.translatable("civilizations.cmd.summon", n), false);
        return 1;
    }

    private static int quota(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        TownHallBlockEntity hall = myHall(player);
        if (hall == null) return 0;
        String res = StringArgumentType.getString(ctx, "resource").toLowerCase();
        int amount = com.mojang.brigadier.arguments.IntegerArgumentType.getInteger(ctx, "amount");
        hall.setQuota(res, amount);
        player.displayClientMessage(Component.translatable("civilizations.quota.set", Component.translatable("civilizations.res." + res), amount, hall.quotaText()), false);
        return 1;
    }

    /** Вид сверху: включает полёт, чтобы смотреть на королевство как полководец. Повторно — выключает. */
    private static int view(CommandContext<CommandSourceStack> ctx) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        ServerPlayer player = ctx.getSource().getPlayerOrException();
        if (player.isCreative() || player.isSpectator()) {
            player.displayClientMessage(Component.translatable("civilizations.view.creative"), false);
            return 1;
        }
        boolean on = !player.getAbilities().mayfly;
        player.getAbilities().mayfly = on;
        player.getAbilities().flying = on;
        player.onUpdateAbilities();
        if (on) {
            player.teleportTo(player.getX(), player.getY() + 20, player.getZ());
        }
        player.displayClientMessage(Component.translatable(on ? "civilizations.view.on" : "civilizations.view.off"), false);
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

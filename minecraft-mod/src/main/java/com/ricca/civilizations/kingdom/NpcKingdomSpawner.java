package com.ricca.civilizations.kingdom;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.block.TownHallBlockEntity;
import com.ricca.civilizations.entity.Profession;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.SectionPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.levelgen.Heightmap;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;

import com.ricca.civilizations.entity.SettlerEntity;
import javax.annotation.Nullable;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * При первом входе игрока в мир создаёт три компьютерных королевства в разных сторонах.
 * Чанки подгружаются фоном (форс-загрузка), ратуша ставится, когда участок готов, —
 * без зависания сервера при входе.
 */
public class NpcKingdomSpawner {
    private static final String[] NAMES = {"Astria", "Valdor", "Karnelia"};
    private static final int MIN_DISTANCE = 200;
    private static final int EXTRA_DISTANCE = 120;
    private static final Profession[] STARTING = {
            Profession.BUILDER, Profession.BUILDER, Profession.LUMBERJACK, Profession.FARMER,
            Profession.MINER, Profession.WARRIOR, Profession.WARRIOR, Profession.GUARD, Profession.GUARD
    };

    /** Участок, который ждёт загрузки чанков. */
    private static final class Pending {
        final String name;
        int x;
        int z;
        int attempts;
        /** Жители, которые переселяются в новое королевство (раскол). */
        final List<java.util.UUID> movers = new ArrayList<>();
        @Nullable String parent;
        Pending(String name, int x, int z) { this.name = name; this.x = x; this.z = z; }
    }

    private static final List<Pending> pending = new ArrayList<>();
    private static boolean initialDone = false;

    /** Раскол: часть жителей уходит и основывает новое королевство неподалёку. */
    public static void scheduleSplit(ServerLevel level, BlockPos from, String parent, String name, List<SettlerEntity> movers) {
        double angle = level.random.nextDouble() * Math.PI * 2;
        double dist = 90 + level.random.nextDouble() * 60;
        Pending p = new Pending(name, from.getX() + (int) (Math.cos(angle) * dist), from.getZ() + (int) (Math.sin(angle) * dist));
        p.parent = parent;
        for (SettlerEntity s : movers) {
            p.movers.add(s.getUUID());
            s.setKingdom(name);
            s.setTownHall(null);
        }
        pending.add(p);
        forceChunks(level, p.x, p.z, true);
    }
    private int tickCounter = 0;

    @SubscribeEvent
    public void onPlayerJoin(PlayerEvent.PlayerLoggedInEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer player)) {
            return;
        }
        ServerLevel level = player.serverLevel();
        if (level.dimension() != Level.OVERWORLD) {
            return;
        }
        KingdomSavedData data = KingdomSavedData.get(level);
        if (data.isNpcSpawned() || initialDone) {
            return;
        }
        initialDone = true;
        BlockPos origin = player.blockPosition();
        double baseAngle = level.random.nextDouble() * Math.PI * 2;
        for (int i = 0; i < NAMES.length; i++) {
            double angle = baseAngle + i * (Math.PI * 2 / NAMES.length);
            double dist = MIN_DISTANCE + level.random.nextDouble() * EXTRA_DISTANCE;
            Pending p = new Pending(NAMES[i], origin.getX() + (int) (Math.cos(angle) * dist), origin.getZ() + (int) (Math.sin(angle) * dist));
            pending.add(p);
            forceChunks(level, p.x, p.z, true);
        }
    }

    @SubscribeEvent
    public void onServerTick(ServerTickEvent.Post event) {
        if (pending.isEmpty() || ++tickCounter % 20 != 0) {
            return;
        }
        ServerLevel level = event.getServer().overworld();
        Iterator<Pending> it = pending.iterator();
        while (it.hasNext()) {
            Pending p = it.next();
            if (!level.isLoaded(new BlockPos(p.x, 64, p.z))) {
                continue; // чанк ещё грузится
            }
            int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, p.x, p.z);
            BlockPos pos = new BlockPos(p.x, y, p.z);
            boolean ok = isGoodSite(level, pos);
            if (!ok && p.attempts < 10) {
                // Вода или горы — сдвигаем участок и ждём новые чанки.
                forceChunks(level, p.x, p.z, false);
                p.attempts++;
                p.x += level.random.nextInt(81) - 40;
                p.z += level.random.nextInt(81) - 40;
                forceChunks(level, p.x, p.z, true);
                continue;
            }
            foundKingdom(level, pos, p.name, p.movers, p.parent);
            it.remove();
        }
        if (pending.isEmpty() && !KingdomSavedData.get(level).isNpcSpawned()) {
            KingdomSavedData.get(level).setNpcSpawned(true);
            level.getServer().getPlayerList().broadcastSystemMessage(
                    Component.translatable("civilizations.npc.spawned", NAMES[0], NAMES[1], NAMES[2]).withStyle(ChatFormatting.GOLD), false);
        }
    }

    /** Участок годится, если вокруг (±16 блоков) суша и перепад высот небольшой. */
    private static boolean isGoodSite(ServerLevel level, BlockPos center) {
        int minY = Integer.MAX_VALUE;
        int maxY = Integer.MIN_VALUE;
        for (int dx = -16; dx <= 16; dx += 8) {
            for (int dz = -16; dz <= 16; dz += 8) {
                int x = center.getX() + dx;
                int z = center.getZ() + dz;
                if (!level.isLoaded(new BlockPos(x, 64, z))) {
                    return false;
                }
                int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
                BlockState ground = level.getBlockState(new BlockPos(x, y - 1, z));
                if (ground.liquid() || ground.is(Blocks.ICE) || ground.is(Blocks.PACKED_ICE)) {
                    return false;
                }
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
        return maxY - minY <= 8;
    }

    private static void forceChunks(ServerLevel level, int x, int z, boolean force) {
        int cx = SectionPos.blockToSectionCoord(x);
        int cz = SectionPos.blockToSectionCoord(z);
        for (int dx = -2; dx <= 2; dx++) {
            for (int dz = -2; dz <= 2; dz++) {
                level.setChunkForced(cx + dx, cz + dz, force);
            }
        }
    }

    private static void foundKingdom(ServerLevel level, BlockPos pos, String name, List<java.util.UUID> movers, @Nullable String parent) {
        level.setBlock(pos, Civilizations.TOWN_HALL.get().defaultBlockState(), 3);
        TownHallBlockEntity hall = TownHallBlockEntity.at(level, pos);
        if (hall == null) {
            return;
        }
        hall.setupNpc(name);
        KingdomSavedData data = KingdomSavedData.get(level);
        if (movers.isEmpty()) {
            hall.buildStarterSettlement();
            for (Profession profession : STARTING) {
                hall.spawnStartingSettler(profession);
            }
        } else {
            // Раскол: переселенцы телепортируются к новой ратуше.
            int i = 0;
            for (java.util.UUID id : movers) {
                if (level.getEntity(id) instanceof SettlerEntity s && s.isAlive()) {
                    double angle = i++ * 1.3;
                    s.teleportTo(pos.getX() + 0.5 + Math.cos(angle) * 2, pos.getY(), pos.getZ() + 0.5 + Math.sin(angle) * 2);
                    s.setTownHall(pos);
                    s.setKingdom(name);
                    s.setOrderPos(null);
                    s.setProject(null, -1);
                }
            }
            if (parent != null) {
                data.adjustRelation(name, parent, -60 - KingdomSavedData.DEFAULT_RELATION);
                level.getServer().getPlayerList().broadcastSystemMessage(
                        Component.translatable("civilizations.split", parent, name).withStyle(ChatFormatting.LIGHT_PURPLE), false);
            }
        }
        data.add(pos);
    }
}

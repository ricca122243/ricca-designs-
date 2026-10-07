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
            Profession.MINER, Profession.WARRIOR, Profession.WARRIOR
    };

    /** Участок, который ждёт загрузки чанков. */
    private static final class Pending {
        final String name;
        int x;
        int z;
        int attempts;
        Pending(String name, int x, int z) { this.name = name; this.x = x; this.z = z; }
    }

    private final List<Pending> pending = new ArrayList<>();
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
        if (data.isNpcSpawned() || !pending.isEmpty()) {
            return;
        }
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
            BlockState ground = level.getBlockState(pos.below());
            boolean ok = ground.is(BlockTags.DIRT) || ground.is(BlockTags.BASE_STONE_OVERWORLD)
                    || ground.is(Blocks.SAND) || ground.is(BlockTags.SNOW) || ground.is(Blocks.GRAVEL);
            if (!ok && p.attempts < 6) {
                // Вода или что-то неподходящее — сдвигаем участок и ждём новые чанки.
                forceChunks(level, p.x, p.z, false);
                p.attempts++;
                p.x += level.random.nextInt(61) - 30;
                p.z += level.random.nextInt(61) - 30;
                forceChunks(level, p.x, p.z, true);
                continue;
            }
            foundKingdom(level, pos, p.name);
            it.remove();
        }
        if (pending.isEmpty()) {
            KingdomSavedData.get(level).setNpcSpawned(true);
            level.getServer().getPlayerList().broadcastSystemMessage(
                    Component.translatable("civilizations.npc.spawned", NAMES[0], NAMES[1], NAMES[2]).withStyle(ChatFormatting.GOLD), false);
        }
    }

    private static void forceChunks(ServerLevel level, int x, int z, boolean force) {
        int cx = SectionPos.blockToSectionCoord(x);
        int cz = SectionPos.blockToSectionCoord(z);
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                level.setChunkForced(cx + dx, cz + dz, force);
            }
        }
    }

    private static void foundKingdom(ServerLevel level, BlockPos pos, String name) {
        level.setBlock(pos, Civilizations.TOWN_HALL.get().defaultBlockState(), 3);
        TownHallBlockEntity hall = TownHallBlockEntity.at(level, pos);
        if (hall == null) {
            return;
        }
        hall.setupNpc(name);
        for (Profession profession : STARTING) {
            hall.spawnStartingSettler(profession);
        }
        KingdomSavedData.get(level).add(pos);
    }
}

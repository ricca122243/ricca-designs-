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

import javax.annotation.Nullable;

/**
 * При первом входе игрока в мир создаёт три компьютерных королевства
 * в разных сторонах от него. Их чанки держатся загруженными, чтобы они жили и росли.
 */
public class NpcKingdomSpawner {
    private static final String[] NAMES = {"Astria", "Valdor", "Karnelia"};
    private static final int MIN_DISTANCE = 180;
    private static final int EXTRA_DISTANCE = 120;
    private static final Profession[] STARTING = {
            Profession.BUILDER, Profession.BUILDER, Profession.LUMBERJACK, Profession.FARMER,
            Profession.WARRIOR, Profession.WARRIOR
    };

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
        if (data.isNpcSpawned()) {
            return;
        }
        data.setNpcSpawned(true);

        BlockPos origin = player.blockPosition();
        double baseAngle = level.random.nextDouble() * Math.PI * 2;
        for (int i = 0; i < NAMES.length; i++) {
            double angle = baseAngle + i * (Math.PI * 2 / NAMES.length);
            BlockPos site = findSite(level, origin, angle);
            if (site != null) {
                foundKingdom(level, site, NAMES[i]);
            }
        }
        level.getServer().getPlayerList().broadcastSystemMessage(
                Component.translatable("civilizations.npc.spawned", NAMES[0], NAMES[1], NAMES[2]).withStyle(ChatFormatting.GOLD), false);
    }

    @Nullable
    private static BlockPos findSite(ServerLevel level, BlockPos origin, double angle) {
        for (int attempt = 0; attempt < 8; attempt++) {
            double dist = MIN_DISTANCE + level.random.nextDouble() * EXTRA_DISTANCE + attempt * 20;
            double a = angle + (level.random.nextDouble() - 0.5) * 0.4;
            int x = origin.getX() + (int) (Math.cos(a) * dist);
            int z = origin.getZ() + (int) (Math.sin(a) * dist);
            level.getChunk(SectionPos.blockToSectionCoord(x), SectionPos.blockToSectionCoord(z)); // генерируем чанк
            int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
            BlockPos pos = new BlockPos(x, y, z);
            BlockState ground = level.getBlockState(pos.below());
            if (ground.is(BlockTags.DIRT) || ground.is(BlockTags.BASE_STONE_OVERWORLD) || ground.is(Blocks.SAND) || ground.is(BlockTags.SNOW)) {
                return pos;
            }
        }
        return null;
    }

    private static void foundKingdom(ServerLevel level, BlockPos pos, String name) {
        // Держим 3x3 чанка вокруг ратуши загруженными.
        int cx = SectionPos.blockToSectionCoord(pos.getX());
        int cz = SectionPos.blockToSectionCoord(pos.getZ());
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                level.setChunkForced(cx + dx, cz + dz, true);
            }
        }

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

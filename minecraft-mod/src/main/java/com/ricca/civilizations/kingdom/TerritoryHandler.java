package com.ricca.civilizations.kingdom;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.block.TownHallBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.levelgen.Heightmap;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.tick.PlayerTickEvent;

/** Пока игрок держит жезл, граница ближайшего королевства подсвечивается частицами. */
public class TerritoryHandler {
    @SubscribeEvent
    public void onPlayerTick(PlayerTickEvent.Post event) {
        if (!(event.getEntity() instanceof ServerPlayer player) || player.tickCount % 10 != 0) {
            return;
        }
        if (!player.getMainHandItem().is(Civilizations.COMMAND_STAFF.get())
                && !player.getOffhandItem().is(Civilizations.COMMAND_STAFF.get())) {
            return;
        }
        ServerLevel level = player.serverLevel();
        BlockPos nearest = null;
        double nearestDist = Double.MAX_VALUE;
        for (BlockPos hall : KingdomSavedData.get(level).halls(level)) {
            double d = player.blockPosition().distSqr(hall);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = hall;
            }
        }
        if (nearest == null || nearestDist > 96.0 * 96.0) {
            return;
        }
        TownHallBlockEntity th = TownHallBlockEntity.at(level, nearest);
        int radius = th != null ? th.territoryRadius() : 20;

        // Рисуем только ту часть круга, что рядом с игроком.
        double playerAngle = Math.atan2(player.getZ() - (nearest.getZ() + 0.5), player.getX() - (nearest.getX() + 0.5));
        for (int i = -12; i <= 12; i++) {
            double angle = playerAngle + Math.toRadians(i * 5);
            double x = nearest.getX() + 0.5 + Math.cos(angle) * radius;
            double z = nearest.getZ() + 0.5 + Math.sin(angle) * radius;
            int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING, (int) Math.floor(x), (int) Math.floor(z));
            level.sendParticles(player, ParticleTypes.END_ROD, true, x, y + 0.5, z, 1, 0, 0, 0, 0);
        }
    }
}

package com.ricca.civilizations.block;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.entity.BoulderEntity;
import com.ricca.civilizations.entity.SettlerEntity;
import com.ricca.civilizations.kingdom.KingdomSavedData;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;

import javax.annotation.Nullable;
import java.util.List;

public class CatapultBlockEntity extends BlockEntity {
    private static final int RELOAD_TICKS = 80;
    private static final double RANGE = 28.0;

    private int reload = 0;

    public CatapultBlockEntity(BlockPos pos, BlockState state) {
        super(Civilizations.CATAPULT_BE.get(), pos, state);
    }

    public static void serverTick(Level level, BlockPos pos, BlockState state, CatapultBlockEntity be) {
        if (!(level instanceof ServerLevel serverLevel) || --be.reload > 0) {
            return;
        }
        be.reload = 20;
        String owner = ownerKingdom(serverLevel, pos);
        LivingEntity target = findTarget(serverLevel, pos, owner);
        if (target == null) {
            return;
        }
        be.reload = RELOAD_TICKS;
        BoulderEntity boulder = new BoulderEntity(level, pos.getX() + 0.5, pos.getY() + 1.2, pos.getZ() + 0.5);
        double dx = target.getX() - boulder.getX();
        double dy = target.getY(0.5) - boulder.getY();
        double dz = target.getZ() - boulder.getZ();
        double dist = Math.sqrt(dx * dx + dz * dz);
        boulder.shoot(dx, dy + dist * 0.28, dz, 1.5f, 2.0f);
        level.addFreshEntity(boulder);
        level.playSound(null, pos, SoundEvents.PISTON_EXTEND, SoundSource.BLOCKS, 1.0f, 0.6f);
    }

    /** Чья катапульта: ближайшая ратуша в 48 блоках. */
    @Nullable
    private static String ownerKingdom(ServerLevel level, BlockPos pos) {
        BlockPos best = null;
        double bestD = 48.0 * 48.0;
        for (BlockPos hall : KingdomSavedData.get(level).halls(level)) {
            double d = hall.distSqr(pos);
            if (d < bestD) {
                bestD = d;
                best = hall;
            }
        }
        TownHallBlockEntity hall = TownHallBlockEntity.at(level, best);
        return hall == null ? null : hall.getKingdom();
    }

    @Nullable
    private static LivingEntity findTarget(ServerLevel level, BlockPos pos, @Nullable String owner) {
        KingdomSavedData data = KingdomSavedData.get(level);
        AABB box = new AABB(pos).inflate(RANGE);
        List<LivingEntity> candidates = level.getEntitiesOfClass(LivingEntity.class, box, e -> {
            if (!e.isAlive()) return false;
            if (e instanceof Monster) return true;
            if (owner == null) return false;
            if (e instanceof SettlerEntity s) return !s.getKingdom().isEmpty() && !s.getKingdom().equals(owner) && data.relation(owner, s.getKingdom()) < 0;
            if (e instanceof Player p) return !p.isCreative() && !p.isSpectator() && data.atWar(owner, p.getName().getString());
            return false;
        });
        LivingEntity best = null;
        double bestD = Double.MAX_VALUE;
        for (LivingEntity e : candidates) {
            double d = e.distanceToSqr(pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5);
            if (d > 6 * 6 && d < bestD) { // слишком близко не стреляем
                bestD = d;
                best = e;
            }
        }
        return best;
    }
}

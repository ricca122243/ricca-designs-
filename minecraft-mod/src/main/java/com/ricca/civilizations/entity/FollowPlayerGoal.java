package com.ricca.civilizations.entity;

import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.entity.player.Player;

import java.util.EnumSet;

/** Следовать за игроком, который вызвал жителя жезлом. */
public class FollowPlayerGoal extends Goal {
    private final SettlerEntity settler;
    private Player player;

    public FollowPlayerGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    @Override
    public boolean canUse() {
        if (settler.getFollowPlayer() == null || settler.level().isClientSide) {
            return false;
        }
        player = settler.level().getPlayerByUUID(settler.getFollowPlayer());
        if (player == null || !player.isAlive()) {
            return false;
        }
        return settler.distanceToSqr(player) > 3.0 * 3.0;
    }

    @Override
    public boolean canContinueToUse() {
        return settler.getFollowPlayer() != null && player != null && player.isAlive()
                && settler.distanceToSqr(player) > 2.0 * 2.0;
    }

    @Override
    public boolean requiresUpdateEveryTick() {
        return true;
    }

    @Override
    public void tick() {
        settler.getLookControl().setLookAt(player, 10.0f, settler.getMaxHeadXRot());
        if (settler.distanceToSqr(player) > 24.0 * 24.0) {
            settler.teleportTo(player.getX(), player.getY(), player.getZ());
            return;
        }
        if (settler.getNavigation().isDone() || settler.tickCount % 10 == 0) {
            settler.getNavigation().moveTo(player, 0.65);
        }
    }

    @Override
    public void stop() {
        player = null;
        settler.getNavigation().stop();
    }
}

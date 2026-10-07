package com.ricca.civilizations.entity;

import net.minecraft.core.BlockPos;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.phys.Vec3;

import java.util.EnumSet;

/** Ночью жители идут домой к своей кровати и отдыхают до утра. Стражники и те, у кого приказ, не спят. */
public class RestGoal extends Goal {
    private final SettlerEntity settler;

    public RestGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    private boolean isNight() {
        long t = settler.level().getDayTime() % 24000L;
        return t >= 12500 && t <= 23500;
    }

    @Override
    public boolean canUse() {
        if (settler.level().isClientSide || !isNight() || settler.getHomeBed() == null) return false;
        if (settler.getProfession() == Profession.GUARD || settler.getOrderPos() != null || settler.getFollowPlayer() != null) return false;
        return settler.getTarget() == null;
    }

    @Override
    public boolean canContinueToUse() {
        return canUse();
    }

    @Override
    public void start() {
        settler.setTask("rest");
    }

    @Override
    public void stop() {
        settler.setTask("idle");
        settler.getNavigation().stop();
    }

    @Override
    public boolean requiresUpdateEveryTick() {
        return true;
    }

    @Override
    public void tick() {
        BlockPos bed = settler.getHomeBed();
        if (bed == null) return;
        Vec3 c = bed.getCenter();
        if (settler.distanceToSqr(c) > 2.0 * 2.0) {
            if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
                settler.getNavigation().moveTo(c.x, c.y, c.z, 0.6);
            }
        } else {
            settler.getNavigation().stop();
            settler.getLookControl().setLookAt(c.x, c.y + 0.5, c.z);
            if (settler.tickCount % 100 == 0) settler.heal(1.0f);
        }
    }
}

package com.ricca.civilizations.entity;

import net.minecraft.core.BlockPos;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.phys.Vec3;

import java.util.EnumSet;

/** Приказ игрока: идти в точку и стоять там, пока не отпустят. Стражник там встаёт на пост. */
public class OrderGoal extends Goal {
    private final SettlerEntity settler;

    public OrderGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE));
    }

    @Override
    public boolean canUse() {
        return settler.getOrderPos() != null && !settler.level().isClientSide;
    }

    @Override
    public boolean canContinueToUse() {
        return canUse();
    }

    @Override
    public boolean requiresUpdateEveryTick() {
        return true;
    }

    @Override
    public void tick() {
        BlockPos order = settler.getOrderPos();
        if (order == null) {
            return;
        }
        Vec3 target = order.getCenter();
        boolean arrived = settler.distanceToSqr(target) < 2.0 * 2.0;
        if (arrived) {
            settler.getNavigation().stop();
            if (settler.getProfession() == Profession.GUARD) {
                settler.setOrderPos(null); // стражник дальше держит пост сам
            }
            return;
        }
        if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
            settler.getNavigation().moveTo(target.x, target.y, target.z, 0.6);
        }
    }

    @Override
    public void start() {
        settler.setTask("order");
    }

    @Override
    public void stop() {
        settler.setTask("idle");
        settler.getNavigation().stop();
    }
}

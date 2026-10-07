package com.ricca.civilizations.entity;

import net.minecraft.core.BlockPos;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.phys.Vec3;

import java.util.EnumSet;

/** Стражник возвращается на свой пост, если отошёл далеко (например, погнался за монстром). */
public class GuardPostGoal extends Goal {
    private static final double LEASH_SQR = 7.0 * 7.0;

    private final SettlerEntity settler;

    public GuardPostGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE));
    }

    @Override
    public boolean canUse() {
        boolean posted = settler.getProfession() == Profession.GUARD || settler.getProfession() == Profession.ARCHER;
        if (!posted || settler.level().isClientSide || settler.getTarget() != null || settler.getOrderPos() != null || settler.getFollowPlayer() != null) {
            return false;
        }
        BlockPos post = settler.getGuardPost();
        return post != null && settler.distanceToSqr(post.getCenter()) > LEASH_SQR;
    }

    @Override
    public boolean canContinueToUse() {
        BlockPos post = settler.getGuardPost();
        return post != null && settler.getTarget() == null && !settler.getNavigation().isDone();
    }

    @Override
    public void start() {
        settler.setTask("post");
        BlockPos post = settler.getGuardPost();
        if (post != null) {
            Vec3 c = post.getCenter();
            settler.getNavigation().moveTo(c.x, c.y, c.z, 0.55);
        }
    }
}

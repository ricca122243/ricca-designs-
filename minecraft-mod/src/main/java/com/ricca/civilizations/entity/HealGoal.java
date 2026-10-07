package com.ricca.civilizations.entity;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.phys.AABB;

import java.util.EnumSet;
import java.util.List;

/** Лекарь: идёт к самому раненому жителю своего королевства и лечит всех рядом. */
public class HealGoal extends Goal {
    private final SettlerEntity settler;
    private SettlerEntity patient;
    private int cooldown;

    public HealGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    @Override
    public boolean canUse() {
        if (settler.getProfession() != Profession.HEALER || settler.level().isClientSide || settler.tickCount % 20 != 0) {
            return false;
        }
        patient = findPatient();
        return patient != null;
    }

    @Override
    public boolean canContinueToUse() {
        return patient != null && patient.isAlive() && patient.getHealth() < patient.getMaxHealth();
    }

    @Override
    public boolean requiresUpdateEveryTick() {
        return true;
    }

    @Override
    public void stop() {
        patient = null;
        settler.getNavigation().stop();
    }

    @Override
    public void tick() {
        settler.getLookControl().setLookAt(patient, 10.0f, settler.getMaxHeadXRot());
        if (settler.distanceToSqr(patient) > 3.0 * 3.0) {
            if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
                settler.getNavigation().moveTo(patient, 0.6);
            }
            return;
        }
        if (--cooldown > 0) {
            return;
        }
        cooldown = 40;
        List<SettlerEntity> around = settler.level().getEntitiesOfClass(SettlerEntity.class, settler.getBoundingBox().inflate(5.0),
                s -> s.getKingdom().equals(settler.getKingdom()) && s.getHealth() < s.getMaxHealth());
        for (SettlerEntity s : around) {
            s.heal(2.0f);
            if (settler.level() instanceof ServerLevel sl) {
                sl.sendParticles(ParticleTypes.HEART, s.getX(), s.getY() + 1.5, s.getZ(), 2, 0.3, 0.3, 0.3, 0.0);
            }
        }
        settler.swing(InteractionHand.MAIN_HAND);
    }

    private SettlerEntity findPatient() {
        List<SettlerEntity> list = settler.level().getEntitiesOfClass(SettlerEntity.class, new AABB(settler.blockPosition()).inflate(20.0),
                s -> s != settler && s.getKingdom().equals(settler.getKingdom()) && s.getHealth() < s.getMaxHealth() - 1);
        SettlerEntity worst = null;
        float worstRatio = 1.0f;
        for (SettlerEntity s : list) {
            float ratio = s.getHealth() / s.getMaxHealth();
            if (ratio < worstRatio) {
                worstRatio = ratio;
                worst = s;
            }
        }
        return worst;
    }
}

package com.ricca.civilizations.entity;

import com.ricca.civilizations.block.TownHallBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.phys.Vec3;

import java.util.EnumSet;

/** Кузнец: у склада перековывает железо в оружие. Каждые 5 железа — +1 к вооружению королевства. */
public class BlacksmithGoal extends Goal {
    private final SettlerEntity settler;
    private int cooldown;

    public BlacksmithGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    @Override
    public boolean canUse() {
        if (settler.getProfession() != Profession.BLACKSMITH || settler.level().isClientSide) {
            return false;
        }
        TownHallBlockEntity hall = TownHallBlockEntity.at(settler.level(), settler.getTownHall());
        return hall != null && hall.isWarehouseBuilt();
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
    public void start() {
        settler.setTask("forge");
    }

    @Override
    public void stop() {
        settler.setTask("idle");
        settler.getNavigation().stop();
    }

    @Override
    public void tick() {
        BlockPos hallPos = settler.getTownHall();
        if (hallPos == null) return;
        BlockPos forge = KingdomLayout.warehouseOrigin(hallPos).offset(2, 0, 6); // перед входом склада
        Vec3 c = forge.getCenter();
        settler.getLookControl().setLookAt(c.x, c.y, c.z);
        if (settler.distanceToSqr(c) > 2.5 * 2.5) {
            if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
                settler.getNavigation().moveTo(c.x, c.y, c.z, 0.5);
            }
            return;
        }
        if (--cooldown > 0) return;
        cooldown = 200;
        TownHallBlockEntity hall = TownHallBlockEntity.at(settler.level(), hallPos);
        if (hall != null && hall.forgeArms()) {
            settler.level().playSound(null, forge, SoundEvents.ANVIL_USE, SoundSource.BLOCKS, 0.8f, 1.2f);
            settler.swing(InteractionHand.MAIN_HAND);
        }
    }
}

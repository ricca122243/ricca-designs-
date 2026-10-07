package com.ricca.civilizations.entity;

import com.ricca.civilizations.block.TownHallBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

import java.util.EnumSet;
import java.util.List;

/**
 * Работа пастуха: когда загон построен, заводит коров и овец, кормит их (еда со склада),
 * собирает молоко и шерсть (еда на склад), а лишних пускает на мясо.
 */
public class ShepherdGoal extends Goal {
    private static final int SIZE = KingdomLayout.PEN_SIZE;
    private static final int CHECK_TICKS = 100;
    private static final int HARVEST_TICKS = 600;
    private static final int MAX_ANIMALS = 8;
    private static final double REACH_SQR = 4.0 * 4.0;

    private final SettlerEntity settler;
    private int cooldown;
    private int harvest;

    public ShepherdGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    @Override
    public boolean canUse() {
        if (settler.getProfession() != Profession.SHEPHERD || settler.level().isClientSide) {
            return false;
        }
        TownHallBlockEntity hall = TownHallBlockEntity.at(settler.level(), settler.getTownHall());
        return hall != null && hall.isPenBuilt();
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
    public void stop() {
        settler.getNavigation().stop();
    }

    @Override
    public void tick() {
        BlockPos hallPos = settler.getTownHall();
        if (hallPos == null) {
            return;
        }
        Level level = settler.level();
        BlockPos origin = KingdomLayout.penOrigin(hallPos);
        BlockPos center = origin.offset(SIZE / 2, 0, SIZE / 2);
        Vec3 c = center.getCenter();
        settler.getLookControl().setLookAt(c.x, c.y, c.z);

        if (settler.distanceToSqr(c) > REACH_SQR || KingdomLayout.inside(origin, SIZE, settler.blockPosition())) {
            Vec3 stand = KingdomLayout.standingSpot(settler, origin, SIZE, center).getCenter();
            if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
                settler.getNavigation().moveTo(stand.x, stand.y, stand.z, 0.5);
            }
            return;
        }
        if (--cooldown > 0) {
            return;
        }
        cooldown = CHECK_TICKS;
        TownHallBlockEntity hall = TownHallBlockEntity.at(level, hallPos);
        if (hall == null) {
            return;
        }

        AABB pen = new AABB(origin.getX() + 1, origin.getY() - 1, origin.getZ() + 1,
                origin.getX() + SIZE - 1, origin.getY() + 3, origin.getZ() + SIZE - 1);
        List<Animal> animals = level.getEntitiesOfClass(Animal.class, pen);

        if (animals.size() < 4 && hall.getFood() >= 3) {
            // Завести животное
            EntityType<? extends Animal> type = level.random.nextBoolean() ? EntityType.COW : EntityType.SHEEP;
            Animal animal = type.create(level);
            if (animal != null) {
                animal.moveTo(origin.getX() + 1.5 + level.random.nextInt(SIZE - 2), origin.getY(), origin.getZ() + 1.5 + level.random.nextInt(SIZE - 2),
                        level.random.nextFloat() * 360f, 0f);
                animal.setPersistenceRequired();
                level.addFreshEntity(animal);
                hall.addFood(-3);
                settler.swing(InteractionHand.MAIN_HAND);
            }
            return;
        }

        harvest += CHECK_TICKS;
        if (harvest >= HARVEST_TICKS && !animals.isEmpty()) {
            harvest = 0;
            if (animals.size() > MAX_ANIMALS) {
                Animal victim = animals.get(0);
                victim.hurt(level.damageSources().generic(), 100.0f);
                hall.addFood(8);
            } else {
                hall.addFood(animals.size());
                // Иногда животные приносят потомство
                if (animals.size() >= 2 && level.random.nextInt(3) == 0) {
                    animals.get(0).setInLove(null);
                    animals.get(1).setInLove(null);
                }
            }
            level.playSound(null, center, SoundEvents.COW_MILK, SoundSource.NEUTRAL, 1.0f, 1.0f);
            settler.swing(InteractionHand.MAIN_HAND);
        }
    }
}

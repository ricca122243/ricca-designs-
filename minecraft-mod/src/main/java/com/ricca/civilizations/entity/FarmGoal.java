package com.ricca.civilizations.entity;

import com.ricca.civilizations.block.TownHallBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.CropBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;

import java.util.EnumSet;

/**
 * Работа фермера: поле 5x5 к северу от ратуши. Вспахать землю, налить воду
 * в центр, посадить пшеницу, ухаживать за ней и собирать урожай в склад еды.
 */
public class FarmGoal extends Goal {
    private static final int SIZE = KingdomLayout.FARM_SIZE;
    private static final int WORK_DELAY_TICKS = 12;
    private static final int FOOD_PER_HARVEST = 3;
    private static final double REACH_SQR = 3.5 * 3.5;
    private static final int STUCK_LIMIT_TICKS = 120;

    private final SettlerEntity settler;
    private int tile;
    private int cooldown;
    private int stuckTicks;

    public FarmGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    @Override
    public boolean canUse() {
        if (settler.getProfession() != Profession.FARMER || settler.level().isClientSide) {
            return false;
        }
        BlockPos hall = settler.getTownHall();
        return hall != null && TownHallBlockEntity.at(settler.level(), hall) != null;
    }

    @Override
    public boolean canContinueToUse() {
        return canUse();
    }

    @Override
    public void start() {
        settler.setTask("farm");
        cooldown = WORK_DELAY_TICKS;
        stuckTicks = 0;
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
        BlockPos hallPos = settler.getTownHall();
        if (hallPos == null) {
            return;
        }
        BlockPos origin = KingdomLayout.farmOrigin(hallPos);
        int x = tile % SIZE;
        int z = tile / SIZE;
        BlockPos ground = origin.offset(x, -1, z);
        BlockPos crop = ground.above();
        Vec3 center = crop.getCenter();

        settler.getLookControl().setLookAt(center.x, center.y, center.z);

        if (settler.distanceToSqr(center) > REACH_SQR || KingdomLayout.inside(origin, SIZE, settler.blockPosition())) {
            Vec3 stand = KingdomLayout.standingSpot(settler, origin, SIZE, crop).getCenter();
            if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
                settler.getNavigation().moveTo(stand.x, stand.y, stand.z, 0.5);
            }
            if (++stuckTicks > STUCK_LIMIT_TICKS) {
                stuckTicks = 0;
                nextTile();
            }
            return;
        }

        stuckTicks = 0;
        if (--cooldown > 0) {
            return;
        }
        cooldown = WORK_DELAY_TICKS;

        work(x, z, ground, crop, hallPos);
        nextTile();
    }

    private void nextTile() {
        tile = (tile + 1) % (SIZE * SIZE);
    }

    private void work(int x, int z, BlockPos ground, BlockPos crop, BlockPos hallPos) {
        Level level = settler.level();

        // Выравниваем поле: над грядкой не должно быть земли и камня, а под ней — ямы.
        for (int dy = 0; dy <= 2; dy++) {
            BlockPos above = crop.above(dy);
            BlockState s = level.getBlockState(above);
            if (!s.isAir() && !s.canBeReplaced() && !s.is(Blocks.WHEAT) && !s.liquid() && !s.is(Blocks.BEDROCK)) {
                level.destroyBlock(above, false);
                settler.swing(InteractionHand.MAIN_HAND);
                return;
            }
        }
        BlockState groundNow = level.getBlockState(ground);
        if (groundNow.canBeReplaced() && !groundNow.liquid()) {
            level.setBlock(ground, Blocks.DIRT.defaultBlockState(), 3);
            settler.swing(InteractionHand.MAIN_HAND);
            return;
        }

        BlockState g = level.getBlockState(ground);
        BlockState c = level.getBlockState(crop);

        // Центр поля — вода, чтобы грядки не высыхали.
        if (x == SIZE / 2 && z == SIZE / 2) {
            if (!g.is(Blocks.WATER)) {
                if (c.canBeReplaced() || c.is(Blocks.WHEAT)) {
                    level.setBlock(crop, Blocks.AIR.defaultBlockState(), 3);
                }
                level.setBlock(ground, Blocks.WATER.defaultBlockState(), 3);
                settler.swing(InteractionHand.MAIN_HAND);
            }
            return;
        }

        // Вспахать землю
        if (g.is(Blocks.GRASS_BLOCK) || g.is(Blocks.DIRT) || g.is(Blocks.COARSE_DIRT)) {
            if (c.canBeReplaced()) {
                level.setBlock(crop, Blocks.AIR.defaultBlockState(), 3);
                level.setBlock(ground, Blocks.FARMLAND.defaultBlockState(), 3);
                level.playSound(null, ground, SoundEvents.HOE_TILL, SoundSource.BLOCKS, 1.0f, 1.0f);
                settler.swing(InteractionHand.MAIN_HAND);
            }
            return;
        }

        if (!g.is(Blocks.FARMLAND)) {
            return; // камень, вода и т.п. — не наше поле
        }

        if (c.isAir()) {
            level.setBlock(crop, Blocks.WHEAT.defaultBlockState(), 3);
            level.playSound(null, crop, SoundEvents.CROP_PLANTED, SoundSource.BLOCKS, 1.0f, 1.0f);
            settler.swing(InteractionHand.MAIN_HAND);
            return;
        }

        if (c.is(Blocks.WHEAT)) {
            int age = c.getValue(CropBlock.AGE);
            if (age >= CropBlock.MAX_AGE) {
                level.setBlock(crop, Blocks.WHEAT.defaultBlockState(), 3);
                level.playSound(null, crop, SoundEvents.CROP_BREAK, SoundSource.BLOCKS, 1.0f, 1.0f);
                settler.swing(InteractionHand.MAIN_HAND);
                TownHallBlockEntity hall = TownHallBlockEntity.at(level, hallPos);
                if (hall != null) {
                    hall.addFood(FOOD_PER_HARVEST);
                }
            } else if (level.random.nextInt(3) == 0) {
                // Фермер ухаживает за посевами: они растут быстрее.
                level.setBlock(crop, c.setValue(CropBlock.AGE, age + 1), 3);
                level.levelEvent(2005, crop, 0);
                settler.swing(InteractionHand.MAIN_HAND);
            }
        }
    }
}

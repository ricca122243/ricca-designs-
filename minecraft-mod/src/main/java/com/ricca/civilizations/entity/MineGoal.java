package com.ricca.civilizations.entity;

import com.ricca.civilizations.block.TownHallBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;

import java.util.EnumSet;

/**
 * Работа шахтёра: выкопать карьер 5x5 глубиной 3 рядом с ратушей (камень и руда идут на склад),
 * а потом добывать в нём камень и железо, стоя на краю.
 */
public class MineGoal extends Goal {
    private static final int SIZE = KingdomLayout.QUARRY_SIZE;
    private static final int DEPTH = 3;
    private static final int DIG_DELAY_TICKS = 14;
    private static final int WORK_DELAY_TICKS = 60;
    private static final double REACH_SQR = 6.5 * 6.5;
    private static final int STUCK_LIMIT_TICKS = 160;

    private final SettlerEntity settler;
    private int index;
    private int cooldown;
    private int stuckTicks;

    public MineGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    @Override
    public boolean canUse() {
        if (settler.getProfession() != Profession.MINER || settler.level().isClientSide) {
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
        index = 0;
        cooldown = DIG_DELAY_TICKS;
        stuckTicks = 0;
    }

    @Override
    public void stop() {
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
        Level level = settler.level();
        TownHallBlockEntity hallBe = TownHallBlockEntity.at(level, hallPos);
        BlockPos origin = hallBe != null && hallBe.getQuarryOrigin() != null ? hallBe.getQuarryOrigin() : KingdomLayout.quarryOrigin(hallPos);
        int total = SIZE * SIZE * DEPTH;

        // Пропускаем уже выкопанное.
        while (index < total && isDug(level, blockAt(origin, index))) {
            index++;
        }
        boolean pitDone = index >= total;
        BlockPos target = pitDone ? origin.offset(SIZE / 2, -1, SIZE / 2) : blockAt(origin, index);
        Vec3 center = target.getCenter();
        settler.getLookControl().setLookAt(center.x, center.y, center.z);

        if (settler.distanceToSqr(center) > REACH_SQR || KingdomLayout.inside(origin, SIZE, settler.blockPosition())) {
            Vec3 stand = KingdomLayout.standingSpot(settler, origin, SIZE, target).getCenter();
            if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
                settler.getNavigation().moveTo(stand.x, stand.y, stand.z, 0.5);
            }
            if (++stuckTicks > STUCK_LIMIT_TICKS) {
                stuckTicks = 0;
                if (!pitDone) index++;
            }
            return;
        }
        stuckTicks = 0;
        if (--cooldown > 0) {
            return;
        }

        TownHallBlockEntity hall = TownHallBlockEntity.at(level, hallPos);
        if (hall == null) {
            return;
        }
        if (!pitDone) {
            cooldown = DIG_DELAY_TICKS;
            BlockState state = level.getBlockState(target);
            if (!state.liquid() && !state.is(Blocks.BEDROCK)) {
                credit(hall, state);
                level.destroyBlock(target, false);
                settler.swing(InteractionHand.MAIN_HAND);
            }
            index++;
        } else {
            // Карьер готов: добываем «вглубь», не ломая мир.
            cooldown = WORK_DELAY_TICKS;
            hall.addStone(2);
            if (level.random.nextInt(4) == 0) {
                hall.addIron(1);
            }
            level.playSound(null, target, SoundEvents.STONE_BREAK, SoundSource.BLOCKS, 0.8f, 0.9f);
            settler.swing(InteractionHand.MAIN_HAND);
        }
    }

    private static void credit(TownHallBlockEntity hall, BlockState state) {
        if (state.is(BlockTags.IRON_ORES)) {
            hall.addIron(2);
        } else if (state.is(BlockTags.BASE_STONE_OVERWORLD) || state.is(Blocks.COBBLESTONE)) {
            hall.addStone(1);
        }
    }

    private static boolean isDug(Level level, BlockPos pos) {
        BlockState s = level.getBlockState(pos);
        return s.isAir() || s.canBeReplaced() || s.liquid() || s.is(Blocks.BEDROCK);
    }

    /** Порядок копания: слой за слоем сверху вниз. */
    private static BlockPos blockAt(BlockPos origin, int index) {
        int layer = index / (SIZE * SIZE);
        int rest = index % (SIZE * SIZE);
        return origin.offset(rest % SIZE, -1 - layer, rest / SIZE);
    }
}

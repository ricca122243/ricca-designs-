package com.ricca.civilizations.entity;

import com.ricca.civilizations.block.TownHallBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.phys.Vec3;

import javax.annotation.Nullable;
import java.util.EnumSet;

/**
 * Работа дровосека: найти дерево недалеко от ратуши, срубить его снизу вверх,
 * отнести дерево на склад (сразу зачисляется в ратушу) и посадить саженец.
 */
public class ChopTreesGoal extends Goal {
    private static final int SEARCH_RADIUS = 18;
    private static final int SEARCH_INTERVAL_TICKS = 60;
    private static final int CHOP_DELAY_TICKS = 20;
    private static final int WOOD_PER_LOG = 4;
    private static final double REACH_SQR = 3.0 * 3.0;
    private static final int STUCK_LIMIT_TICKS = 200;

    private final SettlerEntity settler;
    @Nullable
    private BlockPos tree;
    private int cooldown;
    private int stuckTicks;
    private int searchCooldown;

    public ChopTreesGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    @Override
    public boolean canUse() {
        if (settler.getProfession() != Profession.LUMBERJACK || settler.level().isClientSide) {
            return false;
        }
        BlockPos hall = settler.getTownHall();
        if (hall == null || TownHallBlockEntity.at(settler.level(), hall) == null) {
            return false;
        }
        if (--searchCooldown > 0) {
            return false;
        }
        searchCooldown = SEARCH_INTERVAL_TICKS;
        tree = findTree(hall);
        return tree != null;
    }

    @Override
    public boolean canContinueToUse() {
        return tree != null && settler.getProfession() == Profession.LUMBERJACK;
    }

    @Override
    public void start() {
        cooldown = CHOP_DELAY_TICKS;
        stuckTicks = 0;
    }

    @Override
    public void stop() {
        tree = null;
        settler.getNavigation().stop();
    }

    @Override
    public boolean requiresUpdateEveryTick() {
        return true;
    }

    @Override
    public void tick() {
        if (tree == null) {
            return;
        }
        Level level = settler.level();
        BlockPos log = lowestLog(tree);
        if (log == null) {
            plantSapling(tree);
            tree = null;
            return;
        }

        Vec3 base = tree.getCenter();
        settler.getLookControl().setLookAt(log.getX() + 0.5, log.getY() + 0.5, log.getZ() + 0.5);

        if (settler.distanceToSqr(base) > REACH_SQR) {
            if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
                settler.getNavigation().moveTo(base.x, base.y, base.z, 0.5);
            }
            if (++stuckTicks > STUCK_LIMIT_TICKS) {
                tree = null; // не дойти — ищем другое дерево
            }
            return;
        }

        stuckTicks = 0;
        if (--cooldown > 0) {
            return;
        }
        cooldown = CHOP_DELAY_TICKS;

        level.destroyBlock(log, false);
        settler.swing(InteractionHand.MAIN_HAND);
        TownHallBlockEntity hall = TownHallBlockEntity.at(level, settler.getTownHall());
        if (hall != null) {
            hall.addWood(WOOD_PER_LOG);
        }
    }

    @Nullable
    private BlockPos lowestLog(BlockPos base) {
        Level level = settler.level();
        for (int dy = 0; dy < 14; dy++) {
            BlockPos pos = base.above(dy);
            if (level.getBlockState(pos).is(BlockTags.LOGS)) {
                return pos;
            }
        }
        return null;
    }

    private void plantSapling(BlockPos base) {
        Level level = settler.level();
        if (level.getBlockState(base).isAir() && level.getBlockState(base.below()).is(BlockTags.DIRT)) {
            level.setBlock(base, Blocks.OAK_SAPLING.defaultBlockState(), 3);
        }
    }

    /** Ищем ближайшее основание дерева: бревно, под которым не бревно, и не часть построек. */
    @Nullable
    private BlockPos findTree(BlockPos hall) {
        Level level = settler.level();
        BlockPos best = null;
        double bestDist = Double.MAX_VALUE;
        for (BlockPos pos : BlockPos.betweenClosed(hall.offset(-SEARCH_RADIUS, -4, -SEARCH_RADIUS), hall.offset(SEARCH_RADIUS, 6, SEARCH_RADIUS))) {
            if (!level.getBlockState(pos).is(BlockTags.LOGS) || level.getBlockState(pos.below()).is(BlockTags.LOGS)) {
                continue;
            }
            if (KingdomLayout.isReserved(hall, pos)) {
                continue;
            }
            double d = settler.distanceToSqr(pos.getCenter());
            if (d < bestDist) {
                bestDist = d;
                best = pos.immutable();
            }
        }
        return best;
    }
}

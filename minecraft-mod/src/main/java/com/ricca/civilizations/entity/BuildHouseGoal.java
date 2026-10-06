package com.ricca.civilizations.entity;

import com.ricca.civilizations.Civilizations;
import net.minecraft.core.BlockPos;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

/**
 * Цель ИИ: поселенец идёт к своей стройплощадке рядом с ратушей
 * и ставит блоки дома один за другим, снизу вверх.
 */
public class BuildHouseGoal extends Goal {
    /** Один блок плана: смещение от угла дома и что туда ставить. */
    private record PlanBlock(int x, int y, int z, Block block) {}

    /** Где стоят дома относительно ратуши (по номеру дома). */
    private static final int[][] HOUSE_OFFSETS = {{5, 0, -2}, {-9, 0, -2}, {-2, 0, 5}};

    private static final List<PlanBlock> HOUSE_PLAN = buildHousePlan();

    private static final int HOUSE_SIZE = 5;
    private static final int PLACE_DELAY_TICKS = 16;
    private static final double REACH_SQR = 5.5 * 5.5;
    private static final int STUCK_LIMIT_TICKS = 120;

    private final SettlerEntity settler;
    private int index;
    private int cooldown;
    private int stuckTicks;
    private int searchCooldown;
    private boolean finished;

    public BuildHouseGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    @Override
    public boolean canUse() {
        if (finished || settler.level().isClientSide) {
            return false;
        }
        if (settler.getTownHall() == null) {
            // Поселенец без ратуши (например, из яйца призыва) ищет её поблизости.
            if (--searchCooldown > 0) {
                return false;
            }
            searchCooldown = 100;
            BlockPos found = findTownHallNearby();
            if (found == null) {
                return false;
            }
            settler.setTownHall(found);
        }
        // Если ратушу сломали, строить больше нечего.
        if (!settler.level().getBlockState(settler.getTownHall()).is(Civilizations.TOWN_HALL.get())) {
            settler.setTownHall(null);
            return false;
        }
        return true;
    }

    @Override
    public boolean canContinueToUse() {
        return !finished && settler.getTownHall() != null;
    }

    @Override
    public void start() {
        index = 0;
        skipAlreadyBuilt();
        cooldown = PLACE_DELAY_TICKS;
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
        if (index >= HOUSE_PLAN.size()) {
            finished = true;
            return;
        }
        Level level = settler.level();
        BlockPos target = targetPos(HOUSE_PLAN.get(index));
        Vec3 center = target.getCenter();

        settler.getLookControl().setLookAt(center.x, center.y, center.z);

        // Строитель стоит снаружи дома, а не внутри и не на стенах.
        BlockPos standPos = standingSpotFor(target);
        Vec3 stand = standPos.getCenter();
        boolean inTheWay = settler.getBoundingBox().intersects(new AABB(target));
        boolean tooFar = settler.distanceToSqr(center) > REACH_SQR;

        if (tooFar || inTheWay || isInsideFootprint(settler.blockPosition())) {
            if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
                settler.getNavigation().moveTo(stand.x, stand.y, stand.z, 0.5);
            }
            if (++stuckTicks > STUCK_LIMIT_TICKS) {
                // Не можем дойти — пропускаем этот блок.
                stuckTicks = 0;
                index++;
            }
            return;
        }

        stuckTicks = 0;
        if (--cooldown > 0) {
            return;
        }
        cooldown = PLACE_DELAY_TICKS;

        BlockState current = level.getBlockState(target);
        Block wanted = HOUSE_PLAN.get(index).block();
        if (current.canBeReplaced() && !current.is(wanted)) {
            BlockState state = wanted.defaultBlockState();
            level.setBlock(target, state, 3);
            level.playSound(null, target, state.getSoundType().getPlaceSound(), SoundSource.BLOCKS, 1.0f, 0.9f);
            settler.swing(InteractionHand.MAIN_HAND);
        }
        // Если там уже стоит что-то чужое (камень, земля) — оставляем как есть и идём дальше.
        index++;
    }

    /** Угол дома (минимальные x и z) в мире. */
    private BlockPos houseOrigin() {
        BlockPos hall = settler.getTownHall();
        int[] o = HOUSE_OFFSETS[Math.floorMod(settler.getHouseIndex(), HOUSE_OFFSETS.length)];
        return hall.offset(o[0], o[1], o[2]);
    }

    private boolean isInsideFootprint(BlockPos pos) {
        BlockPos origin = houseOrigin();
        return pos.getX() >= origin.getX() && pos.getX() < origin.getX() + HOUSE_SIZE
                && pos.getZ() >= origin.getZ() && pos.getZ() < origin.getZ() + HOUSE_SIZE
                && pos.getY() >= origin.getY() - 1 && pos.getY() <= origin.getY() + 5;
    }

    /** Ближайшая к поселенцу точка на кольце вокруг дома, с которой видно нужный блок. */
    private BlockPos standingSpotFor(BlockPos target) {
        BlockPos origin = houseOrigin();
        int minX = origin.getX() - 1, maxX = origin.getX() + HOUSE_SIZE;
        int minZ = origin.getZ() - 1, maxZ = origin.getZ() + HOUSE_SIZE;
        int y = origin.getY() + 1;
        BlockPos[] candidates = {
                new BlockPos(minX, y, target.getZ()),
                new BlockPos(maxX, y, target.getZ()),
                new BlockPos(target.getX(), y, minZ),
                new BlockPos(target.getX(), y, maxZ)
        };
        BlockPos best = candidates[0];
        double bestDist = Double.MAX_VALUE;
        for (BlockPos c : candidates) {
            double d = settler.distanceToSqr(c.getCenter());
            if (d < bestDist) {
                bestDist = d;
                best = c;
            }
        }
        return best;
    }

    private BlockPos targetPos(PlanBlock plan) {
        return houseOrigin().offset(plan.x(), plan.y(), plan.z());
    }

    private void skipAlreadyBuilt() {
        Level level = settler.level();
        while (index < HOUSE_PLAN.size()) {
            PlanBlock plan = HOUSE_PLAN.get(index);
            if (!level.getBlockState(targetPos(plan)).is(plan.block())) {
                break;
            }
            index++;
        }
    }

    private BlockPos findTownHallNearby() {
        BlockPos origin = settler.blockPosition();
        Level level = settler.level();
        for (BlockPos pos : BlockPos.betweenClosed(origin.offset(-12, -4, -12), origin.offset(12, 4, 12))) {
            if (level.getBlockState(pos).is(Civilizations.TOWN_HALL.get())) {
                return pos.immutable();
            }
        }
        return null;
    }

    /**
     * План дома 5x5: каменный пол, стены из досок с брёвнами по углам,
     * окна, дверной проём и плоская крыша. Дверь смотрит на юг (+Z).
     */
    private static List<PlanBlock> buildHousePlan() {
        List<PlanBlock> plan = new ArrayList<>();
        int size = HOUSE_SIZE;
        // Пол
        for (int x = 0; x < size; x++) {
            for (int z = 0; z < size; z++) {
                plan.add(new PlanBlock(x, 0, z, Blocks.COBBLESTONE));
            }
        }
        // Стены, три яруса
        for (int y = 1; y <= 3; y++) {
            for (int x = 0; x < size; x++) {
                for (int z = 0; z < size; z++) {
                    boolean edge = x == 0 || z == 0 || x == size - 1 || z == size - 1;
                    if (!edge) {
                        continue;
                    }
                    boolean corner = (x == 0 || x == size - 1) && (z == 0 || z == size - 1);
                    boolean door = z == size - 1 && x == 2 && y <= 2;
                    if (door) {
                        continue;
                    }
                    boolean window = y == 2 && !corner && (x == 2 || z == 2);
                    Block block = corner ? Blocks.OAK_LOG : window ? Blocks.GLASS_PANE : Blocks.OAK_PLANKS;
                    plan.add(new PlanBlock(x, y, z, block));
                }
            }
        }
        // Крыша
        for (int x = 0; x < size; x++) {
            for (int z = 0; z < size; z++) {
                plan.add(new PlanBlock(x, 4, z, Blocks.OAK_PLANKS));
            }
        }
        // Факел внутри
        plan.add(new PlanBlock(2, 1, 1, Blocks.TORCH));
        return plan;
    }
}

package com.ricca.civilizations.entity;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.block.TownHallBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.BlockTags;
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
 * Работа строителя: занять участок, идти к нему и ставить блоки дома
 * один за другим, снизу вверх, тратя дерево и камень со склада ратуши.
 */
public class BuildHouseGoal extends Goal {
    /**
     * Один шаг плана. fillOnly = true — фундамент: ставим блок, только если там пусто
     * (яма), а землю и камень не трогаем. Иначе место сначала расчищается.
     */
    private record PlanBlock(int x, int y, int z, Block block, boolean fillOnly) {
        PlanBlock(int x, int y, int z, Block block) {
            this(x, y, z, block, false);
        }
    }

    private static final List<PlanBlock> HOUSE_PLAN = buildHousePlan();
    private static final int SIZE = KingdomLayout.HOUSE_SIZE;

    private static final int PLACE_DELAY_TICKS = 10;
    private static final int NO_RESOURCES_DELAY_TICKS = 60;
    private static final double REACH_SQR = 5.5 * 5.5;
    private static final int STUCK_LIMIT_TICKS = 160;

    private final SettlerEntity settler;
    private int index;
    private int cooldown;
    private int stuckTicks;

    public BuildHouseGoal(SettlerEntity settler) {
        this.settler = settler;
        this.setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    @Override
    public boolean canUse() {
        if (settler.getProfession() != Profession.BUILDER || settler.level().isClientSide) {
            return false;
        }
        TownHallBlockEntity hall = townHall();
        if (hall == null) {
            return false;
        }
        if (settler.getHouseIndex() < 0) {
            int claimed = hall.claimHouse();
            if (claimed < 0) {
                return false; // все участки заняты
            }
            settler.setHouseIndex(claimed);
        }
        return true;
    }

    @Override
    public boolean canContinueToUse() {
        return settler.getProfession() == Profession.BUILDER && settler.getHouseIndex() >= 0 && townHall() != null;
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
        TownHallBlockEntity hall = townHall();
        if (hall == null) {
            return;
        }
        if (index >= HOUSE_PLAN.size()) {
            hall.houseFinished();
            settler.setHouseIndex(-1);
            return;
        }
        Level level = settler.level();
        BlockPos origin = houseOrigin();
        // Пропускаем шаги, где делать нечего, без ожидания.
        while (index < HOUSE_PLAN.size() && isStepDone(level, origin, HOUSE_PLAN.get(index))) {
            index++;
        }
        if (index >= HOUSE_PLAN.size()) {
            return;
        }
        PlanBlock plan = HOUSE_PLAN.get(index);
        BlockPos target = origin.offset(plan.x(), plan.y(), plan.z());
        Vec3 center = target.getCenter();

        settler.getLookControl().setLookAt(center.x, center.y, center.z);

        // Строитель стоит снаружи дома, а не внутри и не на стенах.
        boolean inTheWay = settler.getBoundingBox().intersects(new AABB(target));
        boolean tooFar = settler.distanceToSqr(center) > REACH_SQR;
        if (tooFar || inTheWay || KingdomLayout.inside(origin, SIZE, settler.blockPosition())) {
            Vec3 stand = KingdomLayout.standingSpot(settler, origin, SIZE, target).getCenter();
            if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
                settler.getNavigation().moveTo(stand.x, stand.y, stand.z, 0.5);
            }
            if (++stuckTicks > STUCK_LIMIT_TICKS) {
                stuckTicks = 0;
                index++; // не можем дойти — пропускаем блок
            }
            return;
        }

        stuckTicks = 0;
        if (--cooldown > 0) {
            return;
        }
        cooldown = PLACE_DELAY_TICKS;

        BlockState current = level.getBlockState(target);
        Block wanted = plan.block();
        if (current.is(wanted) && !(wanted == Blocks.AIR)) {
            index++;
            return;
        }
        if (wanted == Blocks.AIR && (current.isAir() || current.canBeReplaced())) {
            index++;
            return;
        }

        // Фундамент: только заполняем пустоты, землю не копаем.
        if (plan.fillOnly() && !current.canBeReplaced()) {
            index++;
            return;
        }

        // Расчистка: мешает земля, камень, листва — выкапываем (камень идёт на склад).
        if (!current.canBeReplaced() && !current.isAir()) {
            dig(level, target, current, hall);
            settler.swing(InteractionHand.MAIN_HAND);
            return; // блок поставим на следующем заходе
        }

        if (wanted == Blocks.AIR) {
            index++;
            return;
        }
        if (!hall.take(woodCost(wanted), stoneCost(wanted))) {
            cooldown = NO_RESOURCES_DELAY_TICKS; // ждём, пока принесут ресурсы
            return;
        }
        BlockState state = wanted.defaultBlockState();
        level.setBlock(target, state, 3);
        level.playSound(null, target, state.getSoundType().getPlaceSound(), SoundSource.BLOCKS, 1.0f, 0.9f);
        settler.swing(InteractionHand.MAIN_HAND);
        index++;
    }

    /** Выкопать мешающий блок. Камень и бревна отправляются на склад. */
    private static void dig(Level level, BlockPos pos, BlockState state, TownHallBlockEntity hall) {
        if (state.is(Blocks.BEDROCK) || state.liquid()) {
            return;
        }
        if (state.is(BlockTags.BASE_STONE_OVERWORLD) || state.is(Blocks.COBBLESTONE)) {
            hall.addStone(1);
        } else if (state.is(BlockTags.LOGS)) {
            hall.addWood(4);
        }
        level.destroyBlock(pos, false);
    }

    private TownHallBlockEntity townHall() {
        BlockPos pos = settler.getTownHall();
        if (pos == null) {
            return null;
        }
        if (!settler.level().getBlockState(pos).is(Civilizations.TOWN_HALL.get())) {
            settler.setTownHall(null);
            return null;
        }
        return TownHallBlockEntity.at(settler.level(), pos);
    }

    private BlockPos houseOrigin() {
        return KingdomLayout.houseOrigin(settler.getTownHall(), settler.getHouseIndex());
    }

    private static boolean isStepDone(Level level, BlockPos origin, PlanBlock plan) {
        BlockState current = level.getBlockState(origin.offset(plan.x(), plan.y(), plan.z()));
        if (plan.block() == Blocks.AIR) {
            return current.isAir() || current.canBeReplaced() || current.liquid() || current.is(Blocks.BEDROCK);
        }
        if (plan.fillOnly()) {
            return !current.canBeReplaced();
        }
        return current.is(plan.block());
    }

    private void skipAlreadyBuilt() {
        Level level = settler.level();
        BlockPos origin = houseOrigin();
        while (index < HOUSE_PLAN.size() && isStepDone(level, origin, HOUSE_PLAN.get(index))) {
            index++;
        }
    }

    private static int woodCost(Block block) {
        return block == Blocks.OAK_PLANKS || block == Blocks.OAK_LOG ? 1 : 0;
    }

    private static int stoneCost(Block block) {
        return block == Blocks.COBBLESTONE ? 1 : 0;
    }

    /**
     * План дома 5x5: каменный пол, стены из досок с брёвнами по углам,
     * окна, дверной проём и плоская крыша. Дверь смотрит на юг (+Z).
     */
    private static List<PlanBlock> buildHousePlan() {
        List<PlanBlock> plan = new ArrayList<>();
        int size = KingdomLayout.HOUSE_SIZE;
        // Фундамент: до 4 блоков вниз заполняем ямы булыжником.
        for (int y = -4; y <= -1; y++) {
            for (int x = 0; x < size; x++) {
                for (int z = 0; z < size; z++) {
                    plan.add(new PlanBlock(x, y, z, Blocks.COBBLESTONE, true));
                }
            }
        }
        // Расчистка площадки: всё, что торчит из склона внутри дома и на 1 блок вокруг, выкапывается.
        for (int y = 0; y <= 5; y++) {
            for (int x = -1; x <= size; x++) {
                for (int z = -1; z <= size; z++) {
                    plan.add(new PlanBlock(x, y, z, Blocks.AIR));
                }
            }
        }
        for (int x = 0; x < size; x++) {
            for (int z = 0; z < size; z++) {
                plan.add(new PlanBlock(x, 0, z, Blocks.COBBLESTONE));
            }
        }
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
        for (int x = 0; x < size; x++) {
            for (int z = 0; z < size; z++) {
                plan.add(new PlanBlock(x, 4, z, Blocks.OAK_PLANKS));
            }
        }
        plan.add(new PlanBlock(2, 1, 1, Blocks.TORCH));
        return plan;
    }
}

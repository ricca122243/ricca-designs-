package com.ricca.civilizations.entity;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.block.TownHallBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

import javax.annotation.Nullable;
import java.util.EnumSet;

/**
 * Работа строителя: взять проект у ратуши (дом, склад, стена или заказ игрока),
 * расчистить место, подсыпать фундамент и поставить блоки по чертежу,
 * тратя дерево и камень со склада.
 */
public class BuildGoal extends Goal {
    private static final int PLACE_DELAY_TICKS = 10;
    private static final int NO_RESOURCES_DELAY_TICKS = 60;
    private static final double REACH_SQR = 5.5 * 5.5;
    private static final int STUCK_LIMIT_TICKS = 60;
    private static final double MAGIC_REACH_SQR = 9.0 * 9.0;

    private final SettlerEntity settler;
    @Nullable
    private Blueprint blueprint;
    private BlockPos origin = BlockPos.ZERO;
    private int index;
    private int cooldown;
    private int stuckTicks;
    private int passes;

    public BuildGoal(SettlerEntity settler) {
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
        if (settler.getProjectType() == null) {
            TownHallBlockEntity.Project project = hall.claimProject();
            if (project == null) {
                return false; // строить нечего
            }
            settler.setProject(project.type(), project.houseIndex());
            settler.setProjectOrigin(project.origin());
        }
        return true;
    }

    @Override
    public boolean canContinueToUse() {
        return settler.getProfession() == Profession.BUILDER && settler.getProjectType() != null && townHall() != null;
    }

    @Override
    public void start() {
        settler.setTask("build");
        Blueprint.Type type = settler.getProjectType();
        blueprint = type == null ? null : Blueprint.of(type);
        origin = type == null ? BlockPos.ZERO
                : settler.getProjectOrigin() != null ? settler.getProjectOrigin()
                : Blueprint.origin(type, settler.getTownHall(), settler.getHouseIndex());
        index = 0;
        passes = 0;
        cooldown = PLACE_DELAY_TICKS;
        stuckTicks = 0;
        skipDone();
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
        TownHallBlockEntity hall = townHall();
        if (hall == null || blueprint == null) {
            return;
        }
        Level level = settler.level();
        skipDone();
        if (index >= blueprint.steps.size()) {
            if (passes < 3) {
                passes++;
                index = 0;
                skipDone();
                if (index < blueprint.steps.size()) {
                    return;
                }
            }
            hall.projectFinished(blueprint.type, settler.getHouseIndex());
            settler.setProject(null, -1);
            settler.setProjectOrigin(null);
            return;
        }

        Blueprint.Step step = blueprint.steps.get(index);
        BlockPos target = origin.offset(step.x(), step.y(), step.z());
        Vec3 center = target.getCenter();
        settler.getLookControl().setLookAt(center.x, center.y, center.z);

        int skill = settler.getBuildSkill();
        double reach = 5.5 + (skill - 1) * 0.6;
        boolean inTheWay = settler.getBoundingBox().intersects(new AABB(target));
        boolean tooFar = settler.distanceToSqr(center) > reach * reach;
        boolean insideSite = !blueprint.walkInside()
                && KingdomLayout.insideBox(origin, blueprint.minX, blueprint.minZ, blueprint.maxX, blueprint.maxZ, settler.blockPosition());
        if (tooFar || inTheWay || insideSite) {
            Vec3 stand;
            if (blueprint.walkInside()) {
                BlockPos surf = KingdomLayout.surface(settler, target.getX() + (inTheWay ? 1 : 0), target.getZ());
                stand = new Vec3(surf.getX() + 0.5, surf.getY(), surf.getZ() + 0.5);
            } else {
                stand = KingdomLayout.standingSpotBox(settler, origin, blueprint.minX, blueprint.minZ, blueprint.maxX, blueprint.maxZ, target).getCenter();
            }
            // Путь не находится, а блок недалеко — работаем с места (строитель тянется, как игрок).
            boolean pathless = settler.getNavigation().createPath(stand.x, stand.y, stand.z, 0) == null;
            if (pathless && !inTheWay && settler.distanceToSqr(center) < MAGIC_REACH_SQR) {
                stuckTicks = 0;
            } else {
                if (settler.getNavigation().isDone() || settler.tickCount % 20 == 0) {
                    settler.getNavigation().moveTo(stand.x, stand.y, stand.z, 0.7);
                }
                if (++stuckTicks > STUCK_LIMIT_TICKS) {
                    stuckTicks = 0;
                    index++;
                }
                return;
            }
        }

        stuckTicks = 0;
        if (--cooldown > 0) {
            return;
        }
        cooldown = Math.max(2, (PLACE_DELAY_TICKS - (skill - 1) * 2) / (hall.getArchitects() > 0 ? 2 : 1));

        BlockState current = level.getBlockState(target);
        if (step.fillOnly() && !current.canBeReplaced()) {
            index++;
            return;
        }
        // Расчистка: мешает земля, камень, листва — выкапываем (камень и брёвна на склад).
        if (!current.canBeReplaced() && !current.isAir()) {
            dig(level, target, current, hall);
            settler.swing(InteractionHand.MAIN_HAND);
            settler.addBuildXp(1);
            return;
        }
        if (step.isAir()) {
            index++;
            return;
        }
        if (!hall.take(Blueprint.woodCost(step.state()), Blueprint.stoneCost(step.state()))) {
            cooldown = NO_RESOURCES_DELAY_TICKS;
            return;
        }
        level.setBlock(target, step.state(), step.quiet() ? 18 : 3);
        level.playSound(null, target, step.state().getSoundType().getPlaceSound(), SoundSource.BLOCKS, 1.0f, 0.9f);
        settler.swing(InteractionHand.MAIN_HAND);
        settler.addBuildXp(1);
        index++;
    }

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

    @Nullable
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

    private static boolean isStepDone(Level level, BlockPos origin, Blueprint.Step step) {
        BlockState current = level.getBlockState(origin.offset(step.x(), step.y(), step.z()));
        if (step.isAir()) {
            return current.isAir() || current.canBeReplaced() || current.liquid() || current.is(Blocks.BEDROCK);
        }
        if (step.fillOnly()) {
            return !current.canBeReplaced();
        }
        return current.is(step.state().getBlock());
    }

    private void skipDone() {
        if (blueprint == null) {
            return;
        }
        Level level = settler.level();
        while (index < blueprint.steps.size() && isStepDone(level, origin, blueprint.steps.get(index))) {
            index++;
        }
    }
}

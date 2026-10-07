package com.ricca.civilizations.entity;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.level.block.BedBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BedPart;

import java.util.ArrayList;
import java.util.List;

/**
 * Чертёж постройки: список шагов (смещение от угла и какой блок поставить).
 * Шаг с воздухом — расчистка, fillOnly — фундамент (только засыпать ямы).
 */
public final class Blueprint {
    public record Step(int x, int y, int z, BlockState state, boolean fillOnly, boolean quiet) {
        public boolean isAir() {
            return state.isAir();
        }
    }

    public enum Type { HOUSE, WAREHOUSE, WALL }

    public final Type type;
    public final List<Step> steps;
    /** Габариты (относительно угла) для кольца, с которого строитель работает. */
    public final int minX, minZ, maxX, maxZ;

    private Blueprint(Type type, List<Step> steps, int minX, int minZ, int maxX, int maxZ) {
        this.type = type;
        this.steps = steps;
        this.minX = minX;
        this.minZ = minZ;
        this.maxX = maxX;
        this.maxZ = maxZ;
    }

    public static final Blueprint HOUSE = house();
    public static final Blueprint WAREHOUSE = warehouse();
    public static final Blueprint WALL = wall();

    public static Blueprint of(Type type) {
        return switch (type) {
            case HOUSE -> HOUSE;
            case WAREHOUSE -> WAREHOUSE;
            case WALL -> WALL;
        };
    }

    /** Угол постройки в мире. */
    public static BlockPos origin(Type type, BlockPos hall, int houseIndex) {
        return switch (type) {
            case HOUSE -> KingdomLayout.houseOrigin(hall, houseIndex);
            case WAREHOUSE -> KingdomLayout.warehouseOrigin(hall);
            case WALL -> KingdomLayout.wallOrigin(hall);
        };
    }

    public static int woodCost(BlockState s) {
        if (s.is(Blocks.OAK_PLANKS) || s.is(Blocks.OAK_LOG) || s.is(Blocks.OAK_FENCE)) return 1;
        if (s.is(Blocks.CHEST)) return 2;
        if (s.getBlock() instanceof BedBlock) return 2;
        return 0;
    }

    public static int stoneCost(BlockState s) {
        return s.is(Blocks.COBBLESTONE) || s.is(Blocks.COBBLESTONE_WALL) ? 1 : 0;
    }

    /** Сколько всего нужно ресурсов на чертёж. */
    public int totalWood() {
        int n = 0;
        for (Step s : steps) if (!s.fillOnly()) n += woodCost(s.state());
        return n;
    }

    public int totalStone() {
        int n = 0;
        for (Step s : steps) if (!s.fillOnly()) n += stoneCost(s.state());
        return n;
    }

    // ---------------- Чертежи ----------------

    private static void foundation(List<Step> plan, int size) {
        for (int y = -4; y <= -1; y++)
            for (int x = 0; x < size; x++)
                for (int z = 0; z < size; z++)
                    plan.add(new Step(x, y, z, Blocks.COBBLESTONE.defaultBlockState(), true, false));
    }

    private static void clear(List<Step> plan, int size, int height) {
        for (int y = 0; y <= height; y++)
            for (int x = -1; x <= size; x++)
                for (int z = -1; z <= size; z++)
                    plan.add(new Step(x, y, z, Blocks.AIR.defaultBlockState(), false, false));
    }

    /** Дом 5x5: пол, стены с окнами и дверным проёмом, крыша, кровать и факел. */
    private static Blueprint house() {
        List<Step> plan = new ArrayList<>();
        int size = KingdomLayout.HOUSE_SIZE;
        foundation(plan, size);
        clear(plan, size, 5);
        box(plan, size);
        // Кровать у западной стены, изголовье к северу
        plan.add(new Step(1, 1, 2, Blocks.RED_BED.defaultBlockState().setValue(BedBlock.FACING, Direction.NORTH).setValue(BedBlock.PART, BedPart.FOOT), false, true));
        plan.add(new Step(1, 1, 1, Blocks.RED_BED.defaultBlockState().setValue(BedBlock.FACING, Direction.NORTH).setValue(BedBlock.PART, BedPart.HEAD), false, true));
        plan.add(new Step(3, 1, 1, Blocks.TORCH.defaultBlockState(), false, false));
        return new Blueprint(Type.HOUSE, plan, 0, 0, size - 1, size - 1);
    }

    /** Склад 5x5: как дом, но внутри четыре сундука. */
    private static Blueprint warehouse() {
        List<Step> plan = new ArrayList<>();
        int size = KingdomLayout.HOUSE_SIZE;
        foundation(plan, size);
        clear(plan, size, 5);
        box(plan, size);
        plan.add(new Step(1, 1, 1, Blocks.CHEST.defaultBlockState(), false, false));
        plan.add(new Step(3, 1, 1, Blocks.CHEST.defaultBlockState(), false, false));
        plan.add(new Step(1, 1, 3, Blocks.CHEST.defaultBlockState(), false, false));
        plan.add(new Step(3, 1, 3, Blocks.CHEST.defaultBlockState(), false, false));
        plan.add(new Step(2, 1, 1, Blocks.TORCH.defaultBlockState(), false, false));
        return new Blueprint(Type.WAREHOUSE, plan, 0, 0, size - 1, size - 1);
    }

    /** Коробка здания: пол, три яруса стен, крыша. Дверь на юг (+Z). */
    private static void box(List<Step> plan, int size) {
        for (int x = 0; x < size; x++)
            for (int z = 0; z < size; z++)
                plan.add(new Step(x, 0, z, Blocks.COBBLESTONE.defaultBlockState(), false, false));
        for (int y = 1; y <= 3; y++) {
            for (int x = 0; x < size; x++) {
                for (int z = 0; z < size; z++) {
                    boolean edge = x == 0 || z == 0 || x == size - 1 || z == size - 1;
                    if (!edge) continue;
                    boolean corner = (x == 0 || x == size - 1) && (z == 0 || z == size - 1);
                    boolean door = z == size - 1 && x == 2 && y <= 2;
                    if (door) continue;
                    boolean window = y == 2 && !corner && (x == 2 || z == 2);
                    Block block = corner ? Blocks.OAK_LOG : window ? Blocks.GLASS_PANE : Blocks.OAK_PLANKS;
                    plan.add(new Step(x, y, z, block.defaultBlockState(), false, false));
                }
            }
        }
        for (int x = 0; x < size; x++)
            for (int z = 0; z < size; z++)
                plan.add(new Step(x, 4, z, Blocks.OAK_PLANKS.defaultBlockState(), false, false));
    }

    /**
     * Стена вокруг поселения: булыжник в два блока, ворота на юге и севере (3 блока),
     * по углам сторожевые столбы с факелами, факелы по верху стены.
     */
    private static Blueprint wall() {
        List<Step> plan = new ArrayList<>();
        int w = KingdomLayout.WALL_WIDTH;
        int d = KingdomLayout.WALL_DEPTH;
        int gateHalf = 1;
        for (int y = 0; y <= 1; y++) {
            for (int x = 0; x < w; x++) {
                for (int z = 0; z < d; z++) {
                    boolean edge = x == 0 || z == 0 || x == w - 1 || z == d - 1;
                    if (!edge) continue;
                    boolean gate = (z == 0 || z == d - 1) && Math.abs(x - w / 2) <= gateHalf;
                    if (gate) {
                        plan.add(new Step(x, y, z, Blocks.AIR.defaultBlockState(), false, false));
                        continue;
                    }
                    plan.add(new Step(x, y, z, Blocks.COBBLESTONE.defaultBlockState(), false, false));
                }
            }
        }
        // Угловые столбы-посты
        int[][] corners = {{0, 0}, {w - 1, 0}, {0, d - 1}, {w - 1, d - 1}};
        for (int[] c : corners) {
            for (int y = 2; y <= 4; y++)
                plan.add(new Step(c[0], y, c[1], Blocks.COBBLESTONE.defaultBlockState(), false, false));
            plan.add(new Step(c[0], 5, c[1], Blocks.TORCH.defaultBlockState(), false, false));
        }
        // Факелы по стене
        for (int x = 4; x < w - 1; x += 6) {
            plan.add(new Step(x, 2, 0, Blocks.TORCH.defaultBlockState(), false, false));
            plan.add(new Step(x, 2, d - 1, Blocks.TORCH.defaultBlockState(), false, false));
        }
        for (int z = 4; z < d - 1; z += 6) {
            plan.add(new Step(0, 2, z, Blocks.TORCH.defaultBlockState(), false, false));
            plan.add(new Step(w - 1, 2, z, Blocks.TORCH.defaultBlockState(), false, false));
        }
        return new Blueprint(Type.WALL, plan, 0, 0, w - 1, d - 1);
    }
}

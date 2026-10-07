package com.ricca.civilizations.entity;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.level.block.BedBlock;
import net.minecraft.world.level.block.FenceGateBlock;
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

    public enum Type { LEVELING, HOUSE, WAREHOUSE, WALL, PEN, KEEP, SHIP_EW, SHIP_NS }

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
    public static final Blueprint PEN = pen();
    public static final Blueprint LEVELING = leveling();
    public static final Blueprint KEEP = keep();
    public static final Blueprint SHIP_EW = ship(true);
    public static final Blueprint SHIP_NS = ship(false);

    public static Blueprint of(Type type) {
        return switch (type) {
            case HOUSE -> HOUSE;
            case WAREHOUSE -> WAREHOUSE;
            case WALL -> WALL;
            case PEN -> PEN;
            case LEVELING -> LEVELING;
            case KEEP -> KEEP;
            case SHIP_EW -> SHIP_EW;
            case SHIP_NS -> SHIP_NS;
        };
    }

    /** Строитель работает, стоя рядом с блоком (а не с кольца вокруг площадки). */
    public boolean walkInside() {
        return type == Type.WALL || type == Type.LEVELING || type == Type.SHIP_EW || type == Type.SHIP_NS;
    }

    /** Угол постройки в мире (для корабля угол задаёт ратуша, здесь null). */
    public static BlockPos origin(Type type, BlockPos hall, int houseIndex) {
        return switch (type) {
            case HOUSE -> KingdomLayout.houseOrigin(hall, houseIndex);
            case WAREHOUSE -> KingdomLayout.warehouseOrigin(hall);
            case WALL -> KingdomLayout.wallOrigin(hall);
            case PEN -> KingdomLayout.penOrigin(hall);
            case LEVELING -> KingdomLayout.levelingOrigin(hall);
            case KEEP -> KingdomLayout.keepOrigin(hall);
            case SHIP_EW, SHIP_NS -> hall;
        };
    }

    public static int woodCost(BlockState s) {
        if (s.is(Blocks.OAK_PLANKS) || s.is(Blocks.OAK_LOG) || s.is(Blocks.OAK_FENCE) || s.is(Blocks.OAK_FENCE_GATE)) return 1;
        if (s.is(Blocks.CHEST)) return 2;
        if (s.getBlock() instanceof BedBlock) return 2;
        return 0;
    }

    public static int stoneCost(BlockState s) {
        return s.is(Blocks.COBBLESTONE) || s.is(Blocks.COBBLESTONE_WALL) || s.is(Blocks.STONE_BRICKS) ? 1 : 0;
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

    /** Выравнивание: всё внутри стены срезается до уровня ратуши, ямы засыпаются землёй. */
    private static Blueprint leveling() {
        List<Step> plan = new ArrayList<>();
        int w = KingdomLayout.WALL_WIDTH - 2;
        int d = KingdomLayout.WALL_DEPTH - 2;
        for (int y = -3; y <= -2; y++)
            for (int x = 0; x < w; x++)
                for (int z = 0; z < d; z++)
                    plan.add(new Step(x, y, z, Blocks.DIRT.defaultBlockState(), true, false));
        for (int x = 0; x < w; x++)
            for (int z = 0; z < d; z++)
                plan.add(new Step(x, -1, z, Blocks.GRASS_BLOCK.defaultBlockState(), true, false));
        // Срезаем сверху вниз, чтобы не оставлять «висящих» кусков
        for (int y = 6; y >= 0; y--)
            for (int x = 0; x < w; x++)
                for (int z = 0; z < d; z++)
                    plan.add(new Step(x, y, z, Blocks.AIR.defaultBlockState(), false, false));
        return new Blueprint(Type.LEVELING, plan, 0, 0, w - 1, d - 1);
    }

    /** Замок-донжон 9x9: каменные стены в 5 блоков, зубцы, бойницы, вход с юга. */
    private static Blueprint keep() {
        List<Step> plan = new ArrayList<>();
        int size = KingdomLayout.KEEP_SIZE;
        foundation(plan, size);
        clear(plan, size, 9);
        for (int x = 0; x < size; x++)
            for (int z = 0; z < size; z++)
                plan.add(new Step(x, 0, z, Blocks.COBBLESTONE.defaultBlockState(), false, false));
        for (int y = 1; y <= 5; y++) {
            for (int x = 0; x < size; x++) {
                for (int z = 0; z < size; z++) {
                    boolean edge = x == 0 || z == 0 || x == size - 1 || z == size - 1;
                    if (!edge) continue;
                    boolean door = z == size - 1 && x == size / 2 && y <= 2;
                    if (door) continue;
                    boolean corner = (x == 0 || x == size - 1) && (z == 0 || z == size - 1);
                    boolean window = y == 3 && !corner && (x % 2 == 0) && (z % 2 == 0);
                    Block block = window ? Blocks.GLASS_PANE : corner ? Blocks.STONE_BRICKS : Blocks.COBBLESTONE;
                    plan.add(new Step(x, y, z, block.defaultBlockState(), false, false));
                }
            }
        }
        for (int x = 0; x < size; x++)
            for (int z = 0; z < size; z++)
                plan.add(new Step(x, 6, z, Blocks.COBBLESTONE.defaultBlockState(), false, false));
        // Зубцы
        for (int x = 0; x < size; x++) {
            for (int z = 0; z < size; z++) {
                boolean edge = x == 0 || z == 0 || x == size - 1 || z == size - 1;
                if (edge && (x + z) % 2 == 0) {
                    plan.add(new Step(x, 7, z, Blocks.COBBLESTONE.defaultBlockState(), false, false));
                }
            }
        }
        plan.add(new Step(0, 8, 0, Blocks.TORCH.defaultBlockState(), false, false));
        plan.add(new Step(size - 1, 8, 0, Blocks.TORCH.defaultBlockState(), false, false));
        plan.add(new Step(0, 8, size - 1, Blocks.TORCH.defaultBlockState(), false, false));
        plan.add(new Step(size - 1, 8, size - 1, Blocks.TORCH.defaultBlockState(), false, false));
        plan.add(new Step(size / 2, 1, 2, Blocks.TORCH.defaultBlockState(), false, false));
        plan.add(new Step(2, 1, size / 2, Blocks.TORCH.defaultBlockState(), false, false));
        plan.add(new Step(size - 3, 1, size / 2, Blocks.TORCH.defaultBlockState(), false, false));
        return new Blueprint(Type.KEEP, plan, 0, 0, size - 1, size - 1);
    }

    /** Корабль 7x5 на воде: палуба из досок, борта-перила, мачта и парус. Угол — у берега. */
    private static Blueprint ship(boolean eastWest) {
        List<Step> plan = new ArrayList<>();
        int len = 7;
        int wid = 5;
        for (int a = 0; a < len; a++) {
            for (int b = 0; b < wid; b++) {
                boolean tip = (a == 0 || a == len - 1) && (b == 0 || b == wid - 1);
                if (tip) continue;
                int x = eastWest ? a : b;
                int z = eastWest ? b : a;
                plan.add(new Step(x, 0, z, Blocks.OAK_PLANKS.defaultBlockState(), false, false));
                boolean edge = a == 0 || a == len - 1 || b == 0 || b == wid - 1;
                if (edge) {
                    plan.add(new Step(x, 1, z, Blocks.OAK_FENCE.defaultBlockState(), false, false));
                }
            }
        }
        int mx = eastWest ? len / 2 : wid / 2;
        int mz = eastWest ? wid / 2 : len / 2;
        for (int y = 1; y <= 6; y++)
            plan.add(new Step(mx, y, mz, Blocks.OAK_LOG.defaultBlockState(), false, false));
        for (int y = 3; y <= 5; y++) {
            for (int o = -1; o <= 1; o++) {
                if (o == 0) continue;
                int x = eastWest ? mx : mx + o;
                int z = eastWest ? mz + o : mz;
                plan.add(new Step(x, y, z, Blocks.WHITE_WOOL.defaultBlockState(), false, false));
            }
        }
        plan.add(new Step(mx, 7, mz, Blocks.TORCH.defaultBlockState(), false, false));
        return new Blueprint(eastWest ? Type.SHIP_EW : Type.SHIP_NS, plan, 0, 0, eastWest ? len - 1 : wid - 1, eastWest ? wid - 1 : len - 1);
    }

    /** Загон 7x7: забор по кругу, калитка на западе, внутри ровная трава. */
    private static Blueprint pen() {
        List<Step> plan = new ArrayList<>();
        int size = KingdomLayout.PEN_SIZE;
        foundation(plan, size);
        clear(plan, size, 3);
        for (int x = 0; x < size; x++) {
            for (int z = 0; z < size; z++) {
                boolean edge = x == 0 || z == 0 || x == size - 1 || z == size - 1;
                if (!edge) continue;
                if (x == 0 && z == size / 2) {
                    plan.add(new Step(x, 0, z, Blocks.OAK_FENCE_GATE.defaultBlockState().setValue(FenceGateBlock.FACING, Direction.EAST), false, false));
                } else {
                    plan.add(new Step(x, 0, z, Blocks.OAK_FENCE.defaultBlockState(), false, false));
                }
            }
        }
        return new Blueprint(Type.PEN, plan, 0, 0, size - 1, size - 1);
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

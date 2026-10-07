package com.ricca.civilizations.entity;

import net.minecraft.core.BlockPos;
import net.minecraft.world.entity.PathfinderMob;

/**
 * План королевства: где относительно ратуши стоят дома и поле.
 * Все координаты — смещения от блока ратуши.
 */
public final class KingdomLayout {
    public static final int HOUSE_SIZE = 5;
    public static final int FARM_SIZE = 5;
    public static final int QUARRY_SIZE = 5;
    public static final int PEN_SIZE = 7;
    /** Стена: прямоугольник от угла wallOrigin шириной WALL_WIDTH (x) и глубиной WALL_DEPTH (z). */
    public static final int WALL_WIDTH = 30;
    public static final int WALL_DEPTH = 34;

    /** Углы домов (x, z). Север (−z) оставлен под поле. */
    private static final int[][] HOUSE_OFFSETS = {
            {5, -2}, {-9, -2}, {-2, 5}, {5, 5}, {-9, 5}, {5, -9}, {-9, -9}, {-2, 12},
            // второе кольцо — за стеной
            {18, 5}, {18, 12}, {-23, -9}, {-23, -2}, {-23, 5}, {-23, 12}, {-9, 21}, {-2, 21}, {5, 21}
    };
    public static final int KEEP_SIZE = 9;
    public static final int TOWER_SIZE = 3;
    private static final int[] TOWER_OFFSET = {12, -12};
    private static final int[] KEEP_OFFSET = {-4, -27};
    private static final int[] FARM_OFFSET = {-2, -9};
    private static final int[] QUARRY_OFFSET = {8, 12};
    private static final int[] WAREHOUSE_OFFSET = {-9, 12};
    private static final int[] WALL_OFFSET = {-14, -14};
    /** Загон — снаружи стены, к востоку. */
    private static final int[] PEN_OFFSET = {18, -3};

    private KingdomLayout() {}

    public static int houseCount() {
        return HOUSE_OFFSETS.length;
    }

    public static BlockPos houseOrigin(BlockPos hall, int houseIndex) {
        int[] o = HOUSE_OFFSETS[Math.floorMod(houseIndex, HOUSE_OFFSETS.length)];
        return hall.offset(o[0], 0, o[1]);
    }

    public static BlockPos farmOrigin(BlockPos hall) {
        return hall.offset(FARM_OFFSET[0], 0, FARM_OFFSET[1]);
    }

    public static BlockPos warehouseOrigin(BlockPos hall) {
        return hall.offset(WAREHOUSE_OFFSET[0], 0, WAREHOUSE_OFFSET[1]);
    }

    public static BlockPos penOrigin(BlockPos hall) {
        return hall.offset(PEN_OFFSET[0], 0, PEN_OFFSET[1]);
    }

    public static BlockPos towerOrigin(BlockPos hall) {
        return hall.offset(TOWER_OFFSET[0], 0, TOWER_OFFSET[1]);
    }

    /** Площадка лучника на вершине башни. */
    public static BlockPos towerTop(BlockPos hall) {
        return towerOrigin(hall).offset(1, 7, 1);
    }

    public static BlockPos keepOrigin(BlockPos hall) {
        return hall.offset(KEEP_OFFSET[0], 0, KEEP_OFFSET[1]);
    }

    /** Площадка выравнивания: всё внутри стены. */
    public static BlockPos levelingOrigin(BlockPos hall) {
        return wallOrigin(hall).offset(1, 0, 1);
    }

    public static BlockPos wallOrigin(BlockPos hall) {
        return hall.offset(WALL_OFFSET[0], 0, WALL_OFFSET[1]);
    }

    /** Южные ворота — пост стражи. */
    public static BlockPos gatePos(BlockPos hall) {
        return wallOrigin(hall).offset(WALL_WIDTH / 2, 0, WALL_DEPTH);
    }

    public static boolean insideBox(BlockPos origin, int minX, int minZ, int maxX, int maxZ, BlockPos pos) {
        return pos.getX() >= origin.getX() + minX && pos.getX() <= origin.getX() + maxX
                && pos.getZ() >= origin.getZ() + minZ && pos.getZ() <= origin.getZ() + maxZ
                && pos.getY() >= origin.getY() - 1 && pos.getY() <= origin.getY() + 6;
    }

    public static BlockPos standingSpotBox(PathfinderMob mob, BlockPos origin, int minX, int minZ, int maxX, int maxZ, BlockPos target) {
        int lo = origin.getX() + minX - 1;
        int hi = origin.getX() + maxX + 1;
        int loZ = origin.getZ() + minZ - 1;
        int hiZ = origin.getZ() + maxZ + 1;
        BlockPos[] candidates = {
                surface(mob, lo, target.getZ()),
                surface(mob, hi, target.getZ()),
                surface(mob, target.getX(), loZ),
                surface(mob, target.getX(), hiZ)
        };
        BlockPos best = candidates[0];
        double bestDist = Double.MAX_VALUE;
        for (BlockPos c : candidates) {
            double d = mob.distanceToSqr(c.getCenter());
            if (d < bestDist) {
                bestDist = d;
                best = c;
            }
        }
        return best;
    }

    public static BlockPos quarryOrigin(BlockPos hall) {
        return hall.offset(QUARRY_OFFSET[0], 0, QUARRY_OFFSET[1]);
    }

    /** Находится ли точка внутри площадки размером size×size с углом origin (по высоте — с запасом). */
    public static boolean inside(BlockPos origin, int size, BlockPos pos) {
        return pos.getX() >= origin.getX() && pos.getX() < origin.getX() + size
                && pos.getZ() >= origin.getZ() && pos.getZ() < origin.getZ() + size
                && pos.getY() >= origin.getY() - 1 && pos.getY() <= origin.getY() + 6;
    }

    /** Занято ли место под постройки королевства (чтобы дровосек не рубил брёвна домов). */
    public static boolean isReserved(BlockPos hall, BlockPos pos) {
        if (pos.distManhattan(hall) <= 2) {
            return true;
        }
        if (inside(farmOrigin(hall), FARM_SIZE, pos) || inside(quarryOrigin(hall), QUARRY_SIZE, pos)
                || inside(warehouseOrigin(hall), HOUSE_SIZE, pos) || inside(penOrigin(hall), PEN_SIZE, pos)
                || inside(keepOrigin(hall), KEEP_SIZE, pos) || inside(towerOrigin(hall), TOWER_SIZE, pos)) {
            return true;
        }
        BlockPos w = wallOrigin(hall);
        boolean onWallLine = (pos.getX() == w.getX() || pos.getX() == w.getX() + WALL_WIDTH - 1
                || pos.getZ() == w.getZ() || pos.getZ() == w.getZ() + WALL_DEPTH - 1)
                && pos.getX() >= w.getX() && pos.getX() < w.getX() + WALL_WIDTH
                && pos.getZ() >= w.getZ() && pos.getZ() < w.getZ() + WALL_DEPTH;
        if (onWallLine) {
            return true;
        }
        for (int i = 0; i < HOUSE_OFFSETS.length; i++) {
            if (inside(houseOrigin(hall, i), HOUSE_SIZE, pos)) {
                return true;
            }
        }
        return false;
    }

    /** Ближайшая к мобу точка на кольце вокруг площадки, с которой удобно работать с блоком target. */
    public static BlockPos standingSpot(PathfinderMob mob, BlockPos origin, int size, BlockPos target) {
        int minX = origin.getX() - 1;
        int maxX = origin.getX() + size;
        int minZ = origin.getZ() - 1;
        int maxZ = origin.getZ() + size;
        BlockPos[] candidates = {
                surface(mob, minX, target.getZ()),
                surface(mob, maxX, target.getZ()),
                surface(mob, target.getX(), minZ),
                surface(mob, target.getX(), maxZ)
        };
        BlockPos best = candidates[0];
        double bestDist = Double.MAX_VALUE;
        for (BlockPos c : candidates) {
            double d = mob.distanceToSqr(c.getCenter());
            if (d < bestDist) {
                bestDist = d;
                best = c;
            }
        }
        return best;
    }

    /** Точка на поверхности земли в столбце (x, z): туда реально можно дойти. */
    public static BlockPos surface(PathfinderMob mob, int x, int z) {
        int y = mob.level().getHeight(net.minecraft.world.level.levelgen.Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
        return new BlockPos(x, y, z);
    }
}

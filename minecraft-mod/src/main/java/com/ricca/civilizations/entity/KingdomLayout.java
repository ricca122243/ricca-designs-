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

    /** Углы домов (x, z). Север (−z) оставлен под поле. */
    private static final int[][] HOUSE_OFFSETS = {
            {5, -2}, {-9, -2}, {-2, 5}, {5, 5}, {-9, 5}, {5, -9}, {-9, -9}, {-2, 12}
    };
    private static final int[] FARM_OFFSET = {-2, -9};

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
        if (inside(farmOrigin(hall), FARM_SIZE, pos)) {
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
        int y = origin.getY();
        BlockPos[] candidates = {
                new BlockPos(minX, y, target.getZ()),
                new BlockPos(maxX, y, target.getZ()),
                new BlockPos(target.getX(), y, minZ),
                new BlockPos(target.getX(), y, maxZ)
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
}

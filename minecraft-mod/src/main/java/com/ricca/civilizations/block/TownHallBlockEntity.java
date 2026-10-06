package com.ricca.civilizations.block;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.entity.KingdomLayout;
import com.ricca.civilizations.entity.Profession;
import com.ricca.civilizations.entity.SettlerEntity;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;

import javax.annotation.Nullable;
import java.util.List;

/**
 * Данные королевства хранятся в ратуше: название, склад ресурсов,
 * сколько домов построено. Ратуша же «рожает» новых жителей, когда есть еда.
 */
public class TownHallBlockEntity extends BlockEntity {
    private static final int GROWTH_INTERVAL_TICKS = 600;
    private static final int FOOD_PER_SETTLER = 15;

    private String kingdom = "";
    private int wood = 80;
    private int stone = 150;
    private int food = 0;
    private int housesBuilt = 0;
    private int nextHouse = 0;
    private int growthTimer = 0;

    public TownHallBlockEntity(BlockPos pos, BlockState state) {
        super(Civilizations.TOWN_HALL_BE.get(), pos, state);
    }

    @Nullable
    public static TownHallBlockEntity at(Level level, @Nullable BlockPos pos) {
        if (pos == null) {
            return null;
        }
        return level.getBlockEntity(pos) instanceof TownHallBlockEntity th ? th : null;
    }

    // --- Королевство ---

    public String getKingdom() {
        return kingdom;
    }

    public void setKingdom(String kingdom) {
        this.kingdom = kingdom;
        setChanged();
    }

    public int getWood() { return wood; }
    public int getStone() { return stone; }
    public int getFood() { return food; }
    public int getHousesBuilt() { return housesBuilt; }

    public void addWood(int amount) { wood += amount; setChanged(); }
    public void addStone(int amount) { stone += amount; setChanged(); }
    public void addFood(int amount) { food += amount; setChanged(); }

    /** Забрать ресурсы со склада. Возвращает false, если не хватает. */
    public boolean take(int woodCost, int stoneCost) {
        if (wood < woodCost || stone < stoneCost) {
            return false;
        }
        wood -= woodCost;
        stone -= stoneCost;
        setChanged();
        return true;
    }

    /** Строитель занимает следующий свободный участок под дом. −1, если участков больше нет. */
    public int claimHouse() {
        if (nextHouse >= KingdomLayout.houseCount()) {
            return -1;
        }
        setChanged();
        return nextHouse++;
    }

    public void houseFinished() {
        housesBuilt++;
        setChanged();
    }

    public List<SettlerEntity> settlers(ServerLevel level) {
        BlockPos pos = getBlockPos();
        return level.getEntitiesOfClass(SettlerEntity.class, new AABB(pos).inflate(48.0),
                s -> pos.equals(s.getTownHall()));
    }

    /** Показать игроку сводку по королевству. */
    public void sendStats(Player player) {
        int population = 0;
        int warriors = 0;
        if (level instanceof ServerLevel serverLevel) {
            for (SettlerEntity s : settlers(serverLevel)) {
                population++;
                if (s.getProfession() == Profession.WARRIOR) {
                    warriors++;
                }
            }
        }
        player.displayClientMessage(Component.translatable("civilizations.townhall.title", kingdom).withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD), false);
        player.displayClientMessage(Component.translatable("civilizations.townhall.population", population, warriors, housesBuilt), false);
        player.displayClientMessage(Component.translatable("civilizations.townhall.resources", wood, stone, food), false);
    }

    // --- Рост королевства ---

    public static void serverTick(Level level, BlockPos pos, BlockState state, TownHallBlockEntity th) {
        if (!(level instanceof ServerLevel serverLevel)) {
            return;
        }
        if (++th.growthTimer < GROWTH_INTERVAL_TICKS) {
            return;
        }
        th.growthTimer = 0;

        List<SettlerEntity> settlers = th.settlers(serverLevel);
        int capacity = 4 + th.housesBuilt * 2;
        if (settlers.size() >= capacity || th.food < FOOD_PER_SETTLER) {
            return;
        }

        SettlerEntity newcomer = Civilizations.SETTLER.get().create(level);
        if (newcomer == null) {
            return;
        }
        th.food -= FOOD_PER_SETTLER;
        th.setChanged();

        Profession profession = Profession.byId(level.random.nextInt(Profession.values().length));
        double angle = level.random.nextDouble() * Math.PI * 2;
        newcomer.moveTo(pos.getX() + 0.5 + Math.cos(angle) * 2, pos.getY(), pos.getZ() + 0.5 + Math.sin(angle) * 2,
                level.random.nextFloat() * 360f, 0f);
        newcomer.setKingdom(th.kingdom);
        newcomer.setTownHall(pos);
        newcomer.setProfession(profession);
        newcomer.setPersistenceRequired();
        level.addFreshEntity(newcomer);
    }

    // --- Сохранение ---

    @Override
    protected void saveAdditional(CompoundTag tag, HolderLookup.Provider registries) {
        super.saveAdditional(tag, registries);
        tag.putString("Kingdom", kingdom);
        tag.putInt("Wood", wood);
        tag.putInt("Stone", stone);
        tag.putInt("Food", food);
        tag.putInt("HousesBuilt", housesBuilt);
        tag.putInt("NextHouse", nextHouse);
    }

    @Override
    protected void loadAdditional(CompoundTag tag, HolderLookup.Provider registries) {
        super.loadAdditional(tag, registries);
        kingdom = tag.getString("Kingdom");
        wood = tag.getInt("Wood");
        stone = tag.getInt("Stone");
        food = tag.getInt("Food");
        housesBuilt = tag.getInt("HousesBuilt");
        nextHouse = tag.getInt("NextHouse");
    }
}

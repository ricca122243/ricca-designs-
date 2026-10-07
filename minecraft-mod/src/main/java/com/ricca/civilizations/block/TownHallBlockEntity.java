package com.ricca.civilizations.block;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.entity.BanditEntity;
import com.ricca.civilizations.entity.Blueprint;
import com.ricca.civilizations.entity.KingdomLayout;
import com.ricca.civilizations.entity.Profession;
import com.ricca.civilizations.entity.SettlerEntity;
import com.ricca.civilizations.kingdom.KingdomSavedData;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.MobSpawnType;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.levelgen.Heightmap;
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
    private int wood = 120;
    private int stone = 150;
    private int food = 0;
    private int gold = 20;
    private int iron = 0;
    private int housesBuilt = 0;
    private int nextHouse = 0;
    private boolean warehouseBuilt = false;
    private boolean wallBuilt = false;
    /** Заказы игрока: что строить в первую очередь. */
    private final List<Blueprint.Type> orders = new java.util.ArrayList<>();
    private int tier = 1;
    private int tierTimer = 0;
    private int tricklesTimer = 0;
    private int growthTimer = 0;
    private int taxTimer = 0;

    /** Королевство под управлением компьютера. */
    private boolean npc = false;
    private int npcTimer = 0;
    private int raidTimer = 0;
    private int raidActiveTicks = 0;
    @Nullable
    private BlockPos raidTarget;

    private static final int NPC_HIRE_INTERVAL_TICKS = 2400;
    private static final int RAID_INTERVAL_TICKS = 9000;
    private static final int RAID_DURATION_TICKS = 2400;
    private static final int RAID_RANGE = 600;

    private long lastDay = -1;
    private int banditTimer = 0;
    private static final int BANDIT_INTERVAL_TICKS = 14400;

    private static final int TAX_INTERVAL_TICKS = 1200;
    private static final int SELL_THRESHOLD = 150;
    private static final int SELL_BATCH = 50;
    private static final int SELL_PRICE = 10;

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
    public boolean isWarehouseBuilt() { return warehouseBuilt; }
    public boolean isWallBuilt() { return wallBuilt; }
    public int getTier() { return tier; }

    /** Проект для строителя. */
    public record Project(Blueprint.Type type, int houseIndex) {}

    /**
     * Что строить следующим: заказы игрока, затем два дома, склад, стена, остальные дома.
     * null — строить нечего.
     */
    @Nullable
    public Project claimProject() {
        if (!orders.isEmpty()) {
            Blueprint.Type type = orders.remove(0);
            setChanged();
            return type == Blueprint.Type.HOUSE ? claimHouseProject() : new Project(type, -1);
        }
        if (housesBuilt + 0 < 2 && nextHouse < 2) {
            return claimHouseProject();
        }
        if (!warehouseBuilt) {
            return new Project(Blueprint.Type.WAREHOUSE, -1);
        }
        if (!wallBuilt) {
            return new Project(Blueprint.Type.WALL, -1);
        }
        return claimHouseProject();
    }

    @Nullable
    private Project claimHouseProject() {
        int idx = claimHouse();
        return idx < 0 ? null : new Project(Blueprint.Type.HOUSE, idx);
    }

    public void projectFinished(Blueprint.Type type, int houseIndex) {
        switch (type) {
            case HOUSE -> housesBuilt++;
            case WAREHOUSE -> warehouseBuilt = true;
            case WALL -> {
                wallBuilt = true;
                if (level instanceof ServerLevel serverLevel) {
                    for (SettlerEntity s : settlers(serverLevel)) {
                        if (s.getProfession() == Profession.GUARD) {
                            s.setGuardPost(KingdomLayout.gatePos(getBlockPos()));
                        }
                    }
                }
            }
        }
        setChanged();
    }

    /** Заказ игрока. Возвращает, сколько ресурсов нужно на постройку. */
    public Blueprint order(Blueprint.Type type) {
        orders.add(type);
        setChanged();
        return Blueprint.of(type);
    }

    /** Уровень королевства: растёт с постройками. Меняет снаряжение всех жителей. */
    private void updateTier(ServerLevel serverLevel) {
        int t = 1;
        if (warehouseBuilt) t++;
        if (wallBuilt) t++;
        if (housesBuilt >= 4 && iron >= 20) t++;
        if (t != tier) {
            tier = t;
            setChanged();
            for (SettlerEntity s : settlers(serverLevel)) {
                s.setTier(tier);
            }
            serverLevel.getServer().getPlayerList().broadcastSystemMessage(
                    Component.translatable("civilizations.tier.up", kingdom, tier).withStyle(ChatFormatting.AQUA), false);
        }
    }
    public int getGold() { return gold; }
    public int getIron() { return iron; }
    public void addIron(int amount) { iron += amount; setChanged(); }
    public boolean isNpc() { return npc; }

    /** Сделать королевство компьютерным и выдать ему стартовые запасы. */
    public void setupNpc(String name) {
        this.kingdom = name;
        this.npc = true;
        this.wood = 200;
        this.stone = 200;
        this.food = 30;
        this.gold = 100;
        this.raidTimer = level != null ? level.random.nextInt(RAID_INTERVAL_TICKS / 2) : 0;
        setChanged();
    }

    /** Призвать жителя с нужной профессией (для создания королевств). */
    public void spawnStartingSettler(Profession profession) {
        spawnSettler(profession);
    }
    public void addGold(int amount) { gold += amount; setChanged(); }

    /** Радиус территории королевства: растёт с числом домов. */
    public int territoryRadius() {
        return 20 + housesBuilt * 5;
    }

    /** Нанять жителя за золото. */
    public boolean hire(Profession profession, int cost) {
        if (gold < cost || !(level instanceof ServerLevel)) {
            return false;
        }
        SettlerEntity settler = spawnSettler(profession);
        if (settler == null) {
            return false;
        }
        gold -= cost;
        setChanged();
        return true;
    }

    @Nullable
    private SettlerEntity spawnSettler(Profession profession) {
        BlockPos pos = getBlockPos();
        SettlerEntity settler = Civilizations.SETTLER.get().create(level);
        if (settler == null) {
            return null;
        }
        double angle = level.random.nextDouble() * Math.PI * 2;
        settler.moveTo(pos.getX() + 0.5 + Math.cos(angle) * 2, pos.getY(), pos.getZ() + 0.5 + Math.sin(angle) * 2,
                level.random.nextFloat() * 360f, 0f);
        settler.setTownHall(pos);
        settler.setKingdom(kingdom);
        settler.setTier(tier);
        settler.setProfession(profession);
        if (profession == Profession.GUARD && wallBuilt) {
            settler.setGuardPost(KingdomLayout.gatePos(pos));
        }
        settler.setPersistenceRequired();
        level.addFreshEntity(settler);
        return settler;
    }

    @Override
    public void onLoad() {
        super.onLoad();
        if (level instanceof ServerLevel serverLevel) {
            KingdomSavedData.get(serverLevel).add(getBlockPos());
        }
    }

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
        player.displayClientMessage(Component.translatable("civilizations.townhall.resources", wood, stone, food, iron), false);
        player.displayClientMessage(Component.translatable("civilizations.townhall.gold", gold, territoryRadius()).withStyle(ChatFormatting.YELLOW), false);
        player.displayClientMessage(Component.translatable("civilizations.townhall.tier", tier,
                warehouseBuilt ? "✔" : "✘", wallBuilt ? "✔" : "✘", orders.size()).withStyle(ChatFormatting.AQUA), false);
    }

    // --- Рост королевства ---

    public static void serverTick(Level level, BlockPos pos, BlockState state, TownHallBlockEntity th) {
        if (!(level instanceof ServerLevel serverLevel)) {
            return;
        }
        if (++th.taxTimer >= TAX_INTERVAL_TICKS) {
            th.taxTimer = 0;
            th.collectTaxes(serverLevel);
        }
        if (th.npc) {
            th.npcTick(serverLevel);
        }
        if (++th.tierTimer >= 600) {
            th.tierTimer = 0;
            th.updateTier(serverLevel);
        }
        if (++th.tricklesTimer >= 200) {
            th.tricklesTimer = 0;
            th.trickle(serverLevel);
        }
        long day = level.getDayTime() / 24000L;
        if (th.lastDay < 0) {
            th.lastDay = day;
        } else if (day != th.lastDay) {
            th.lastDay = day;
            th.dailyImmigrants(serverLevel);
        }
        if (++th.banditTimer >= BANDIT_INTERVAL_TICKS) {
            th.banditTimer = level.random.nextInt(BANDIT_INTERVAL_TICKS / 3);
            if (level.random.nextFloat() < 0.5f) {
                th.banditRaid(serverLevel);
            }
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

        th.food -= FOOD_PER_SETTLER;
        th.setChanged();

        // Новые жители — только рабочие; воинов и стражников нанимает игрок.
        Profession[] workers = {Profession.BUILDER, Profession.LUMBERJACK, Profession.FARMER};
        th.spawnSettler(workers[level.random.nextInt(workers.length)]);
    }

    /** Мозг компьютерного королевства: нанимает жителей и устраивает набеги. */
    private void npcTick(ServerLevel serverLevel) {
        if (++npcTimer >= NPC_HIRE_INTERVAL_TICKS) {
            npcTimer = 0;
            List<SettlerEntity> settlers = settlers(serverLevel);
            int warriors = 0, guards = 0, builders = 0, miners = 0, lumberjacks = 0, farmers = 0, archers = 0;
            for (SettlerEntity s : settlers) {
                switch (s.getProfession()) {
                    case WARRIOR -> warriors++;
                    case GUARD -> guards++;
                    case BUILDER -> builders++;
                    case MINER -> miners++;
                    case LUMBERJACK -> lumberjacks++;
                    case FARMER -> farmers++;
                    case ARCHER -> archers++;
                }
            }
            if (gold >= 50) {
                Profession want = guards < 2 ? Profession.GUARD
                        : warriors < 2 ? Profession.WARRIOR
                        : builders < 2 ? Profession.BUILDER
                        : lumberjacks < 1 ? Profession.LUMBERJACK
                        : farmers < 1 ? Profession.FARMER
                        : miners < 1 ? Profession.MINER
                        : archers < 1 && wallBuilt ? Profession.ARCHER
                        : settlers.size() < 6 + housesBuilt * 3 ? Profession.byId(level.random.nextInt(Profession.values().length)) : null;
                if (want != null) {
                    hire(want, 50);
                }
            }
        }

        if (raidActiveTicks > 0) {
            if (--raidActiveTicks == 0) {
                endRaid(serverLevel);
            }
            return;
        }
        if (++raidTimer >= RAID_INTERVAL_TICKS) {
            raidTimer = 0;
            // Когда ресурсов мало, королевство идёт грабить соседей гораздо охотнее.
            boolean scarce = wood < 40 || stone < 40 || food < 10;
            if (level.random.nextFloat() < (scarce ? 0.9f : 0.4f)) {
                startRaid(serverLevel);
            }
        }
    }

    private void startRaid(ServerLevel serverLevel) {
        BlockPos me = getBlockPos();
        BlockPos target = null;
        double best = (double) RAID_RANGE * RAID_RANGE;
        for (BlockPos other : KingdomSavedData.get(serverLevel).halls(serverLevel)) {
            if (other.equals(me)) continue;
            double d = other.distSqr(me);
            if (d < best) {
                best = d;
                target = other;
            }
        }
        if (target == null) return;

        List<SettlerEntity> warriors = new java.util.ArrayList<>();
        for (SettlerEntity s : settlers(serverLevel)) {
            if (s.getProfession() == Profession.WARRIOR || s.getProfession() == Profession.ARCHER) warriors.add(s);
        }
        if (warriors.size() < 2) return;

        int sent = 0;
        for (SettlerEntity w : warriors) {
            if (sent >= 4) break;
            w.setFollowPlayer(null);
            w.setOrderPos(target);
            sent++;
        }
        raidTarget = target;
        raidActiveTicks = RAID_DURATION_TICKS;
        TownHallBlockEntity victim = TownHallBlockEntity.at(level, target);
        String victimName = victim != null ? victim.getKingdom() : "?";
        serverLevel.getServer().getPlayerList().broadcastSystemMessage(
                Component.translatable("civilizations.raid.started", kingdom, victimName, sent).withStyle(ChatFormatting.RED), false);
        setChanged();
    }

    private void endRaid(ServerLevel serverLevel) {
        int survivors = 0;
        for (SettlerEntity s : settlers(serverLevel)) {
            if (raidTarget != null && raidTarget.equals(s.getOrderPos())) {
                s.setOrderPos(null);
                if (s.blockPosition().distSqr(raidTarget) < 20 * 20) {
                    survivors++;
                }
            }
        }
        // Выжившие у вражеской ратуши уносят добычу со склада.
        TownHallBlockEntity victim = raidTarget != null ? TownHallBlockEntity.at(level, raidTarget) : null;
        if (victim != null && survivors > 0 && victim.countDefenders(serverLevel) == 0) {
            int w = Math.min(victim.wood, 15 * survivors);
            int st = Math.min(victim.stone, 15 * survivors);
            int f = Math.min(victim.food, 5 * survivors);
            int g = Math.min(victim.gold, 10 * survivors);
            victim.wood -= w; victim.stone -= st; victim.food -= f; victim.gold -= g;
            victim.setChanged();
            wood += w; stone += st; food += f; gold += g;
            serverLevel.getServer().getPlayerList().broadcastSystemMessage(
                    Component.translatable("civilizations.raid.looted", kingdom, victim.kingdom, w, st, f, g).withStyle(ChatFormatting.RED), false);
        }
        raidTarget = null;
        setChanged();
    }

    /** Сколько воинов и стражников ещё защищают королевство. */
    public int countDefenders(ServerLevel serverLevel) {
        int n = 0;
        for (SettlerEntity s : settlers(serverLevel)) {
            if (s.isWarrior()) n++;
        }
        return n;
    }

    /** Захват: все жители переходят под новое имя, королевство больше не компьютерное. */
    public void capture(ServerLevel serverLevel, String newKingdom) {
        String old = kingdom;
        for (SettlerEntity s : settlers(serverLevel)) {
            s.setOrderPos(null);
            s.setKingdom(newKingdom);
        }
        kingdom = newKingdom;
        npc = false;
        raidActiveTicks = 0;
        raidTarget = null;
        setChanged();
        serverLevel.getServer().getPlayerList().broadcastSystemMessage(
                Component.translatable("civilizations.capture.done", newKingdom, old).withStyle(ChatFormatting.GOLD), false);
    }

    /** Каждый игровой день к королевству приходят новые поселенцы. */
    private void dailyImmigrants(ServerLevel serverLevel) {
        int count = settlers(serverLevel).size();
        int cap = 6 + housesBuilt * 3;
        int arriving = 3 + level.random.nextInt(3);
        Profession[] workers = {Profession.BUILDER, Profession.LUMBERJACK, Profession.FARMER, Profession.MINER};
        int spawned = 0;
        for (int i = 0; i < arriving && count + i < cap; i++) {
            spawnSettler(workers[level.random.nextInt(workers.length)]);
            spawned++;
        }
        if (spawned > 0) {
            for (ServerPlayer p : serverLevel.players()) {
                if (p.blockPosition().distSqr(getBlockPos()) < 96 * 96) {
                    p.displayClientMessage(Component.translatable("civilizations.immigrants", spawned, kingdom), true);
                }
            }
        }
    }

    /** Набег разбойников: несколько налётчиков появляются в 25 блоках от ратуши. */
    private void banditRaid(ServerLevel serverLevel) {
        int count = 3 + level.random.nextInt(3);
        double angle = level.random.nextDouble() * Math.PI * 2;
        BlockPos hall = getBlockPos();
        for (int i = 0; i < count; i++) {
            int x = hall.getX() + (int) (Math.cos(angle) * 25) + level.random.nextInt(5) - 2;
            int z = hall.getZ() + (int) (Math.sin(angle) * 25) + level.random.nextInt(5) - 2;
            int y = serverLevel.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
            BanditEntity bandit = Civilizations.BANDIT.get().create(serverLevel);
            if (bandit == null) continue;
            bandit.moveTo(x + 0.5, y, z + 0.5, level.random.nextFloat() * 360f, 0f);
            bandit.finalizeSpawn(serverLevel, serverLevel.getCurrentDifficultyAt(bandit.blockPosition()), MobSpawnType.EVENT, null);
            serverLevel.addFreshEntity(bandit);
        }
        serverLevel.getServer().getPlayerList().broadcastSystemMessage(
                Component.translatable("civilizations.bandits", count, kingdom).withStyle(ChatFormatting.DARK_RED), false);
    }

    /** Подстраховка: рабочие приносят немного ресурсов «между делом», чтобы стройка не вставала навсегда. */
    private void trickle(ServerLevel serverLevel) {
        int lumber = 0, miners = 0, farmers = 0;
        for (SettlerEntity s : settlers(serverLevel)) {
            switch (s.getProfession()) {
                case LUMBERJACK -> lumber++;
                case MINER -> miners++;
                case FARMER -> farmers++;
                default -> { }
            }
        }
        wood += lumber * 2;
        stone += miners * 2;
        food += farmers;
        setChanged();
    }

    /** Раз в минуту: налог с каждого жителя и продажа излишков со склада. */
    private void collectTaxes(ServerLevel serverLevel) {
        int population = settlers(serverLevel).size();
        gold += population;
        if (wood > SELL_THRESHOLD) {
            wood -= SELL_BATCH;
            gold += SELL_PRICE;
        }
        if (stone > SELL_THRESHOLD) {
            stone -= SELL_BATCH;
            gold += SELL_PRICE;
        }
        setChanged();
    }

    // --- Сохранение ---

    @Override
    protected void saveAdditional(CompoundTag tag, HolderLookup.Provider registries) {
        super.saveAdditional(tag, registries);
        tag.putString("Kingdom", kingdom);
        tag.putInt("Wood", wood);
        tag.putInt("Stone", stone);
        tag.putInt("Food", food);
        tag.putInt("Gold", gold);
        tag.putInt("Iron", iron);
        tag.putBoolean("WarehouseBuilt", warehouseBuilt);
        tag.putBoolean("WallBuilt", wallBuilt);
        tag.putInt("Tier", tier);
        net.minecraft.nbt.ListTag orderList = new net.minecraft.nbt.ListTag();
        for (Blueprint.Type t : orders) orderList.add(net.minecraft.nbt.StringTag.valueOf(t.name()));
        tag.put("Orders", orderList);
        tag.putBoolean("Npc", npc);
        tag.putLong("LastDay", lastDay);
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
        gold = tag.getInt("Gold");
        iron = tag.getInt("Iron");
        warehouseBuilt = tag.getBoolean("WarehouseBuilt");
        wallBuilt = tag.getBoolean("WallBuilt");
        tier = tag.contains("Tier") ? tag.getInt("Tier") : 1;
        orders.clear();
        for (net.minecraft.nbt.Tag t : tag.getList("Orders", net.minecraft.nbt.Tag.TAG_STRING)) {
            try { orders.add(Blueprint.Type.valueOf(t.getAsString())); } catch (IllegalArgumentException ignored) { }
        }
        npc = tag.getBoolean("Npc");
        lastDay = tag.contains("LastDay") ? tag.getLong("LastDay") : -1;
        housesBuilt = tag.getInt("HousesBuilt");
        nextHouse = tag.getInt("NextHouse");
    }
}

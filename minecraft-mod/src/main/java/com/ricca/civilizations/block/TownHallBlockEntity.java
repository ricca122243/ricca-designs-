package com.ricca.civilizations.block;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.entity.BanditEntity;
import com.ricca.civilizations.entity.Blueprint;
import com.ricca.civilizations.entity.KingdomLayout;
import com.ricca.civilizations.entity.Profession;
import com.ricca.civilizations.entity.SettlerEntity;
import com.ricca.civilizations.kingdom.KingdomSavedData;
import com.ricca.civilizations.kingdom.NpcKingdomSpawner;
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
    private boolean penBuilt = false;
    private boolean palisadeBuilt = false;
    private boolean leveled = false;
    private boolean keepBuilt = false;
    private boolean shipBuilt = false;
    private boolean shipSearched = false;
    @Nullable
    private BlockPos shipOrigin;
    private boolean shipEastWest = true;

    private int villageTimer = 0;
    private int villageActiveTicks = 0;
    @Nullable
    private BlockPos villageTarget;
    @Nullable
    private BlockPos nearestVillage;
    private boolean villageSearched = false;
    private static final int VILLAGE_INTERVAL_TICKS = 8000;
    private int helpTicks = 0;
    @Nullable
    private BlockPos helpTarget;
    private int splitTimer = 0;
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
    public boolean isPenBuilt() { return penBuilt; }
    public int getTier() { return tier; }

    /** Проект для строителя. */
    public record Project(Blueprint.Type type, int houseIndex, @Nullable BlockPos origin) {
        public Project(Blueprint.Type type, int houseIndex) { this(type, houseIndex, null); }
    }

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
        if (!leveled) {
            return new Project(Blueprint.Type.LEVELING, -1);
        }
        if (nextHouse < 2) {
            return claimHouseProject();
        }
        if (!warehouseBuilt) {
            return new Project(Blueprint.Type.WAREHOUSE, -1);
        }
        if (!penBuilt) {
            return new Project(Blueprint.Type.PEN, -1);
        }
        if (!palisadeBuilt && !wallBuilt) {
            return new Project(Blueprint.Type.PALISADE, -1);
        }
        if (!wallBuilt) {
            return new Project(Blueprint.Type.WALL, -1);
        }
        if (!keepBuilt) {
            return new Project(Blueprint.Type.KEEP, -1);
        }
        if (!shipBuilt) {
            if (!shipSearched && level instanceof ServerLevel serverLevel) {
                shipSearched = true;
                findShipSite(serverLevel);
                setChanged();
            }
            if (shipOrigin != null) {
                return new Project(shipEastWest ? Blueprint.Type.SHIP_EW : Blueprint.Type.SHIP_NS, -1, shipOrigin);
            }
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
            case PEN -> penBuilt = true;
            case PALISADE -> palisadeBuilt = true;
            case LEVELING -> leveled = true;
            case KEEP -> keepBuilt = true;
            case SHIP_EW, SHIP_NS -> {
                shipBuilt = true;
                if (level instanceof ServerLevel sl) {
                    sl.getServer().getPlayerList().broadcastSystemMessage(
                            Component.translatable("civilizations.ship", kingdom).withStyle(ChatFormatting.AQUA), false);
                }
            }
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

    /** Ищем воду у берега в радиусе 48 блоков: там встанет корабль. */
    private void findShipSite(ServerLevel serverLevel) {
        BlockPos hall = getBlockPos();
        for (int r = 16; r <= 48; r += 4) {
            for (int angle = 0; angle < 360; angle += 20) {
                int x = hall.getX() + (int) (Math.cos(Math.toRadians(angle)) * r);
                int z = hall.getZ() + (int) (Math.sin(Math.toRadians(angle)) * r);
                if (!serverLevel.isLoaded(new BlockPos(x, 64, z))) continue;
                int y = serverLevel.getHeight(Heightmap.Types.MOTION_BLOCKING, x, z);
                BlockPos surface = new BlockPos(x, y - 1, z);
                if (!serverLevel.getBlockState(surface).is(net.minecraft.world.level.block.Blocks.WATER)) continue;
                // Берег рядом? Ищем сушу на этой же высоте в 4 направлениях.
                for (net.minecraft.core.Direction dir : net.minecraft.core.Direction.Plane.HORIZONTAL) {
                    BlockPos land = surface.relative(dir, 2);
                    BlockState ls = serverLevel.getBlockState(land);
                    if (!ls.liquid() && !ls.isAir() && serverLevel.getBlockState(land.above()).isAir()) {
                        // Корабль уходит от берега в противоположную сторону
                        net.minecraft.core.Direction away = dir.getOpposite();
                        boolean ew = away.getAxis() == net.minecraft.core.Direction.Axis.X;
                        BlockPos start = surface.relative(away, 1).above(); // палуба на уровне поверхности воды
                        BlockPos origin = ew
                                ? (away == net.minecraft.core.Direction.EAST ? start.offset(0, 0, -2) : start.offset(-6, 0, -2))
                                : (away == net.minecraft.core.Direction.SOUTH ? start.offset(-2, 0, 0) : start.offset(-2, 0, -6));
                        shipOrigin = origin;
                        shipEastWest = ew;
                        return;
                    }
                }
            }
        }
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
        if (keepBuilt && iron >= 20) t++;
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

    /**
     * Мгновенно возвести постройку по чертежу (стартовое поселение НПС).
     * Ресурсы не тратятся, звуков нет.
     */
    public void instantBuild(Blueprint.Type type, int houseIndex) {
        if (level == null) return;
        Blueprint bp = Blueprint.of(type);
        BlockPos origin = Blueprint.origin(type, getBlockPos(), houseIndex);
        for (Blueprint.Step step : bp.steps) {
            BlockPos pos = origin.offset(step.x(), step.y(), step.z());
            BlockState current = level.getBlockState(pos);
            if (current.is(net.minecraft.world.level.block.Blocks.BEDROCK) || pos.equals(getBlockPos())) continue;
            if (step.fillOnly()) {
                if (current.canBeReplaced() && !current.liquid()) level.setBlock(pos, step.state(), 2);
            } else if (step.isAir()) {
                if (!current.isAir() && !current.canBeReplaced() && !current.liquid()) level.setBlock(pos, step.state(), 2);
            } else {
                level.setBlock(pos, step.state(), step.quiet() ? 18 : 2);
            }
        }
        projectFinished(type, houseIndex);
    }

    /** Стартовое поселение НПС: ровная земля, два дома, склад, загон, частокол. */
    public void buildStarterSettlement() {
        instantBuild(Blueprint.Type.LEVELING, -1);
        for (int i = 0; i < 2; i++) {
            int idx = claimHouse();
            if (idx >= 0) instantBuild(Blueprint.Type.HOUSE, idx);
        }
        instantBuild(Blueprint.Type.WAREHOUSE, -1);
        instantBuild(Blueprint.Type.PEN, -1);
        instantBuild(Blueprint.Type.PALISADE, -1);
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
        if (level instanceof ServerLevel sl && !kingdom.equals(player.getName().getString())) {
            int rel = KingdomSavedData.get(sl).relation(kingdom, player.getName().getString());
            String status = rel >= KingdomSavedData.ALLY_THRESHOLD ? "ally" : rel <= KingdomSavedData.WAR_THRESHOLD ? "war" : rel < 0 ? "cold" : "neutral";
            player.displayClientMessage(Component.translatable("civilizations.relation." + status, kingdom, rel).withStyle(ChatFormatting.LIGHT_PURPLE), false);
        }
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
        if (level instanceof ServerLevel sl2) {
            player.displayClientMessage(Component.translatable("civilizations.townhall.villages", KingdomSavedData.get(sl2).villagesOwnedBy(kingdom)).withStyle(ChatFormatting.YELLOW), false);
        }
        player.displayClientMessage(Component.translatable("civilizations.townhall.tier", tier,
                warehouseBuilt ? "✔" : "✘", wallBuilt ? "✔" : "✘", orders.size()).withStyle(ChatFormatting.AQUA), false);
        player.displayClientMessage(Component.translatable("civilizations.townhall.buildings",
                leveled ? "✔" : "✘", penBuilt ? "✔" : "✘", keepBuilt ? "✔" : "✘", shipBuilt ? "✔" : shipSearched && shipOrigin == null ? "—" : "✘", palisadeBuilt ? "✔" : "✘").withStyle(ChatFormatting.AQUA), false);
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
        if (th.helpTicks > 0 && --th.helpTicks == 0) {
            for (SettlerEntity s : th.settlers(serverLevel)) {
                if (th.helpTarget != null && th.helpTarget.equals(s.getOrderPos())) {
                    s.setOrderPos(null);
                }
            }
            th.helpTarget = null;
        }
        if (++th.splitTimer >= 1200) {
            th.splitTimer = 0;
            th.maybeSplit(serverLevel);
            th.driftRelations(serverLevel);
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
                    default -> { }
                }
            }
            int shepherds = 0;
            for (SettlerEntity s : settlers) if (s.getProfession() == Profession.SHEPHERD) shepherds++;
            if (gold >= 50) {
                Profession want = guards < 2 ? Profession.GUARD
                        : warriors < 2 ? Profession.WARRIOR
                        : builders < 2 ? Profession.BUILDER
                        : warriors < 4 ? Profession.WARRIOR
                        : archers < 2 && wallBuilt ? Profession.ARCHER
                        : lumberjacks < 1 ? Profession.LUMBERJACK
                        : farmers < 1 ? Profession.FARMER
                        : miners < 1 ? Profession.MINER
                        : shepherds < 1 && penBuilt ? Profession.SHEPHERD
                        : archers < 1 && wallBuilt ? Profession.ARCHER
                        : settlers.size() < 6 + housesBuilt * 3 ? Profession.byId(level.random.nextInt(Profession.values().length)) : null;
                if (want != null) {
                    hire(want, 50);
                }
            }
        }

        if (villageActiveTicks > 0 && --villageActiveTicks == 0) {
            endVillageExpedition(serverLevel);
        }
        if (++villageTimer >= VILLAGE_INTERVAL_TICKS) {
            villageTimer = level.random.nextInt(VILLAGE_INTERVAL_TICKS / 4);
            startVillageExpedition(serverLevel);
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
        KingdomSavedData data = KingdomSavedData.get(serverLevel);
        for (BlockPos other : data.halls(serverLevel)) {
            if (other.equals(me)) continue;
            TownHallBlockEntity otherHall = TownHallBlockEntity.at(level, other);
            if (otherHall == null || data.relation(kingdom, otherHall.kingdom) >= 0) continue; // друзей не грабим
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
        if (warriors.size() < 6) return; // в набег идут не меньше шести

        int sent = 0;
        for (SettlerEntity w : warriors) {
            if (sent >= 8) break;
            w.setFollowPlayer(null);
            w.setOrderPos(target);
            sent++;
        }
        raidTarget = target;
        raidActiveTicks = RAID_DURATION_TICKS;
        TownHallBlockEntity victim = TownHallBlockEntity.at(level, target);
        String victimName = victim != null ? victim.getKingdom() : "?";
        data.adjustRelation(kingdom, victimName, -20);
        serverLevel.getServer().getPlayerList().broadcastSystemMessage(
                Component.translatable("civilizations.raid.started", kingdom, victimName, sent).withStyle(ChatFormatting.RED), false);
        setChanged();

        // Союзники жертвы присылают подмогу.
        for (BlockPos other : data.halls(serverLevel)) {
            if (other.equals(me) || other.equals(target)) continue;
            TownHallBlockEntity ally = TownHallBlockEntity.at(level, other);
            if (ally == null || !data.allied(ally.kingdom, victimName) || other.distSqr(target) > (double) RAID_RANGE * RAID_RANGE) continue;
            ally.sendHelp(serverLevel, target, victimName);
        }
    }

    /** Поход на ближайшую деревню: подчинить её и брать дань, или отбить у другого королевства. */
    private void startVillageExpedition(ServerLevel serverLevel) {
        if (villageActiveTicks > 0) return;
        if (!villageSearched) {
            villageSearched = true;
            nearestVillage = serverLevel.findNearestMapStructure(net.minecraft.tags.StructureTags.VILLAGE, getBlockPos(), 12, false);
            setChanged();
        }
        if (nearestVillage == null) return;
        KingdomSavedData data = KingdomSavedData.get(serverLevel);
        String owner = data.villageOwner(nearestVillage);
        if (kingdom.equals(owner)) return;

        List<SettlerEntity> soldiers = new java.util.ArrayList<>();
        for (SettlerEntity s : settlers(serverLevel)) {
            if ((s.getProfession() == Profession.WARRIOR || s.getProfession() == Profession.ARCHER) && s.getOrderPos() == null) soldiers.add(s);
        }
        if (soldiers.size() < 4) return;
        int sent = 0;
        for (SettlerEntity s : soldiers) {
            if (sent >= 4) break;
            s.setFollowPlayer(null);
            s.setOrderPos(nearestVillage);
            sent++;
        }
        villageTarget = nearestVillage;
        villageActiveTicks = RAID_DURATION_TICKS;
        setChanged();
        serverLevel.getServer().getPlayerList().broadcastSystemMessage(
                Component.translatable(owner == null ? "civilizations.village.march" : "civilizations.village.contest", kingdom, owner == null ? "" : owner)
                        .withStyle(ChatFormatting.YELLOW), false);
        // Хозяин деревни посылает защиту.
        if (owner != null) {
            for (BlockPos other : data.halls(serverLevel)) {
                TownHallBlockEntity h = TownHallBlockEntity.at(level, other);
                if (h != null && h.kingdom.equals(owner)) {
                    h.sendHelp(serverLevel, nearestVillage, owner);
                    data.adjustRelation(kingdom, owner, -15);
                }
            }
        }
    }

    private void endVillageExpedition(ServerLevel serverLevel) {
        int survivors = 0;
        for (SettlerEntity s : settlers(serverLevel)) {
            if (villageTarget != null && villageTarget.equals(s.getOrderPos())) {
                s.setOrderPos(null);
                if (s.blockPosition().distSqr(villageTarget) < 40 * 40) survivors++;
            }
        }
        if (villageTarget != null && survivors >= 2) {
            KingdomSavedData data = KingdomSavedData.get(serverLevel);
            String old = data.villageOwner(villageTarget);
            data.setVillageOwner(villageTarget, kingdom);
            serverLevel.getServer().getPlayerList().broadcastSystemMessage(
                    Component.translatable(old == null ? "civilizations.village.taken" : "civilizations.village.retaken", kingdom, old == null ? "" : old,
                            villageTarget.getX(), villageTarget.getZ()).withStyle(ChatFormatting.YELLOW), false);
        }
        villageTarget = null;
        setChanged();
    }

    /** Отправить двух воинов на защиту союзника. */
    public void sendHelp(ServerLevel serverLevel, BlockPos target, String allyName) {
        int sent = 0;
        for (SettlerEntity s : settlers(serverLevel)) {
            if (sent >= 2) break;
            if ((s.getProfession() == Profession.WARRIOR || s.getProfession() == Profession.ARCHER) && s.getOrderPos() == null) {
                s.setOrderPos(target);
                sent++;
            }
        }
        if (sent > 0) {
            helpTarget = target;
            helpTicks = RAID_DURATION_TICKS;
            serverLevel.getServer().getPlayerList().broadcastSystemMessage(
                    Component.translatable("civilizations.help", kingdom, allyName, sent).withStyle(ChatFormatting.GREEN), false);
        }
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
        Profession[] workers = {Profession.BUILDER, Profession.LUMBERJACK, Profession.FARMER, Profession.MINER, Profession.SHEPHERD};
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

    /** Голод при большом населении: часть жителей уходит и основывает своё королевство. */
    private void maybeSplit(ServerLevel serverLevel) {
        List<SettlerEntity> settlers = settlers(serverLevel);
        if (settlers.size() < 12 || food >= 5 || level.random.nextFloat() > 0.3f) {
            return;
        }
        List<SettlerEntity> movers = new java.util.ArrayList<>();
        for (SettlerEntity s : settlers) {
            if (movers.size() >= 4) break;
            if (s.getControllingPassenger() == null && s.getFollowPlayer() == null) {
                movers.add(s);
            }
        }
        if (movers.size() < 4) {
            return;
        }
        String name = "New " + kingdom;
        NpcKingdomSpawner.scheduleSplit(serverLevel, getBlockPos(), kingdom, name, movers);
    }

    /** Отношения медленно меняются сами: соседи то сближаются, то ссорятся. */
    private void driftRelations(ServerLevel serverLevel) {
        KingdomSavedData data = KingdomSavedData.get(serverLevel);
        for (BlockPos other : data.halls(serverLevel)) {
            if (other.equals(getBlockPos())) continue;
            TownHallBlockEntity hall = TownHallBlockEntity.at(level, other);
            if (hall == null || hall.kingdom.isEmpty()) continue;
            if (level.random.nextInt(4) == 0) {
                data.adjustRelation(kingdom, hall.kingdom, level.random.nextInt(11) - 4); // чуть чаще к миру
            }
            // Союзники делятся излишками.
            if (data.allied(kingdom, hall.kingdom)) {
                boolean traded = false;
                if (wood > 150 && hall.wood < 60) { wood -= 30; hall.wood += 30; traded = true; }
                if (stone > 150 && hall.stone < 60) { stone -= 30; hall.stone += 30; traded = true; }
                if (food > 60 && hall.food < 15) { food -= 15; hall.food += 15; traded = true; }
                if (traded) {
                    hall.setChanged();
                    setChanged();
                    serverLevel.getServer().getPlayerList().broadcastSystemMessage(
                            Component.translatable("civilizations.trade", kingdom, hall.kingdom).withStyle(ChatFormatting.GREEN), false);
                }
            }
        }
    }

    /** Подарок от игрока: улучшает отношения. */
    public int receiveGift(ServerLevel serverLevel, String from, int value) {
        gold += value;
        setChanged();
        return KingdomSavedData.get(serverLevel).adjustRelation(kingdom, from, value * 3);
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
        int villages = KingdomSavedData.get(serverLevel).villagesOwnedBy(kingdom);
        gold += villages * 5;
        food += villages * 3;
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
        tag.putBoolean("PenBuilt", penBuilt);
        tag.putBoolean("PalisadeBuilt", palisadeBuilt);
        tag.putBoolean("Leveled", leveled);
        tag.putBoolean("KeepBuilt", keepBuilt);
        tag.putBoolean("ShipBuilt", shipBuilt);
        tag.putBoolean("ShipSearched", shipSearched);
        tag.putBoolean("ShipEW", shipEastWest);
        tag.putBoolean("VillageSearched", villageSearched);
        if (nearestVillage != null) tag.putLong("NearestVillage", nearestVillage.asLong());
        if (shipOrigin != null) tag.putLong("ShipOrigin", shipOrigin.asLong());
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
        penBuilt = tag.getBoolean("PenBuilt");
        palisadeBuilt = tag.getBoolean("PalisadeBuilt");
        leveled = tag.getBoolean("Leveled");
        keepBuilt = tag.getBoolean("KeepBuilt");
        shipBuilt = tag.getBoolean("ShipBuilt");
        shipSearched = tag.getBoolean("ShipSearched");
        shipEastWest = !tag.contains("ShipEW") || tag.getBoolean("ShipEW");
        villageSearched = tag.getBoolean("VillageSearched");
        nearestVillage = tag.contains("NearestVillage") ? BlockPos.of(tag.getLong("NearestVillage")) : null;
        shipOrigin = tag.contains("ShipOrigin") ? BlockPos.of(tag.getLong("ShipOrigin")) : null;
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

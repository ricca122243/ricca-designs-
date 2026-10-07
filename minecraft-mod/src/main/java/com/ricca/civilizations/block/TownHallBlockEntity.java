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
    private boolean towerBuilt = false;
    /** Вооружение от кузнеца: +1 урон бойцам за каждые 4 единицы. */
    private int arms = 0;
    /** Налог: 0 низкий, 1 обычный, 2 высокий. */
    private int taxRate = 1;
    private int caravanTimer = 0;
    private int architects = 0;
    private int warehouseTimer = 0;
    private int maintenanceTimer = 0;
    private final java.util.Set<Integer> repairedHouses = new java.util.HashSet<>();
    @Nullable
    private BlockPos quarryOrigin;
    /** Заказы с выбранным местом (чертёж). */
    private final List<Project> placedOrders = new java.util.ArrayList<>();
    private static final int CARAVAN_INTERVAL_TICKS = 18000;
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
    public boolean isTowerBuilt() { return towerBuilt; }
    public int getArms() { return arms; }
    public int getArchitects() { return architects; }
    @Nullable
    public BlockPos getQuarryOrigin() { return quarryOrigin; }
    public void setQuarryOrigin(@Nullable BlockPos pos) { quarryOrigin = pos; setChanged(); }

    /** Заказ с точным местом от чертежа. */
    public Blueprint orderAt(Blueprint.Type type, BlockPos origin) {
        placedOrders.add(new Project(type, type == Blueprint.Type.HOUSE ? 100 + placedOrders.size() : -1, origin));
        setChanged();
        return Blueprint.of(type);
    }
    public int getTaxRate() { return taxRate; }
    public void setTaxRate(int rate) { taxRate = Math.max(0, Math.min(2, rate)); setChanged(); }

    /** Кузнец: 5 железа → +1 вооружение (до 20). */
    public boolean forgeArms() {
        if (iron < 5 || arms >= 20) return false;
        iron -= 5;
        arms++;
        setChanged();
        return true;
    }

    /** Переименовать королевство вместе с жителями. */
    public void rename(ServerLevel serverLevel, String newName) {
        for (SettlerEntity s : settlers(serverLevel)) {
            s.setKingdom(newName);
        }
        kingdom = newName;
        setChanged();
    }

    /** Название по уровню: поселение, город, крепость, королевство. */
    public String titleKey() {
        return "civilizations.title." + Math.max(1, Math.min(4, tier));
    }
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
        if (!placedOrders.isEmpty()) {
            Project p = placedOrders.remove(0);
            setChanged();
            return p;
        }
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
        if (!towerBuilt) {
            return new Project(Blueprint.Type.TOWER, -1);
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
            case HOUSE -> { if (!repairedHouses.remove(houseIndex)) housesBuilt++; }
            case WAREHOUSE -> warehouseBuilt = true;
            case PEN -> penBuilt = true;
            case PALISADE -> palisadeBuilt = true;
            case TOWER -> {
                towerBuilt = true;
                if (level instanceof ServerLevel serverLevel) {
                    for (SettlerEntity s : settlers(serverLevel)) {
                        if (s.getProfession() == Profession.ARCHER) {
                            s.setGuardPost(KingdomLayout.towerTop(getBlockPos()));
                        }
                    }
                }
            }
            case LEVELING -> leveled = true;
            case KEEP -> {
                keepBuilt = true;
                if (level != null) {
                    com.ricca.civilizations.item.KingdomCharterItem.placeBanner(level, KingdomLayout.keepOrigin(getBlockPos()).offset(4, 7, 4), kingdom);
                }
            }
            case SHIP_EW, SHIP_NS -> {
                shipBuilt = true;
                if (level instanceof ServerLevel sl) {
                    sl.getServer().getPlayerList().broadcastSystemMessage(
                            Component.translatable("civilizations.ship", kingdom).withStyle(ChatFormatting.AQUA), false);
                }
            }
            case WALL -> {
                wallBuilt = true;
                if (level != null) {
                    BlockPos gate = KingdomLayout.gatePos(getBlockPos());
                    com.ricca.civilizations.item.KingdomCharterItem.placeBanner(level, gate.offset(-2, 2, -1), kingdom);
                    com.ricca.civilizations.item.KingdomCharterItem.placeBanner(level, gate.offset(2, 2, -1), kingdom);
                }
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

    private boolean repairing(Blueprint.Type type) {
        return switch (type) {
            case WAREHOUSE -> warehouseBuilt;
            case PEN -> penBuilt;
            case TOWER -> towerBuilt;
            case KEEP -> keepBuilt;
            case WALL -> wallBuilt;
            default -> false;
        };
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
        if (profession == Profession.ARCHER && towerBuilt) {
            settler.setGuardPost(KingdomLayout.towerTop(pos));
        }
        settler.setPersistenceRequired();
        level.addFreshEntity(settler);
        if (profession == Profession.KNIGHT) {
            settler.mountHorse();
        }
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
        player.displayClientMessage(Component.translatable("civilizations.townhall.rank", Component.translatable(titleKey()), arms,
                Component.translatable("civilizations.tax." + taxRate)).withStyle(ChatFormatting.GOLD), false);
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
            th.architects = 0;
            for (SettlerEntity s : th.settlers(serverLevel)) {
                if (s.getProfession() == Profession.ARCHITECT) th.architects++;
                if (s.isWarrior()) {
                    net.minecraft.world.entity.ai.attributes.AttributeInstance a = s.getAttribute(net.minecraft.world.entity.ai.attributes.Attributes.ATTACK_DAMAGE);
                    if (a != null) a.setBaseValue(s.professionDamage() + th.arms / 4.0);
                }
            }
        }
        if (++th.warehouseTimer >= 600) {
            th.warehouseTimer = 0;
            th.syncWarehouse();
        }
        if (++th.maintenanceTimer >= 6000) {
            th.maintenanceTimer = 0;
            th.inspectBuildings();
        }
        if (!th.npc && ++th.caravanTimer >= CARAVAN_INTERVAL_TICKS) {
            th.caravanTimer = 0;
            th.spawnCaravan(serverLevel);
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

    private static int countOf(List<SettlerEntity> list, Profession p) {
        int n = 0;
        for (SettlerEntity s : list) if (s.getProfession() == p) n++;
        return n;
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
                        : builders < 3 ? Profession.BUILDER
                        : warriors < 4 ? Profession.WARRIOR
                        : archers < 2 && wallBuilt ? Profession.ARCHER
                        : tier >= 2 && countOf(settlers, Profession.PIKEMAN) < 2 ? Profession.PIKEMAN
                        : tier >= 2 && countOf(settlers, Profession.CROSSBOWMAN) < 2 ? Profession.CROSSBOWMAN
                        : tier >= 3 && countOf(settlers, Profession.KNIGHT) < 2 ? Profession.KNIGHT
                        : lumberjacks < 1 ? Profession.LUMBERJACK
                        : farmers < 1 ? Profession.FARMER
                        : miners < 1 ? Profession.MINER
                        : shepherds < 1 && penBuilt ? Profession.SHEPHERD
                        : settlers.size() >= 12 && countOf(settlers, Profession.HEALER) < 1 ? Profession.HEALER
                        : settlers.size() >= 14 && warehouseBuilt && countOf(settlers, Profession.BLACKSMITH) < 1 ? Profession.BLACKSMITH
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
            if (s.isSoldier()) warriors.add(s);
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
            if (s.isSoldier() && s.getOrderPos() == null) soldiers.add(s);
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
            if (s.isSoldier() && s.getOrderPos() == null) {
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
        if (victim != null && survivors >= 3 && victim.countDefenders(serverLevel) == 0 && !victim.kingdom.equals(kingdom)) {
            // Полный разгром: королевство покорено, жители становятся рабами.
            victim.capture(serverLevel, kingdom);
            victim.npc = npc;
            raidTarget = null;
            setChanged();
            return;
        }
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
            // Побеждённые становятся рабами; свои, вернувшиеся домой, — свободны.
            s.setSlave(!s.getHomeKingdom().equals(newKingdom));
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
        int arriving = 3 + level.random.nextInt(3) + (taxRate == 0 ? 1 : taxRate == 2 ? -2 : 0);
        Profession[] workers = {Profession.BUILDER, Profession.LUMBERJACK, Profession.FARMER, Profession.MINER, Profession.SHEPHERD};
        int builders = 0;
        for (SettlerEntity s : settlers(serverLevel)) if (s.getProfession() == Profession.BUILDER) builders++;
        int spawned = 0;
        for (int i = 0; i < arriving && count + i < cap; i++) {
            Profession p = builders < 3 ? Profession.BUILDER : workers[level.random.nextInt(workers.length)];
            if (p == Profession.BUILDER) builders++;
            spawnSettler(p);
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
        float splitChance = taxRate == 2 ? 0.6f : 0.3f;
        if (settlers.size() < 12 || (food >= 5 && taxRate != 2) || level.random.nextFloat() > splitChance) {
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

    /**
     * Склад по-настоящему: сундуки склада принимают предметы (игрок кладёт — склад растёт),
     * а излишки сверх запаса выкладываются в сундуки как предметы. Табличка показывает запасы.
     */
    private void syncWarehouse() {
        if (!warehouseBuilt || level == null) return;
        BlockPos origin = KingdomLayout.warehouseOrigin(getBlockPos());
        BlockPos[] chests = {origin.offset(1, 1, 1), origin.offset(3, 1, 1), origin.offset(1, 1, 3), origin.offset(3, 1, 3)};
        for (BlockPos cp : chests) {
            if (!(level.getBlockEntity(cp) instanceof net.minecraft.world.level.block.entity.ChestBlockEntity chest)) continue;
            // Забираем всё полезное
            for (int i = 0; i < chest.getContainerSize(); i++) {
                net.minecraft.world.item.ItemStack st = chest.getItem(i);
                if (st.isEmpty()) continue;
                int n = st.getCount();
                if (st.is(net.minecraft.tags.ItemTags.LOGS)) { wood += n * 4; }
                else if (st.is(net.minecraft.tags.ItemTags.PLANKS)) { wood += n; }
                else if (st.is(net.minecraft.world.item.Items.COBBLESTONE) || st.is(net.minecraft.world.item.Items.STONE)) { stone += n; }
                else if (st.is(net.minecraft.world.item.Items.BREAD)) { food += n * 3; }
                else if (st.is(net.minecraft.world.item.Items.WHEAT) || st.is(net.minecraft.world.item.Items.CARROT) || st.is(net.minecraft.world.item.Items.POTATO)) { food += n; }
                else if (st.is(net.minecraft.world.item.Items.IRON_INGOT)) { iron += n; }
                else if (st.is(net.minecraft.world.item.Items.GOLD_INGOT)) { gold += n * 5; }
                else continue;
                chest.setItem(i, net.minecraft.world.item.ItemStack.EMPTY);
            }
        }
        // Излишки — в сундуки как предметы
        int[] caps = {300, 300, 100, 40, 300};
        if (wood > caps[0]) wood -= putItems(chests, net.minecraft.world.item.Items.OAK_LOG, (wood - caps[0]) / 4) * 4;
        if (stone > caps[1]) stone -= putItems(chests, net.minecraft.world.item.Items.COBBLESTONE, stone - caps[1]);
        if (food > caps[2]) food -= putItems(chests, net.minecraft.world.item.Items.BREAD, (food - caps[2]) / 3) * 3;
        if (iron > caps[3]) iron -= putItems(chests, net.minecraft.world.item.Items.IRON_INGOT, iron - caps[3]);
        if (gold > caps[4]) gold -= putItems(chests, net.minecraft.world.item.Items.GOLD_INGOT, (gold - caps[4]) / 5) * 5;
        setChanged();
        // Табличка
        BlockPos signPos = origin.offset(2, 3, KingdomLayout.HOUSE_SIZE);
        if (level.getBlockEntity(signPos) instanceof net.minecraft.world.level.block.entity.SignBlockEntity sign) {
            net.minecraft.world.level.block.entity.SignText text = new net.minecraft.world.level.block.entity.SignText()
                    .setMessage(0, Component.translatable("civilizations.sign.title"))
                    .setMessage(1, Component.literal("W " + wood + "  S " + stone))
                    .setMessage(2, Component.literal("F " + food + "  I " + iron))
                    .setMessage(3, Component.literal("G " + gold));
            sign.setText(text, true);
            sign.setChanged();
            level.sendBlockUpdated(signPos, level.getBlockState(signPos), level.getBlockState(signPos), 3);
        }
    }

    /** Положить предметы в сундуки склада; возвращает, сколько удалось положить. */
    private int putItems(BlockPos[] chests, net.minecraft.world.item.Item item, int count) {
        int placed = 0;
        for (BlockPos cp : chests) {
            if (count - placed <= 0) break;
            if (!(level.getBlockEntity(cp) instanceof net.minecraft.world.level.block.entity.ChestBlockEntity chest)) continue;
            for (int i = 0; i < chest.getContainerSize() && count - placed > 0; i++) {
                net.minecraft.world.item.ItemStack st = chest.getItem(i);
                if (st.isEmpty()) {
                    int n = Math.min(64, count - placed);
                    chest.setItem(i, new net.minecraft.world.item.ItemStack(item, n));
                    placed += n;
                } else if (st.is(item) && st.getCount() < 64) {
                    int n = Math.min(64 - st.getCount(), count - placed);
                    st.grow(n);
                    placed += n;
                }
            }
            chest.setChanged();
        }
        return placed;
    }

    /** Осмотр построек: если в готовом здании не хватает блоков, строители его чинят. */
    private void inspectBuildings() {
        if (level == null || placedOrders.size() > 2) return;
        List<Project> built = new java.util.ArrayList<>();
        for (int i = 0; i < Math.min(nextHouse, KingdomLayout.houseCount()); i++) built.add(new Project(Blueprint.Type.HOUSE, i, null));
        if (warehouseBuilt) built.add(new Project(Blueprint.Type.WAREHOUSE, -1, null));
        if (penBuilt) built.add(new Project(Blueprint.Type.PEN, -1, null));
        if (towerBuilt) built.add(new Project(Blueprint.Type.TOWER, -1, null));
        if (keepBuilt) built.add(new Project(Blueprint.Type.KEEP, -1, null));
        if (wallBuilt) built.add(new Project(Blueprint.Type.WALL, -1, null));
        if (built.isEmpty()) return;
        Project p = built.get(level.random.nextInt(built.size()));
        Blueprint bp = Blueprint.of(p.type());
        BlockPos origin = Blueprint.origin(p.type(), getBlockPos(), p.houseIndex());
        int missing = 0;
        for (Blueprint.Step step : bp.steps) {
            if (step.isAir() || step.fillOnly()) continue;
            if (!level.getBlockState(origin.offset(step.x(), step.y(), step.z())).is(step.state().getBlock())) missing++;
        }
        if (missing > 0) {
            placedOrders.add(new Project(p.type(), p.houseIndex(), origin));
            if (p.type() == Blueprint.Type.HOUSE) repairedHouses.add(p.houseIndex());
            setChanged();
        }
    }

    /** Торговый караван: странствующий торговец с ламами приходит к ратуше игрока. */
    private void spawnCaravan(ServerLevel serverLevel) {
        BlockPos pos = getBlockPos();
        net.minecraft.world.entity.npc.WanderingTrader trader = net.minecraft.world.entity.EntityType.WANDERING_TRADER.create(serverLevel);
        if (trader == null) return;
        trader.moveTo(pos.getX() + 3.5, pos.getY(), pos.getZ() + 3.5, 0f, 0f);
        trader.setDespawnDelay(24000);
        serverLevel.addFreshEntity(trader);
        for (int i = 0; i < 2; i++) {
            net.minecraft.world.entity.animal.horse.TraderLlama llama = net.minecraft.world.entity.EntityType.TRADER_LLAMA.create(serverLevel);
            if (llama == null) continue;
            llama.moveTo(pos.getX() + 4.5 + i, pos.getY(), pos.getZ() + 2.5, 0f, 0f);
            llama.setLeashedTo(trader, true);
            serverLevel.addFreshEntity(llama);
        }
        for (ServerPlayer p : serverLevel.players()) {
            if (p.blockPosition().distSqr(pos) < 128 * 128) {
                p.displayClientMessage(Component.translatable("civilizations.caravan", kingdom).withStyle(ChatFormatting.GOLD), false);
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
        int population = 0;
        int slaves = 0;
        for (SettlerEntity s : settlers(serverLevel)) {
            if (s.isSlave()) slaves++; else population++;
        }
        gold += taxRate == 0 ? population / 2 : taxRate == 2 ? population * 2 : population;
        wood += slaves * 2;
        stone += slaves * 2;
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
        tag.putBoolean("TowerBuilt", towerBuilt);
        tag.putInt("Arms", arms);
        tag.putInt("TaxRate", taxRate);
        if (quarryOrigin != null) tag.putLong("QuarryOrigin", quarryOrigin.asLong());
        net.minecraft.nbt.ListTag placed = new net.minecraft.nbt.ListTag();
        for (Project p : placedOrders) {
            CompoundTag t = new CompoundTag();
            t.putString("Type", p.type().name());
            t.putInt("House", p.houseIndex());
            if (p.origin() != null) t.putLong("Origin", p.origin().asLong());
            placed.add(t);
        }
        tag.put("PlacedOrders", placed);
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
        towerBuilt = tag.getBoolean("TowerBuilt");
        arms = tag.getInt("Arms");
        taxRate = tag.contains("TaxRate") ? tag.getInt("TaxRate") : 1;
        quarryOrigin = tag.contains("QuarryOrigin") ? BlockPos.of(tag.getLong("QuarryOrigin")) : null;
        placedOrders.clear();
        for (net.minecraft.nbt.Tag t : tag.getList("PlacedOrders", net.minecraft.nbt.Tag.TAG_COMPOUND)) {
            CompoundTag c = (CompoundTag) t;
            try {
                placedOrders.add(new Project(Blueprint.Type.valueOf(c.getString("Type")), c.getInt("House"),
                        c.contains("Origin") ? BlockPos.of(c.getLong("Origin")) : null));
            } catch (IllegalArgumentException ignored) { }
        }
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

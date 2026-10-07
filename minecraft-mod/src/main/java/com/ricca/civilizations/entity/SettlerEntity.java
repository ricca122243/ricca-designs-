package com.ricca.civilizations.entity;

import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.component.DyedItemColor;
import net.minecraft.core.component.DataComponents;
import net.minecraft.world.phys.Vec3;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.MoveTowardsRestrictionGoal;
import net.minecraft.world.entity.ai.goal.PanicGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

import javax.annotation.Nullable;
import java.util.UUID;

/**
 * Поселенец: житель королевства. Помнит свою ратушу, имеет профессию
 * и занимается своим делом: строит, рубит лес, пашет или охраняет.
 */
public class SettlerEntity extends PathfinderMob implements net.minecraft.world.entity.monster.RangedAttackMob {
    private static final EntityDataAccessor<String> KINGDOM =
            SynchedEntityData.defineId(SettlerEntity.class, EntityDataSerializers.STRING);
    private static final EntityDataAccessor<Integer> PROFESSION =
            SynchedEntityData.defineId(SettlerEntity.class, EntityDataSerializers.INT);
    /** Уровень снаряжения королевства: 1 камень, 2 железо, 3 железо+алмазный меч, 4 алмаз. */
    private static final EntityDataAccessor<Integer> TIER =
            SynchedEntityData.defineId(SettlerEntity.class, EntityDataSerializers.INT);

    private static final int HOME_RADIUS = 24;

    @Nullable
    private BlockPos townHall;
    /** Какой участок под дом занял этот строитель. −1 — никакой. */
    private int houseIndex = -1;
    /** Текущий проект строителя. */
    @Nullable
    private Blueprint.Type projectType;
    @Nullable
    private BlockPos projectOrigin;
    /** Сытость 0..20, как у игрока. */
    private int hunger = 20;
    /** Опыт строителя: сколько блоков поставил. Навык растёт с опытом. */
    private int buildXp = 0;
    private int hungerTimer = 0;
    private int healTimer = 0;
    private int stuckTimer = 0;
    private double lastX, lastZ;
    /** Приказ игрока: идти сюда и ждать. */
    @Nullable
    private BlockPos orderPos;
    /** Игрок, за которым житель следует. */
    @Nullable
    private UUID followPlayer;
    /** Пост стражника. */
    @Nullable
    private BlockPos guardPost;

    public SettlerEntity(EntityType<? extends PathfinderMob> type, Level level) {
        super(type, level);
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Mob.createMobAttributes()
                .add(Attributes.MAX_HEALTH, 20.0)
                .add(Attributes.MOVEMENT_SPEED, 0.5)
                .add(Attributes.FOLLOW_RANGE, 32.0)
                .add(Attributes.ATTACK_DAMAGE, 2.0)
                .add(Attributes.STEP_HEIGHT, 1.0);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(0, new FloatGoal(this));
        // Мирные жители убегают от опасности, воины — нет.
        // Мирные убегают от опасности; бойцы — только когда здоровья меньше трети (боевой дух).
        this.goalSelector.addGoal(1, new PanicGoal(this, 0.6) {
            @Override
            public boolean canUse() {
                return (!isWarrior() || getHealth() < getMaxHealth() * 0.3f) && super.canUse();
            }
        });
        this.goalSelector.addGoal(1, new MeleeAttackGoal(this, 1.0, true) {
            @Override
            public boolean canUse() {
                return !isArcher() && super.canUse();
            }
        });
        this.goalSelector.addGoal(1, new net.minecraft.world.entity.ai.goal.RangedAttackGoal(this, 1.0, 30, 14.0f) {
            @Override
            public boolean canUse() {
                return isArcher() && super.canUse();
            }
        });
        this.goalSelector.addGoal(2, new FollowPlayerGoal(this));
        this.goalSelector.addGoal(2, new OrderGoal(this));
        this.goalSelector.addGoal(3, new GuardPostGoal(this));
        this.goalSelector.addGoal(3, new BuildGoal(this));
        this.goalSelector.addGoal(3, new ChopTreesGoal(this));
        this.goalSelector.addGoal(3, new FarmGoal(this));
        this.goalSelector.addGoal(3, new MineGoal(this));
        this.goalSelector.addGoal(3, new ShepherdGoal(this));
        this.goalSelector.addGoal(2, new HealGoal(this));
        this.goalSelector.addGoal(3, new BlacksmithGoal(this));
        this.goalSelector.addGoal(4, new MoveTowardsRestrictionGoal(this, 0.5));
        this.goalSelector.addGoal(5, new WaterAvoidingRandomStrollGoal(this, 0.4));
        this.goalSelector.addGoal(6, new LookAtPlayerGoal(this, Player.class, 8.0f));
        this.goalSelector.addGoal(7, new RandomLookAroundGoal(this));

        // Цели для боя: только у воинов.
        this.targetSelector.addGoal(1, new HurtByTargetGoal(this) {
            @Override
            public boolean canUse() {
                return isWarrior() && super.canUse();
            }
        });
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Monster.class, 10, true, false,
                target -> isWarrior()));
        // В походе на деревню воины бьют железных големов.
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, net.minecraft.world.entity.animal.IronGolem.class, 10, true, false,
                target -> isWarrior() && getOrderPos() != null));
        // Воины бьют игроков, с чьим королевством идёт война.
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, Player.class, 20, true, false,
                target -> isWarrior() && target instanceof Player p && isHostileTo(p)));
        // Воины бьют жителей чужих королевств, которые подошли близко.
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, SettlerEntity.class, 10, true, false,
                target -> isWarrior() && target instanceof SettlerEntity other && isEnemy(other)));
    }

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(KINGDOM, "");
        builder.define(PROFESSION, Profession.BUILDER.ordinal());
        builder.define(TIER, 1);
    }

    // --- Королевство и профессия ---

    public String getKingdom() {
        return this.entityData.get(KINGDOM);
    }

    public void setKingdom(String kingdom) {
        this.entityData.set(KINGDOM, kingdom);
        updateDisplayName();
    }

    public Profession getProfession() {
        return Profession.byId(this.entityData.get(PROFESSION));
    }

    /** Воин, стражник или лучник: дерётся, а не убегает. */
    public boolean isWarrior() {
        Profession p = getProfession();
        return p == Profession.WARRIOR || p == Profession.GUARD || p == Profession.ARCHER;
    }

    public boolean isArcher() {
        return getProfession() == Profession.ARCHER;
    }

    public int getTier() {
        return this.entityData.get(TIER);
    }

    /** Сменить уровень снаряжения (вызывает ратуша, когда королевство растёт). */
    public void setTier(int tier) {
        if (tier != getTier()) {
            this.entityData.set(TIER, tier);
            equipForProfession(getProfession());
        }
    }

    @Nullable
    public Blueprint.Type getProjectType() {
        return projectType;
    }

    public void setProject(@Nullable Blueprint.Type type, int houseIndex) {
        this.projectType = type;
        this.houseIndex = houseIndex;
        if (type == null) {
            this.projectOrigin = null;
        }
    }

    @Nullable
    public BlockPos getProjectOrigin() { return projectOrigin; }
    public void setProjectOrigin(@Nullable BlockPos pos) { this.projectOrigin = pos; }

    /** Лучник стреляет из лука. */
    @Override
    public void performRangedAttack(LivingEntity target, float velocity) {
        net.minecraft.world.entity.projectile.Arrow arrow = new net.minecraft.world.entity.projectile.Arrow(level(), this, new ItemStack(Items.ARROW), getMainHandItem());
        arrow.pickup = net.minecraft.world.entity.projectile.AbstractArrow.Pickup.DISALLOWED;
        double dx = target.getX() - getX();
        double dy = target.getY(0.33) - arrow.getY();
        double dz = target.getZ() - getZ();
        double dist = Math.sqrt(dx * dx + dz * dz);
        arrow.shoot(dx, dy + dist * 0.2, dz, 1.6f, 6.0f);
        playSound(SoundEvents.SKELETON_SHOOT, 1.0f, 1.0f / (getRandom().nextFloat() * 0.4f + 0.8f));
        level().addFreshEntity(arrow);
    }

    /** Враг — житель королевства, с которым у нас плохие отношения (союзников не трогаем). */
    public boolean isEnemy(SettlerEntity other) {
        String mine = getKingdom();
        String theirs = other.getKingdom();
        if (mine.isEmpty() || theirs.isEmpty() || mine.equals(theirs)) {
            return false;
        }
        if (level() instanceof net.minecraft.server.level.ServerLevel serverLevel) {
            return com.ricca.civilizations.kingdom.KingdomSavedData.get(serverLevel).relation(mine, theirs) < 0;
        }
        return false;
    }

    public boolean isHostileTo(Player player) {
        String mine = getKingdom();
        if (mine.isEmpty() || player.isCreative() || player.isSpectator()) {
            return false;
        }
        if (level() instanceof net.minecraft.server.level.ServerLevel serverLevel) {
            return com.ricca.civilizations.kingdom.KingdomSavedData.get(serverLevel).atWar(mine, player.getName().getString());
        }
        return false;
    }

    @Override
    public void die(DamageSource source) {
        super.die(source);
        // Убийство жителя портит отношения с его королевством.
        if (level() instanceof net.minecraft.server.level.ServerLevel serverLevel && !getKingdom().isEmpty()) {
            String killer = null;
            if (source.getEntity() instanceof Player p) {
                killer = p.getName().getString();
            } else if (source.getEntity() instanceof SettlerEntity s) {
                killer = s.getKingdom();
            }
            if (killer != null && !killer.isEmpty()) {
                com.ricca.civilizations.kingdom.KingdomSavedData.get(serverLevel).adjustRelation(getKingdom(), killer, -10);
            }
        }
    }

    @Nullable
    public BlockPos getOrderPos() { return orderPos; }
    public void setOrderPos(@Nullable BlockPos pos) { this.orderPos = pos; }

    @Nullable
    public UUID getFollowPlayer() { return followPlayer; }
    public void setFollowPlayer(@Nullable UUID player) { this.followPlayer = player; }

    @Nullable
    public BlockPos getGuardPost() { return guardPost; }
    public void setGuardPost(@Nullable BlockPos pos) { this.guardPost = pos; }

    public void setProfession(Profession profession) {
        this.entityData.set(PROFESSION, profession.ordinal());
        applyProfessionStats(profession);
        updateDisplayName();
    }

    private void applyProfessionStats(Profession profession) {
        boolean warrior = profession == Profession.WARRIOR || profession == Profession.GUARD;
        if (profession == Profession.GUARD && guardPost == null && townHall != null) {
            guardPost = townHall;
        }
        setBase(Attributes.MAX_HEALTH, warrior ? 30.0 : 20.0);
        setHealth(getMaxHealth());
        equipForProfession(profession);
    }

    /** Инструменты и одежда по профессии и уровню королевства. Урон и броня берутся из предметов. */
    private void equipForProfession(Profession profession) {
        for (EquipmentSlot slot : EquipmentSlot.values()) {
            setItemSlot(slot, ItemStack.EMPTY);
            setDropChance(slot, 0.0f);
        }
        int tier = getTier();
        net.minecraft.world.item.Item sword = tier <= 1 ? Items.STONE_SWORD : tier == 2 ? Items.IRON_SWORD : Items.DIAMOND_SWORD;
        net.minecraft.world.item.Item chest = tier <= 1 ? Items.LEATHER_CHESTPLATE : tier <= 3 ? Items.IRON_CHESTPLATE : Items.DIAMOND_CHESTPLATE;
        net.minecraft.world.item.Item helmet = tier <= 1 ? Items.LEATHER_HELMET : tier <= 3 ? Items.IRON_HELMET : Items.DIAMOND_HELMET;
        net.minecraft.world.item.Item legs = tier <= 1 ? Items.LEATHER_LEGGINGS : tier <= 3 ? Items.IRON_LEGGINGS : Items.DIAMOND_LEGGINGS;
        net.minecraft.world.item.Item pick = tier <= 1 ? Items.WOODEN_PICKAXE : tier == 2 ? Items.STONE_PICKAXE : Items.IRON_PICKAXE;
        net.minecraft.world.item.Item axe = tier <= 1 ? Items.WOODEN_AXE : tier == 2 ? Items.STONE_AXE : Items.IRON_AXE;
        net.minecraft.world.item.Item hoe = tier <= 1 ? Items.WOODEN_HOE : tier == 2 ? Items.STONE_HOE : Items.IRON_HOE;
        switch (profession) {
            case BUILDER -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(pick));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0xC86E2C));
                setItemSlot(EquipmentSlot.HEAD, dyed(Items.LEATHER_HELMET, 0xC86E2C));
            }
            case LUMBERJACK -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(axe));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0x3C8A3C));
            }
            case FARMER -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(hoe));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0xD8B830));
                setItemSlot(EquipmentSlot.HEAD, dyed(Items.LEATHER_HELMET, 0xD8B830));
            }
            case MINER -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(pick));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0x6E6E6E));
                setItemSlot(EquipmentSlot.HEAD, dyed(Items.LEATHER_HELMET, 0x6E6E6E));
            }
            case WARRIOR -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(sword));
                setItemSlot(EquipmentSlot.OFFHAND, new ItemStack(Items.SHIELD));
                setItemSlot(EquipmentSlot.CHEST, tier <= 1 ? dyed(Items.LEATHER_CHESTPLATE, 0x8A2A2A) : new ItemStack(chest));
                setItemSlot(EquipmentSlot.HEAD, tier <= 1 ? dyed(Items.LEATHER_HELMET, 0x8A2A2A) : new ItemStack(helmet));
                setItemSlot(EquipmentSlot.LEGS, tier <= 1 ? dyed(Items.LEATHER_LEGGINGS, 0x8A2A2A) : new ItemStack(legs));
            }
            case GUARD -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(sword));
                setItemSlot(EquipmentSlot.OFFHAND, new ItemStack(Items.SHIELD));
                setItemSlot(EquipmentSlot.CHEST, tier <= 1 ? dyed(Items.LEATHER_CHESTPLATE, 0x2A3A6A) : new ItemStack(Items.CHAINMAIL_CHESTPLATE));
                setItemSlot(EquipmentSlot.HEAD, tier <= 1 ? dyed(Items.LEATHER_HELMET, 0x2A3A6A) : new ItemStack(Items.CHAINMAIL_HELMET));
                setItemSlot(EquipmentSlot.LEGS, tier <= 1 ? dyed(Items.LEATHER_LEGGINGS, 0x2A3A6A) : new ItemStack(Items.CHAINMAIL_LEGGINGS));
            }
            case SHEPHERD -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(Items.SHEARS));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0xEDEDED));
                setItemSlot(EquipmentSlot.HEAD, dyed(Items.LEATHER_HELMET, 0xEDEDED));
            }
            case HEALER -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(Items.GOLDEN_APPLE));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0xF0F0F0));
                setItemSlot(EquipmentSlot.HEAD, dyed(Items.LEATHER_HELMET, 0xD04060));
            }
            case BLACKSMITH -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(Items.IRON_INGOT));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0x3A3A3A));
                setItemSlot(EquipmentSlot.LEGS, dyed(Items.LEATHER_LEGGINGS, 0x3A3A3A));
            }
            case ARCHER -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(Items.BOW));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0x2F5A2F));
                setItemSlot(EquipmentSlot.HEAD, dyed(Items.LEATHER_HELMET, 0x2F5A2F));
                setItemSlot(EquipmentSlot.LEGS, dyed(Items.LEATHER_LEGGINGS, 0x2F5A2F));
            }
        }
    }

    private static ItemStack dyed(net.minecraft.world.item.Item item, int rgb) {
        ItemStack stack = new ItemStack(item);
        stack.set(DataComponents.DYED_COLOR, new DyedItemColor(rgb, false));
        return stack;
    }

    // --- Вселение: игрок садится «в» жителя и управляет им ---

    @Override
    public InteractionResult mobInteract(Player player, InteractionHand hand) {
        // Клик пустой рукой (без Shift): игрок «вселяется» в жителя. Shift — выйти.
        if (player.getItemInHand(hand).isEmpty() && !player.isShiftKeyDown() && !isVehicle() && hand == InteractionHand.MAIN_HAND) {
            if (!level().isClientSide) {
                setOrderPos(null);
                setFollowPlayer(null);
                player.startRiding(this, true);
            }
            return InteractionResult.sidedSuccess(level().isClientSide);
        }
        return super.mobInteract(player, hand);
    }

    @Nullable
    @Override
    public LivingEntity getControllingPassenger() {
        return getFirstPassenger() instanceof Player player ? player : super.getControllingPassenger();
    }

    @Override
    protected Vec3 getRiddenInput(Player player, Vec3 travelVector) {
        float strafe = player.xxa * 0.5f;
        float forward = player.zza;
        if (forward <= 0.0f) {
            forward *= 0.4f;
        }
        return new Vec3(strafe, 0.0, forward);
    }

    @Override
    protected float getRiddenSpeed(Player player) {
        return (float) getAttributeValue(Attributes.MOVEMENT_SPEED) * 0.55f;
    }

    @Override
    protected void tickRidden(Player player, Vec3 travelVector) {
        super.tickRidden(player, travelVector);
        setRot(player.getYRot(), player.getXRot() * 0.5f);
        this.yRotO = this.yBodyRot = this.yHeadRot = getYRot();
    }

    @Override
    public void tick() {
        super.tick();
        if (!level().isClientSide) {
            // Пока игрок управляет жителем, его собственный ИИ выключен.
            boolean ridden = getControllingPassenger() instanceof Player;
            if (ridden != isNoAi()) {
                setNoAi(ridden);
                if (ridden) {
                    getNavigation().stop();
                    setTarget(null);
                }
            }
            if (tickCount % 20 == 0) {
                tickHunger();
                tickClimbing();
            }
        }
    }

    public int getHunger() {
        return hunger;
    }

    public void addBuildXp(int amount) {
        buildXp += amount;
    }

    /** Навык строительства 1..5: быстрее кладёт и дальше достаёт. */
    public int getBuildSkill() {
        return Math.min(5, 1 + buildXp / 120);
    }

    /** Голод как у игрока: сытость падает, еда берётся со склада, без еды житель слабеет и умирает. */
    private void tickHunger() {
        if (++hungerTimer >= 60) { // раз в минуту −1
            hungerTimer = 0;
            hunger = Math.max(0, hunger - 1);
        }
        if (hunger < 14) {
            com.ricca.civilizations.block.TownHallBlockEntity hall = com.ricca.civilizations.block.TownHallBlockEntity.at(level(), townHall);
            if (hall != null && hall.getFood() > 0) {
                hall.addFood(-1);
                hunger = Math.min(20, hunger + 6);
                playSound(SoundEvents.GENERIC_EAT, 0.7f, 1.0f);
            }
        }
        if (++healTimer >= 10) {
            healTimer = 0;
            if (hunger == 0) {
                hurt(damageSources().starve(), 1.0f);
            } else if (hunger >= 14 && getHealth() < getMaxHealth()) {
                heal(1.0f);
            }
        }
        AttributeInstance speed = getAttribute(Attributes.MOVEMENT_SPEED);
        if (speed != null) {
            speed.setBaseValue(hunger < 6 ? 0.35 : 0.5);
        }
    }

    /**
     * Если житель упёрся в стену выше шага, он ставит лестницу и лезет по ней.
     */
    private void tickClimbing() {
        if (getNavigation().isDone() || getNavigation().getTargetPos() == null || isNoAi()) {
            stuckTimer = 0;
            lastX = getX();
            lastZ = getZ();
            return;
        }
        double moved = Math.abs(getX() - lastX) + Math.abs(getZ() - lastZ);
        lastX = getX();
        lastZ = getZ();
        if (moved > 0.6) {
            stuckTimer = 0;
            return;
        }
        if (++stuckTimer < 2) {
            return;
        }
        stuckTimer = 0;
        BlockPos target = getNavigation().getTargetPos();
        int dx = target.getX() - blockPosition().getX();
        int dz = target.getZ() - blockPosition().getZ();
        if (dx == 0 && dz == 0) {
            return;
        }
        net.minecraft.core.Direction dir = Math.abs(dx) >= Math.abs(dz)
                ? (dx > 0 ? net.minecraft.core.Direction.EAST : net.minecraft.core.Direction.WEST)
                : (dz > 0 ? net.minecraft.core.Direction.SOUTH : net.minecraft.core.Direction.NORTH);
        BlockPos feet = blockPosition();
        BlockPos wall = feet.relative(dir);
        Level level = level();
        if (!level.getBlockState(wall).isSolid() || !level.getBlockState(wall.above()).isSolid()) {
            return; // стена ниже двух блоков — перешагнёт сам
        }
        // Высота стены
        int height = 0;
        while (height < 8 && level.getBlockState(wall.above(height)).isSolid()) {
            height++;
        }
        if (height >= 8) {
            return;
        }
        // Ставим лестницу у стены на своей клетке снизу доверху
        BlockState ladder = Blocks.LADDER.defaultBlockState().setValue(net.minecraft.world.level.block.LadderBlock.FACING, dir.getOpposite());
        boolean placed = false;
        for (int y = 0; y < height; y++) {
            BlockPos at = feet.above(y);
            BlockState here = level.getBlockState(at);
            if ((here.isAir() || here.canBeReplaced()) && level.getBlockState(wall.above(y)).isSolid()) {
                level.setBlock(at, ladder, 3);
                placed = true;
            }
        }
        if (placed) {
            swing(InteractionHand.MAIN_HAND);
            setDeltaMovement(getDeltaMovement().add(dir.getStepX() * 0.1, 0.3, dir.getStepZ() * 0.1));
        }
    }

    @Override
    protected Vec3 getPassengerAttachmentPoint(Entity entity, EntityDimensions dimensions, float scale) {
        return new Vec3(0.0, 0.55 * scale, 0.0);
    }

    private void setBase(net.minecraft.core.Holder<net.minecraft.world.entity.ai.attributes.Attribute> attribute, double value) {
        AttributeInstance instance = getAttribute(attribute);
        if (instance != null) {
            instance.setBaseValue(value);
        }
    }

    private void updateDisplayName() {
        String kingdom = getKingdom();
        if (kingdom.isEmpty()) {
            setCustomName(Component.translatable("entity.civilizations.settler." + getProfession().key()));
        } else {
            setCustomName(Component.translatable("entity.civilizations.settler." + getProfession().key() + ".named", kingdom));
        }
        setCustomNameVisible(true);
    }

    @Nullable
    public BlockPos getTownHall() {
        return townHall;
    }

    public void setTownHall(@Nullable BlockPos pos) {
        this.townHall = pos;
        if (pos != null) {
            restrictTo(pos, HOME_RADIUS);
        } else {
            clearRestriction();
        }
    }

    public int getHouseIndex() {
        return houseIndex;
    }

    public void setHouseIndex(int houseIndex) {
        this.houseIndex = houseIndex;
    }

    // --- Сохранение в мир ---

    @Override
    public void addAdditionalSaveData(CompoundTag tag) {
        super.addAdditionalSaveData(tag);
        tag.putString("Kingdom", getKingdom());
        tag.putInt("Profession", getProfession().ordinal());
        tag.putInt("HouseIndex", houseIndex);
        tag.putInt("Tier", getTier());
        tag.putInt("Hunger", hunger);
        tag.putInt("BuildXp", buildXp);
        if (projectType != null) {
            tag.putString("Project", projectType.name());
        }
        if (projectOrigin != null) {
            tag.putLong("ProjectOrigin", projectOrigin.asLong());
        }
        if (orderPos != null) {
            tag.putLong("OrderPos", orderPos.asLong());
        }
        if (guardPost != null) {
            tag.putLong("GuardPost", guardPost.asLong());
        }
        if (followPlayer != null) {
            tag.putUUID("FollowPlayer", followPlayer);
        }
        if (townHall != null) {
            tag.putInt("TownHallX", townHall.getX());
            tag.putInt("TownHallY", townHall.getY());
            tag.putInt("TownHallZ", townHall.getZ());
        }
    }

    @Override
    public void readAdditionalSaveData(CompoundTag tag) {
        super.readAdditionalSaveData(tag);
        this.entityData.set(KINGDOM, tag.getString("Kingdom"));
        this.entityData.set(PROFESSION, tag.getInt("Profession"));
        applyProfessionStats(getProfession());
        houseIndex = tag.contains("HouseIndex") ? tag.getInt("HouseIndex") : -1;
        this.entityData.set(TIER, tag.contains("Tier") ? tag.getInt("Tier") : 1);
        hunger = tag.contains("Hunger") ? tag.getInt("Hunger") : 20;
        buildXp = tag.getInt("BuildXp");
        projectType = null;
        projectOrigin = tag.contains("ProjectOrigin") ? BlockPos.of(tag.getLong("ProjectOrigin")) : null;
        if (tag.contains("Project")) {
            try {
                projectType = Blueprint.Type.valueOf(tag.getString("Project"));
            } catch (IllegalArgumentException ignored) {
            }
        }
        orderPos = tag.contains("OrderPos") ? BlockPos.of(tag.getLong("OrderPos")) : null;
        guardPost = tag.contains("GuardPost") ? BlockPos.of(tag.getLong("GuardPost")) : null;
        followPlayer = tag.hasUUID("FollowPlayer") ? tag.getUUID("FollowPlayer") : null;
        if (tag.contains("TownHallX")) {
            setTownHall(new BlockPos(tag.getInt("TownHallX"), tag.getInt("TownHallY"), tag.getInt("TownHallZ")));
        } else {
            setTownHall(null);
        }
    }

    // --- Звуки ---

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.VILLAGER_AMBIENT;
    }

    @Override
    protected SoundEvent getHurtSound(DamageSource source) {
        return SoundEvents.VILLAGER_HURT;
    }

    @Override
    protected SoundEvent getDeathSound() {
        return SoundEvents.VILLAGER_DEATH;
    }
}

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
public class SettlerEntity extends PathfinderMob {
    private static final EntityDataAccessor<String> KINGDOM =
            SynchedEntityData.defineId(SettlerEntity.class, EntityDataSerializers.STRING);
    private static final EntityDataAccessor<Integer> PROFESSION =
            SynchedEntityData.defineId(SettlerEntity.class, EntityDataSerializers.INT);

    private static final int HOME_RADIUS = 24;

    @Nullable
    private BlockPos townHall;
    /** Какой участок под дом занял этот строитель. −1 — никакой. */
    private int houseIndex = -1;
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
        this.goalSelector.addGoal(1, new PanicGoal(this, 0.6) {
            @Override
            public boolean canUse() {
                return !isWarrior() && super.canUse();
            }
        });
        this.goalSelector.addGoal(1, new MeleeAttackGoal(this, 1.0, true));
        this.goalSelector.addGoal(2, new FollowPlayerGoal(this));
        this.goalSelector.addGoal(2, new OrderGoal(this));
        this.goalSelector.addGoal(3, new GuardPostGoal(this));
        this.goalSelector.addGoal(3, new BuildHouseGoal(this));
        this.goalSelector.addGoal(3, new ChopTreesGoal(this));
        this.goalSelector.addGoal(3, new FarmGoal(this));
        this.goalSelector.addGoal(3, new MineGoal(this));
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
        // Воины бьют жителей чужих королевств, которые подошли близко.
        this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, SettlerEntity.class, 10, true, false,
                target -> isWarrior() && target instanceof SettlerEntity other && isEnemy(other)));
    }

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(KINGDOM, "");
        builder.define(PROFESSION, Profession.BUILDER.ordinal());
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

    /** Воин или стражник: дерётся, а не убегает. */
    public boolean isWarrior() {
        Profession p = getProfession();
        return p == Profession.WARRIOR || p == Profession.GUARD;
    }

    public boolean isEnemy(SettlerEntity other) {
        String mine = getKingdom();
        String theirs = other.getKingdom();
        return !mine.isEmpty() && !theirs.isEmpty() && !mine.equals(theirs);
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

    /** Инструменты и одежда по профессии. Урон и броня берутся из предметов. */
    private void equipForProfession(Profession profession) {
        for (EquipmentSlot slot : EquipmentSlot.values()) {
            setItemSlot(slot, ItemStack.EMPTY);
            setDropChance(slot, 0.0f);
        }
        switch (profession) {
            case BUILDER -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(Items.WOODEN_PICKAXE));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0xC86E2C));
                setItemSlot(EquipmentSlot.HEAD, dyed(Items.LEATHER_HELMET, 0xC86E2C));
            }
            case LUMBERJACK -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(Items.WOODEN_AXE));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0x3C8A3C));
            }
            case FARMER -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(Items.WOODEN_HOE));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0xD8B830));
                setItemSlot(EquipmentSlot.HEAD, dyed(Items.LEATHER_HELMET, 0xD8B830));
            }
            case WARRIOR -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(Items.IRON_SWORD));
                setItemSlot(EquipmentSlot.OFFHAND, new ItemStack(Items.SHIELD));
                setItemSlot(EquipmentSlot.CHEST, new ItemStack(Items.IRON_CHESTPLATE));
                setItemSlot(EquipmentSlot.HEAD, new ItemStack(Items.IRON_HELMET));
                setItemSlot(EquipmentSlot.LEGS, new ItemStack(Items.IRON_LEGGINGS));
            }
            case MINER -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(Items.STONE_PICKAXE));
                setItemSlot(EquipmentSlot.CHEST, dyed(Items.LEATHER_CHESTPLATE, 0x6E6E6E));
                setItemSlot(EquipmentSlot.HEAD, dyed(Items.LEATHER_HELMET, 0x6E6E6E));
            }
            case GUARD -> {
                setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(Items.IRON_SWORD));
                setItemSlot(EquipmentSlot.OFFHAND, new ItemStack(Items.SHIELD));
                setItemSlot(EquipmentSlot.CHEST, new ItemStack(Items.CHAINMAIL_CHESTPLATE));
                setItemSlot(EquipmentSlot.HEAD, new ItemStack(Items.CHAINMAIL_HELMET));
                setItemSlot(EquipmentSlot.LEGS, new ItemStack(Items.CHAINMAIL_LEGGINGS));
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

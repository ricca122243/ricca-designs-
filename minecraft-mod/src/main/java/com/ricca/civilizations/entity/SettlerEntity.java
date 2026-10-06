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
import net.minecraft.world.entity.EntityType;
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

    public SettlerEntity(EntityType<? extends PathfinderMob> type, Level level) {
        super(type, level);
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Mob.createMobAttributes()
                .add(Attributes.MAX_HEALTH, 20.0)
                .add(Attributes.MOVEMENT_SPEED, 0.5)
                .add(Attributes.FOLLOW_RANGE, 32.0)
                .add(Attributes.ATTACK_DAMAGE, 2.0);
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
        this.goalSelector.addGoal(2, new MeleeAttackGoal(this, 1.0, true));
        this.goalSelector.addGoal(3, new BuildHouseGoal(this));
        this.goalSelector.addGoal(3, new ChopTreesGoal(this));
        this.goalSelector.addGoal(3, new FarmGoal(this));
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

    public boolean isWarrior() {
        return getProfession() == Profession.WARRIOR;
    }

    public void setProfession(Profession profession) {
        this.entityData.set(PROFESSION, profession.ordinal());
        applyProfessionStats(profession);
        updateDisplayName();
    }

    private void applyProfessionStats(Profession profession) {
        boolean warrior = profession == Profession.WARRIOR;
        setBase(Attributes.MAX_HEALTH, warrior ? 30.0 : 20.0);
        setBase(Attributes.ATTACK_DAMAGE, warrior ? 6.0 : 2.0);
        setBase(Attributes.ARMOR, warrior ? 6.0 : 0.0);
        setHealth(getMaxHealth());
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

package com.ricca.civilizations.entity;

import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.PanicGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

import javax.annotation.Nullable;

/**
 * Поселенец: мирный житель королевства. Знает, где стоит его ратуша,
 * и строит рядом с ней дом (см. {@link BuildHouseGoal}).
 */
public class SettlerEntity extends PathfinderMob {
    private static final EntityDataAccessor<String> KINGDOM =
            SynchedEntityData.defineId(SettlerEntity.class, EntityDataSerializers.STRING);

    @Nullable
    private BlockPos townHall;
    private int houseIndex;

    public SettlerEntity(EntityType<? extends PathfinderMob> type, Level level) {
        super(type, level);
    }

    public static AttributeSupplier.Builder createAttributes() {
        return Mob.createMobAttributes()
                .add(Attributes.MAX_HEALTH, 20.0)
                .add(Attributes.MOVEMENT_SPEED, 0.5)
                .add(Attributes.FOLLOW_RANGE, 32.0);
    }

    @Override
    protected void registerGoals() {
        this.goalSelector.addGoal(0, new FloatGoal(this));
        this.goalSelector.addGoal(1, new PanicGoal(this, 0.6));
        this.goalSelector.addGoal(2, new BuildHouseGoal(this));
        this.goalSelector.addGoal(5, new WaterAvoidingRandomStrollGoal(this, 0.4));
        this.goalSelector.addGoal(6, new LookAtPlayerGoal(this, Player.class, 8.0f));
        this.goalSelector.addGoal(7, new RandomLookAroundGoal(this));
    }

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(KINGDOM, "");
    }

    // --- Королевство ---

    public String getKingdom() {
        return this.entityData.get(KINGDOM);
    }

    public void setKingdom(String kingdom) {
        this.entityData.set(KINGDOM, kingdom);
    }

    @Nullable
    public BlockPos getTownHall() {
        return townHall;
    }

    public void setTownHall(@Nullable BlockPos pos) {
        this.townHall = pos;
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
        setKingdom(tag.getString("Kingdom"));
        houseIndex = tag.getInt("HouseIndex");
        if (tag.contains("TownHallX")) {
            townHall = new BlockPos(tag.getInt("TownHallX"), tag.getInt("TownHallY"), tag.getInt("TownHallZ"));
        } else {
            townHall = null;
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

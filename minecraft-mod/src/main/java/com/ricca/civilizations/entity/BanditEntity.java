package com.ricca.civilizations.entity;

import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.monster.Pillager;
import net.minecraft.world.level.Level;

/** Разбойник: обычный налётчик с арбалетом, который охотится и на жителей королевств. */
public class BanditEntity extends Pillager {
    public BanditEntity(EntityType<? extends Pillager> type, Level level) {
        super(type, level);
    }

    @Override
    protected void registerGoals() {
        super.registerGoals();
        this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, SettlerEntity.class, true));
    }
}

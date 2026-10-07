package com.ricca.civilizations.entity;

import net.minecraft.resources.ResourceLocation;

/** Профессии поселенцев. У каждой своя работа и своя одежда. */
public enum Profession {
    BUILDER("builder", "mason"),
    LUMBERJACK("lumberjack", "fletcher"),
    FARMER("farmer", "farmer"),
    WARRIOR("warrior", "weaponsmith"),
    GUARD("guard", "armorer"),
    MINER("miner", "toolsmith");

    private final String key;
    private final ResourceLocation overlayTexture;

    Profession(String key, String villagerTexture) {
        this.key = key;
        this.overlayTexture = ResourceLocation.withDefaultNamespace("textures/entity/villager/profession/" + villagerTexture + ".png");
    }

    /** Ключ для переводов, например entity.civilizations.settler.farmer */
    public String key() {
        return key;
    }

    public ResourceLocation overlayTexture() {
        return overlayTexture;
    }

    public static Profession byId(int id) {
        Profession[] values = values();
        return values[Math.floorMod(id, values.length)];
    }
}

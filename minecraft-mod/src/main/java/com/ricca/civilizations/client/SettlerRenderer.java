package com.ricca.civilizations.client;

import com.ricca.civilizations.entity.SettlerEntity;
import net.minecraft.client.model.VillagerModel;
import net.minecraft.client.model.geom.ModelLayers;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.resources.ResourceLocation;

/** Поселенец пока выглядит как обычный житель. Свою внешность добавим позже. */
public class SettlerRenderer extends MobRenderer<SettlerEntity, VillagerModel<SettlerEntity>> {
    private static final ResourceLocation TEXTURE = ResourceLocation.withDefaultNamespace("textures/entity/villager/villager.png");

    public SettlerRenderer(EntityRendererProvider.Context context) {
        super(context, new VillagerModel<>(context.bakeLayer(ModelLayers.VILLAGER)), 0.5f);
    }

    @Override
    public ResourceLocation getTextureLocation(SettlerEntity entity) {
        return TEXTURE;
    }
}

package com.ricca.civilizations.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.ricca.civilizations.entity.SettlerEntity;
import net.minecraft.client.Minecraft;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.geom.ModelLayers;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.HumanoidMobRenderer;
import net.minecraft.client.renderer.entity.layers.HumanoidArmorLayer;
import net.minecraft.resources.ResourceLocation;

/** Поселенец выглядит как человек: держит инструменты, носит броню по профессии. */
public class SettlerRenderer extends HumanoidMobRenderer<SettlerEntity, HumanoidModel<SettlerEntity>> {
    private static final ResourceLocation TEXTURE = ResourceLocation.withDefaultNamespace("textures/entity/player/wide/steve.png");

    public SettlerRenderer(EntityRendererProvider.Context context) {
        super(context, new HumanoidModel<>(context.bakeLayer(ModelLayers.ZOMBIE)), 0.5f);
        this.addLayer(new HumanoidArmorLayer<>(this,
                new HumanoidModel<>(context.bakeLayer(ModelLayers.ZOMBIE_INNER_ARMOR)),
                new HumanoidModel<>(context.bakeLayer(ModelLayers.ZOMBIE_OUTER_ARMOR)),
                context.getModelManager()));
    }

    @Override
    public ResourceLocation getTextureLocation(SettlerEntity entity) {
        return TEXTURE;
    }

    @Override
    public void render(SettlerEntity entity, float entityYaw, float partialTicks, PoseStack poseStack, MultiBufferSource buffer, int packedLight) {
        // Когда игрок «вселился» в жителя и смотрит от первого лица, тело жителя не рисуем.
        Minecraft mc = Minecraft.getInstance();
        if (entity.getFirstPassenger() == mc.player && mc.options.getCameraType().isFirstPerson()) {
            return;
        }
        super.render(entity, entityYaw, partialTicks, poseStack, buffer, packedLight);
    }
}

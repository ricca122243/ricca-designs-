package com.ricca.civilizations.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.ricca.civilizations.entity.SettlerEntity;
import net.minecraft.client.model.VillagerModel;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.RenderLayerParent;
import net.minecraft.client.renderer.entity.layers.RenderLayer;

/** Одежда по профессии поверх базовой текстуры жителя. */
public class ProfessionLayer extends RenderLayer<SettlerEntity, VillagerModel<SettlerEntity>> {
    public ProfessionLayer(RenderLayerParent<SettlerEntity, VillagerModel<SettlerEntity>> parent) {
        super(parent);
    }

    @Override
    public void render(PoseStack poseStack, MultiBufferSource buffer, int packedLight, SettlerEntity entity,
                       float limbSwing, float limbSwingAmount, float partialTick, float ageInTicks,
                       float netHeadYaw, float headPitch) {
        if (entity.isInvisible()) {
            return;
        }
        renderColoredCutoutModel(getParentModel(), entity.getProfession().overlayTexture(), poseStack, buffer, packedLight, entity, -1);
    }
}

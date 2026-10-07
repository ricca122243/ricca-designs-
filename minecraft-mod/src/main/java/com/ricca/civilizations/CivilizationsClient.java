package com.ricca.civilizations;

import com.ricca.civilizations.client.SettlerRenderer;
import net.minecraft.client.renderer.entity.PillagerRenderer;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;

/** Код только для клиента (графика). На выделенном сервере этот класс не загружается. */
@Mod(value = Civilizations.MODID, dist = Dist.CLIENT)
@EventBusSubscriber(modid = Civilizations.MODID, value = Dist.CLIENT)
public class CivilizationsClient {

    /** Говорим игре, как рисовать поселенца. */
    @SubscribeEvent
    static void registerRenderers(EntityRenderersEvent.RegisterRenderers event) {
        event.registerEntityRenderer(Civilizations.SETTLER.get(), SettlerRenderer::new);
        event.registerEntityRenderer(Civilizations.BANDIT.get(), PillagerRenderer::new);
    }
}

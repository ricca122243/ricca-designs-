package com.ricca.civilizations.client;

import net.minecraft.client.Minecraft;

/** Вызывается только на клиенте. */
public final class ClientHooks {
    private ClientHooks() {}

    public static void openKingdomMap() {
        Minecraft.getInstance().setScreen(new KingdomMapScreen());
    }
}

package com.ricca.civilizations.client;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/** Меню управления королевством: кнопки вызывают команды /kingdom. */
public class KingdomMenuScreen extends Screen {
    private static final String[] HIRE = {"builder", "lumberjack", "farmer", "miner", "shepherd", "warrior", "archer", "guard"};
    private static final String[] BUILD = {"leveling", "house", "warehouse", "pen", "palisade", "wall", "keep"};

    public KingdomMenuScreen() {
        super(Component.translatable("civilizations.menu.title"));
    }

    @Override
    public boolean isPauseScreen() {
        return false;
    }

    @Override
    protected void init() {
        int cx = this.width / 2;
        int top = 40;
        int w = 95;
        int h = 20;
        // Найм
        for (int i = 0; i < HIRE.length; i++) {
            String p = HIRE[i];
            int x = cx - 200 + (i % 4) * (w + 5);
            int y = top + 14 + (i / 4) * (h + 4);
            addRenderableWidget(Button.builder(Component.translatable("entity.civilizations.settler." + p), b -> send("kingdom hire " + p)).bounds(x, y, w, h).build());
        }
        // Стройка
        int top2 = top + 14 + 2 * (h + 4) + 18;
        for (int i = 0; i < BUILD.length; i++) {
            String t = BUILD[i];
            int x = cx - 200 + (i % 4) * (w + 5);
            int y = top2 + 14 + (i / 4) * (h + 4);
            addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.build." + t), b -> send("kingdom build " + t)).bounds(x, y, w, h).build());
        }
        // Армия и сводка
        int top3 = top2 + 14 + 2 * (h + 4) + 18;
        addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.rally"), b -> send("kingdom rally")).bounds(cx - 200, top3 + 14, w, h).build());
        addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.home"), b -> send("kingdom home")).bounds(cx - 100, top3 + 14, w, h).build());
        addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.stats"), b -> send("kingdom stats")).bounds(cx, top3 + 14, w, h).build());
        addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.list"), b -> send("kingdom list")).bounds(cx + 100, top3 + 14, w, h).build());
        addRenderableWidget(Button.builder(Component.translatable("gui.done"), b -> onClose()).bounds(cx - 50, top3 + 14 + h + 10, 100, h).build());
    }

    private void send(String command) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player != null) {
            mc.player.connection.sendCommand(command);
        }
        onClose();
    }

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float partialTick) {
        super.render(g, mouseX, mouseY, partialTick);
        int cx = this.width / 2;
        g.drawCenteredString(this.font, this.title, cx, 20, 0xFFFFFF);
        g.drawString(this.font, Component.translatable("civilizations.menu.hire_title"), cx - 200, 40, 0xFFD700);
        int top2 = 40 + 14 + 2 * 24 + 18;
        g.drawString(this.font, Component.translatable("civilizations.menu.build_title"), cx - 200, top2, 0xFFD700);
        int top3 = top2 + 14 + 2 * 24 + 18;
        g.drawString(this.font, Component.translatable("civilizations.menu.army_title"), cx - 200, top3, 0xFFD700);
    }
}

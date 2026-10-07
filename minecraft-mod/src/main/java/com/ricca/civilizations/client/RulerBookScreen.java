package com.ricca.civilizations.client;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.item.RulerBookItem;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ItemStack;

/** Книга правителя: вкладки Люди / Стройка / Войско / Дипломатия / Сводка. Кнопки шлют команды незаметно для игрока. */
public class RulerBookScreen extends Screen {
    private static final String[] TABS = {"people", "build", "army", "diplomacy", "report"};
    private static final String[] WORKERS = {"builder", "architect", "lumberjack", "farmer", "miner", "shepherd", "healer", "blacksmith"};
    private static final String[] SOLDIERS = {"warrior", "archer", "guard", "knight", "crossbowman", "pikeman"};
    private static final String[] BUILD = {"leveling", "house", "warehouse", "pen", "palisade", "tower", "wall", "keep"};

    private int tab = 0;
    private int left, top;
    private static final int W = 360, H = 230;

    public RulerBookScreen() {
        super(Component.translatable("civilizations.book.title"));
    }

    @Override
    public boolean isPauseScreen() {
        return false;
    }

    @Override
    protected void init() {
        left = (width - W) / 2;
        top = (height - H) / 2;
        int tw = W / TABS.length;
        for (int i = 0; i < TABS.length; i++) {
            final int idx = i;
            Button b = Button.builder(Component.translatable("civilizations.book.tab." + TABS[i]), bt -> { tab = idx; rebuildWidgets(); })
                    .bounds(left + i * tw, top - 22, tw - 2, 20).build();
            b.active = i != tab;
            addRenderableWidget(b);
        }
        int bw = 110, bh = 20, x0 = left + 8, y0 = top + 10;
        switch (tab) {
            case 0 -> {
                for (int i = 0; i < WORKERS.length; i++) {
                    String p = WORKERS[i];
                    addRenderableWidget(Button.builder(hireLabel(p), b -> send("kingdom hire " + p)).bounds(x0 + (i % 3) * (bw + 6), y0 + 16 + (i / 3) * (bh + 4), bw, bh).build());
                }
                addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.tax_low"), b -> send("kingdom tax low")).bounds(x0, top + 140, bw, bh).build());
                addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.tax_normal"), b -> send("kingdom tax normal")).bounds(x0 + bw + 6, top + 140, bw, bh).build());
                addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.tax_high"), b -> send("kingdom tax high")).bounds(x0 + 2 * (bw + 6), top + 140, bw, bh).build());
            }
            case 1 -> {
                for (int i = 0; i < BUILD.length; i++) {
                    String t = BUILD[i];
                    addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.build." + t), b -> send("kingdom build " + t)).bounds(x0 + (i % 3) * (bw + 6), y0 + 16 + (i / 3) * (bh + 4), bw, bh).build());
                }
            }
            case 2 -> {
                for (int i = 0; i < SOLDIERS.length; i++) {
                    String p = SOLDIERS[i];
                    addRenderableWidget(Button.builder(hireLabel(p), b -> send("kingdom hire " + p)).bounds(x0 + (i % 3) * (bw + 6), y0 + 16 + (i / 3) * (bh + 4), bw, bh).build());
                }
                addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.rally"), b -> send("kingdom rally")).bounds(x0, top + 120, bw, bh).build());
                addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.home"), b -> send("kingdom home")).bounds(x0 + bw + 6, top + 120, bw, bh).build());
                addRenderableWidget(Button.builder(Component.translatable("civilizations.menu.summon"), b -> send("kingdom summon")).bounds(x0 + 2 * (bw + 6), top + 120, bw, bh).build());
            }
            case 3 -> {
                CompoundTag data = data();
                if (data != null) {
                    ListTag list = data.getList("Kingdoms", Tag.TAG_COMPOUND);
                    for (int i = 0; i < Math.min(list.size(), 6); i++) {
                        CompoundTag k = list.getCompound(i);
                        String name = k.getString("Name");
                        int y = y0 + 16 + i * 26;
                        addRenderableWidget(Button.builder(Component.translatable("civilizations.book.gift"), b -> send("kingdom gift " + name + " 50")).bounds(left + 190, y, 52, 20).build());
                        addRenderableWidget(Button.builder(Component.translatable("civilizations.book.peace"), b -> send("kingdom peace " + name)).bounds(left + 246, y, 52, 20).build());
                        addRenderableWidget(Button.builder(Component.translatable("civilizations.book.war"), b -> send("kingdom war " + name)).bounds(left + 302, y, 52, 20).build());
                    }
                }
            }
            case 4 -> {
                String[] res = {"wood", "stone", "food", "iron"};
                for (int i = 0; i < res.length; i++) {
                    String r = res[i];
                    addRenderableWidget(Button.builder(Component.translatable("civilizations.book.quota." + r), b -> send("kingdom quota " + r + " 500")).bounds(x0 + i * 86, top + 130, 82, 20).build());
                }
                addRenderableWidget(Button.builder(Component.translatable("civilizations.book.view"), b -> send("kingdom view")).bounds(x0, top + 156, 170, 20).build());
                addRenderableWidget(Button.builder(Component.translatable("civilizations.book.quota_clear"), b -> { send("kingdom quota wood 0"); }).bounds(x0 + 176, top + 156, 170, 20).build());
            }
            default -> { }
        }
        addRenderableWidget(Button.builder(Component.translatable("gui.done"), b -> onClose()).bounds(left + W / 2 - 50, top + H - 26, 100, 20).build());
    }

    private static Component hireLabel(String profession) {
        return Component.translatable("entity.civilizations.settler." + profession);
    }

    private void send(String command) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player != null) {
            mc.player.connection.sendCommand(command);
        }
        onClose();
    }

    private static CompoundTag data() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null) return null;
        for (ItemStack stack : new ItemStack[]{mc.player.getMainHandItem(), mc.player.getOffhandItem()}) {
            if (stack.is(Civilizations.RULER_BOOK.get()) || stack.is(Civilizations.COMMAND_STAFF.get())) {
                CompoundTag tag = RulerBookItem.readData(stack);
                if (tag != null && tag.contains("HasKingdom")) return tag;
            }
        }
        return null;
    }

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float partialTick) {
        super.render(g, mouseX, mouseY, partialTick);
        g.fill(left - 2, top - 2, left + W + 2, top + H + 2, 0xFFC8A060);
        g.fill(left, top, left + W, top + H, 0xFF2A2320);
        // Кнопки рисуются поверх панели — перерисовываем их после фона
        for (var w : this.renderables) {
            w.render(g, mouseX, mouseY, partialTick);
        }
        CompoundTag data = data();
        int x0 = left + 8, y0 = top + 10;
        g.drawString(font, Component.translatable("civilizations.book.tab." + TABS[tab]), x0, y0, 0xFFD700);
        if (data == null) {
            g.drawString(font, Component.translatable("civilizations.map.loading"), x0, y0 + 16, 0xAAAAAA);
            return;
        }
        if (!data.getBoolean("HasKingdom") && tab != 3) {
            g.drawString(font, Component.translatable("civilizations.cmd.no_kingdom"), x0, top + H - 50, 0xFF6060);
        }
        switch (tab) {
            case 0 -> {
                g.drawString(font, Component.translatable("civilizations.book.hire_hint"), x0, top + 100, 0xAAAAAA);
                g.drawString(font, Component.translatable("civilizations.book.tax_now", Component.translatable("civilizations.tax." + data.getInt("Tax"))), x0, top + 124, 0xCCCCCC);
            }
            case 1 -> {
                g.drawString(font, Component.translatable("civilizations.book.storage", data.getInt("Wood"), data.getInt("Stone"), data.getInt("Iron")), x0, top + 100, 0xCCCCCC);
                String b = data.getString("Buildings");
                g.drawString(font, Component.translatable("civilizations.book.built", mark(b, "W"), mark(b, "P"), mark(b, "T"), mark(b, "S")), x0, top + 116, 0xCCCCCC);
            }
            case 2 -> {
                g.drawString(font, Component.translatable("civilizations.book.army", data.getInt("Soldiers"), data.getInt("Arms"), data.getInt("Tier")), x0, top + 100, 0xCCCCCC);
            }
            case 3 -> {
                ListTag list = data.getList("Kingdoms", Tag.TAG_COMPOUND);
                if (list.isEmpty()) g.drawString(font, Component.translatable("civilizations.staff.no_kingdoms"), x0, y0 + 16, 0xAAAAAA);
                for (int i = 0; i < Math.min(list.size(), 6); i++) {
                    CompoundTag k = list.getCompound(i);
                    int rel = k.getInt("Rel");
                    int color = rel >= 50 ? 0x60D060 : rel <= -40 ? 0xE04040 : rel < 0 ? 0xE0A040 : 0x80B0E0;
                    g.drawString(font, k.getString("Name") + "  " + k.getInt("Dist") + "m", x0, y0 + 22 + i * 26, color);
                    g.drawString(font, Component.translatable("civilizations.book.rel", rel, k.getInt("Defenders")), x0, y0 + 32 + i * 26, 0x999999);
                }
            }
            case 4 -> {
                int y = y0 + 18;
                g.drawString(font, Component.translatable("civilizations.townhall.title", data.getString("Kingdom")), x0, y, 0xFFD700); y += 14;
                g.drawString(font, Component.translatable("civilizations.book.line_pop", data.getInt("Pop"), data.getInt("Soldiers"), data.getInt("Houses")), x0, y, 0xFFFFFF); y += 12;
                g.drawString(font, Component.translatable("civilizations.book.storage", data.getInt("Wood"), data.getInt("Stone"), data.getInt("Iron")), x0, y, 0xFFFFFF); y += 12;
                g.drawString(font, Component.translatable("civilizations.book.line_food", data.getInt("Food"), data.getInt("Gold")), x0, y, 0xFFFFFF); y += 12;
                g.drawString(font, Component.translatable("civilizations.book.line_tier", data.getInt("Tier"), Component.translatable("civilizations.title." + Math.max(1, Math.min(4, data.getInt("Tier")))), data.getInt("Arms")), x0, y, 0xFFFFFF); y += 12;
                g.drawString(font, Component.translatable("civilizations.book.line_villages", data.getInt("Villages"), Component.translatable("civilizations.tax." + data.getInt("Tax"))), x0, y, 0xFFFFFF); y += 12;
                String b = data.getString("Buildings");
                g.drawString(font, Component.translatable("civilizations.book.built", mark(b, "W"), mark(b, "P"), mark(b, "T"), mark(b, "S")), x0, y, 0xFFFFFF);
            }
            default -> { }
        }
    }

    private static String mark(String flags, String key) {
        return flags.contains(key) ? "✔" : "✘";
    }
}

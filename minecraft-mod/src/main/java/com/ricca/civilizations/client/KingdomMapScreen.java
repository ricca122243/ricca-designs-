package com.ricca.civilizations.client;

import com.ricca.civilizations.Civilizations;
import com.ricca.civilizations.item.KingdomMapItem;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ItemStack;

/**
 * Карта земель: вид сверху, игрок в центре, королевства кружками.
 * Данные берутся из самого предмета-карты (сервер записывает их при клике).
 */
public class KingdomMapScreen extends Screen {
    private static final int PANEL_W = 320;
    private static final int PANEL_H = 220;

    public KingdomMapScreen() {
        super(Component.translatable("civilizations.map.title"));
    }

    @Override
    public boolean isPauseScreen() {
        return false;
    }

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float partialTick) {
        super.render(g, mouseX, mouseY, partialTick);

        int left = (this.width - PANEL_W) / 2;
        int top = (this.height - PANEL_H) / 2;
        g.fill(left - 2, top - 2, left + PANEL_W + 2, top + PANEL_H + 2, 0xFFC8A060);
        g.fill(left, top, left + PANEL_W, top + PANEL_H, 0xFF2B3A2B);
        g.drawCenteredString(this.font, this.title, this.width / 2, top - 14, 0xFFFFFF);
        g.drawString(this.font, "N", this.width / 2 - 2, top + 4, 0xAAAAAA);

        CompoundTag data = findMapData();
        if (data == null) {
            g.drawCenteredString(this.font, Component.translatable("civilizations.map.loading"), this.width / 2, this.height / 2, 0xAAAAAA);
            return;
        }

        int px = data.getInt("PX");
        int pz = data.getInt("PZ");
        String me = data.getString("Me");
        ListTag list = data.getList("Kingdoms", Tag.TAG_COMPOUND);

        // Масштаб: чтобы все королевства поместились.
        double maxDist = 150;
        for (int i = 0; i < list.size(); i++) {
            CompoundTag k = list.getCompound(i);
            maxDist = Math.max(maxDist, Math.abs(k.getInt("X") - px) + k.getInt("R"));
            maxDist = Math.max(maxDist, Math.abs(k.getInt("Z") - pz) + k.getInt("R"));
        }
        double scale = (PANEL_H / 2.0 - 16) / maxDist;
        int cx = left + PANEL_W / 2;
        int cz = top + PANEL_H / 2;

        for (int i = 0; i < list.size(); i++) {
            CompoundTag k = list.getCompound(i);
            String name = k.getString("Name");
            int x = cx + (int) ((k.getInt("X") - px) * scale);
            int z = cz + (int) ((k.getInt("Z") - pz) * scale);
            int r = Math.max(3, (int) (k.getInt("R") * scale));
            boolean mine = !me.isEmpty() && me.equals(name);
            int rel = k.getInt("Rel");
            int rgb = mine ? 0x40C040 : rel >= 50 ? 0x60D060 : rel <= -40 ? 0xD03030 : rel < 0 ? 0xD09030 : 0x4080C0;
            int color = 0x60000000 | rgb;
            int border = 0xFF000000 | rgb;
            fillCircle(g, x, z, r, color);
            g.fill(x - 2, z - 2, x + 2, z + 2, border);
            g.drawCenteredString(this.font, name, x, z - r - 11, 0xFFFFFF);
            g.drawCenteredString(this.font, Component.translatable("civilizations.map.pop", k.getInt("Pop"), k.getInt("Houses")), x, z + r + 2, 0xCCCCCC);
            g.drawCenteredString(this.font, Component.translatable("civilizations.map.extra", k.getInt("Tier"), k.getInt("Villages"), mine ? "" : rel), x, z + r + 12, 0x999999);
        }

        // Игрок
        g.fill(cx - 2, cz - 2, cx + 2, cz + 2, 0xFFFFFFFF);
        g.drawCenteredString(this.font, Component.translatable("civilizations.map.you"), cx, cz + 5, 0xFFFFFF);
        g.drawCenteredString(this.font, Component.translatable("civilizations.map.scale", (int) (1 / scale)), this.width / 2, top + PANEL_H - 11, 0x888888);
        g.drawString(this.font, Component.translatable("civilizations.map.legend"), left + 4, top + PANEL_H - 11, 0x888888);
    }

    private static void fillCircle(GuiGraphics g, int cx, int cz, int r, int color) {
        for (int dz = -r; dz <= r; dz++) {
            int half = (int) Math.sqrt(r * r - dz * dz);
            g.fill(cx - half, cz + dz, cx + half + 1, cz + dz + 1, color);
        }
    }

    private static CompoundTag findMapData() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null) {
            return null;
        }
        for (ItemStack stack : new ItemStack[]{mc.player.getMainHandItem(), mc.player.getOffhandItem()}) {
            if (stack.is(Civilizations.KINGDOM_MAP.get())) {
                CompoundTag tag = KingdomMapItem.readData(stack);
                if (tag != null && tag.contains("Kingdoms")) {
                    return tag;
                }
            }
        }
        return null;
    }
}

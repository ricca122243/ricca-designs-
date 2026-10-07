package com.ricca.civilizations.kingdom;

import com.ricca.civilizations.Civilizations;
import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.LongTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.saveddata.SavedData;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Список всех ратуш в мире. Нужен для территорий, карты и соседей-королевств. */
public class KingdomSavedData extends SavedData {
    private static final String NAME = "civilizations_kingdoms";

    private final Set<BlockPos> halls = new LinkedHashSet<>();
    private boolean npcSpawned = false;
    /** Отношения между королевствами, ключ «A|B» (по алфавиту), от −100 до 100. */
    private final Map<String, Integer> relations = new HashMap<>();

    /** Деревни-данники: позиция деревни → королевство-хозяин. */
    private final Map<Long, String> villageOwners = new HashMap<>();

    @javax.annotation.Nullable
    public String villageOwner(BlockPos village) {
        return villageOwners.get(village.asLong());
    }

    public void setVillageOwner(BlockPos village, String owner) {
        villageOwners.put(village.asLong(), owner);
        setDirty();
    }

    public int villagesOwnedBy(String kingdom) {
        int n = 0;
        for (String o : villageOwners.values()) if (o.equals(kingdom)) n++;
        return n;
    }

    public static final int DEFAULT_RELATION = -20;
    public static final int ALLY_THRESHOLD = 50;
    public static final int WAR_THRESHOLD = -40;

    private static String key(String a, String b) {
        return a.compareTo(b) <= 0 ? a + "|" + b : b + "|" + a;
    }

    public int relation(String a, String b) {
        if (a.isEmpty() || b.isEmpty()) return 0;
        if (a.equals(b)) return 100;
        return relations.getOrDefault(key(a, b), DEFAULT_RELATION);
    }

    public int adjustRelation(String a, String b, int delta) {
        if (a.isEmpty() || b.isEmpty() || a.equals(b)) return 0;
        int value = Math.max(-100, Math.min(100, relation(a, b) + delta));
        relations.put(key(a, b), value);
        setDirty();
        return value;
    }

    public boolean allied(String a, String b) {
        return !a.equals(b) && relation(a, b) >= ALLY_THRESHOLD;
    }

    public boolean atWar(String a, String b) {
        return !a.equals(b) && relation(a, b) <= WAR_THRESHOLD;
    }

    public static KingdomSavedData get(ServerLevel level) {
        return level.getDataStorage().computeIfAbsent(
                new SavedData.Factory<>(KingdomSavedData::new, KingdomSavedData::load, null), NAME);
    }

    public KingdomSavedData() {}

    private static KingdomSavedData load(CompoundTag tag, HolderLookup.Provider registries) {
        KingdomSavedData data = new KingdomSavedData();
        ListTag list = tag.getList("Halls", Tag.TAG_LONG);
        for (Tag t : list) {
            if (t instanceof LongTag longTag) {
                data.halls.add(BlockPos.of(longTag.getAsLong()));
            }
        }
        data.npcSpawned = tag.getBoolean("NpcSpawned");
        CompoundTag rel = tag.getCompound("Relations");
        for (String k : rel.getAllKeys()) {
            data.relations.put(k, rel.getInt(k));
        }
        CompoundTag vil = tag.getCompound("Villages");
        for (String k : vil.getAllKeys()) {
            data.villageOwners.put(Long.parseLong(k), vil.getString(k));
        }
        return data;
    }

    public boolean isNpcSpawned() {
        return npcSpawned;
    }

    public void setNpcSpawned(boolean value) {
        npcSpawned = value;
        setDirty();
    }

    @Override
    public CompoundTag save(CompoundTag tag, HolderLookup.Provider registries) {
        ListTag list = new ListTag();
        for (BlockPos pos : halls) {
            list.add(LongTag.valueOf(pos.asLong()));
        }
        tag.put("Halls", list);
        tag.putBoolean("NpcSpawned", npcSpawned);
        CompoundTag rel = new CompoundTag();
        for (Map.Entry<String, Integer> e : relations.entrySet()) {
            rel.putInt(e.getKey(), e.getValue());
        }
        tag.put("Relations", rel);
        CompoundTag vil = new CompoundTag();
        for (Map.Entry<Long, String> e : villageOwners.entrySet()) {
            vil.putString(Long.toString(e.getKey()), e.getValue());
        }
        tag.put("Villages", vil);
        return tag;
    }

    public void add(BlockPos pos) {
        if (halls.add(pos.immutable())) {
            setDirty();
        }
    }

    public void remove(BlockPos pos) {
        if (halls.remove(pos)) {
            setDirty();
        }
    }

    /** Все ратуши; те, что сломаны (в загруженных чанках), вычищаются. */
    public List<BlockPos> halls(ServerLevel level) {
        List<BlockPos> result = new ArrayList<>();
        List<BlockPos> stale = new ArrayList<>();
        for (BlockPos pos : halls) {
            if (level.isLoaded(pos) && !level.getBlockState(pos).is(Civilizations.TOWN_HALL.get())) {
                stale.add(pos);
            } else {
                result.add(pos);
            }
        }
        for (BlockPos pos : stale) {
            remove(pos);
        }
        return result;
    }
}

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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Список всех ратуш в мире. Нужен для территорий, карты и соседей-королевств. */
public class KingdomSavedData extends SavedData {
    private static final String NAME = "civilizations_kingdoms";

    private final Set<BlockPos> halls = new LinkedHashSet<>();
    private boolean npcSpawned = false;

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

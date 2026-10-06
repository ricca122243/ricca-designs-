package com.ricca.civilizations;

import com.mojang.logging.LogUtils;
import com.ricca.civilizations.block.TownHallBlock;
import com.ricca.civilizations.block.TownHallBlockEntity;
import com.ricca.civilizations.entity.SettlerEntity;
import com.ricca.civilizations.item.CommandStaffItem;
import com.ricca.civilizations.item.KingdomCharterItem;
import com.ricca.civilizations.kingdom.TerritoryHandler;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.item.SwordItem;
import net.minecraft.world.item.Tiers;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.common.DeferredSpawnEggItem;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.EntityAttributeCreationEvent;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import org.slf4j.Logger;

/**
 * Главный класс мода. Здесь регистрируется всё, что мод добавляет в игру:
 * блоки, предметы, существа и вкладка в творческом инвентаре.
 */
@Mod(Civilizations.MODID)
public class Civilizations {
    public static final String MODID = "civilizations";
    public static final Logger LOGGER = LogUtils.getLogger();

    public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks(MODID);
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(MODID);
    public static final DeferredRegister<EntityType<?>> ENTITIES = DeferredRegister.create(Registries.ENTITY_TYPE, MODID);
    public static final DeferredRegister<BlockEntityType<?>> BLOCK_ENTITIES = DeferredRegister.create(Registries.BLOCK_ENTITY_TYPE, MODID);
    public static final DeferredRegister<CreativeModeTab> TABS = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, MODID);

    // --- Блоки ---

    /** Ратуша: сердце королевства. Вокруг неё поселенцы строят дома. */
    public static final DeferredBlock<TownHallBlock> TOWN_HALL = BLOCKS.registerBlock("town_hall",
            TownHallBlock::new,
            BlockBehaviour.Properties.of()
                    .mapColor(MapColor.GOLD)
                    .strength(3.0f, 6.0f)
                    .lightLevel(state -> 10)
                    .requiresCorrectToolForDrops());
    public static final DeferredItem<BlockItem> TOWN_HALL_ITEM = ITEMS.registerSimpleBlockItem("town_hall", TOWN_HALL);

    /** Хранилище данных королевства внутри блока ратуши. */
    public static final DeferredHolder<BlockEntityType<?>, BlockEntityType<TownHallBlockEntity>> TOWN_HALL_BE = BLOCK_ENTITIES.register("town_hall",
            () -> BlockEntityType.Builder.of(TownHallBlockEntity::new, TOWN_HALL.get()).build(null));

    // --- Предметы ---

    /** Королевская грамота: кликните по земле, чтобы основать королевство. */
    public static final DeferredItem<Item> KINGDOM_CHARTER = ITEMS.registerItem("kingdom_charter",
            KingdomCharterItem::new,
            new Item.Properties().stacksTo(1).rarity(Rarity.RARE));

    /** Жезл командира: управление жителями. */
    public static final DeferredItem<Item> COMMAND_STAFF = ITEMS.registerItem("command_staff",
            CommandStaffItem::new,
            new Item.Properties().stacksTo(1).rarity(Rarity.UNCOMMON));

    /** Рыцарский меч: чуть сильнее железного. */
    public static final DeferredItem<SwordItem> KNIGHT_SWORD = ITEMS.registerItem("knight_sword",
            props -> new SwordItem(Tiers.IRON, props.attributes(SwordItem.createAttributes(Tiers.IRON, 5, -2.2f))),
            new Item.Properties());

    // --- Существа ---

    /** Поселенец: житель королевства, который сам строит дома. */
    public static final DeferredHolder<EntityType<?>, EntityType<SettlerEntity>> SETTLER = ENTITIES.register("settler",
            () -> EntityType.Builder.of(SettlerEntity::new, MobCategory.CREATURE)
                    .sized(0.6f, 1.95f)
                    .build(ResourceLocation.fromNamespaceAndPath(MODID, "settler").toString()));

    public static final DeferredItem<Item> SETTLER_SPAWN_EGG = ITEMS.registerItem("settler_spawn_egg",
            props -> new DeferredSpawnEggItem(SETTLER, 0x6B4F2A, 0xC8A060, props),
            new Item.Properties());

    // --- Вкладка в творческом инвентаре ---

    public static final DeferredHolder<CreativeModeTab, CreativeModeTab> TAB = TABS.register("civilizations",
            () -> CreativeModeTab.builder()
                    .title(Component.translatable("itemGroup.civilizations"))
                    .withTabsBefore(CreativeModeTabs.COMBAT)
                    .icon(() -> KINGDOM_CHARTER.get().getDefaultInstance())
                    .displayItems((parameters, output) -> {
                        output.accept(KINGDOM_CHARTER.get());
                        output.accept(COMMAND_STAFF.get());
                        output.accept(TOWN_HALL_ITEM.get());
                        output.accept(KNIGHT_SWORD.get());
                        output.accept(SETTLER_SPAWN_EGG.get());
                    })
                    .build());

    public Civilizations(IEventBus modEventBus, ModContainer modContainer) {
        BLOCKS.register(modEventBus);
        ITEMS.register(modEventBus);
        ENTITIES.register(modEventBus);
        BLOCK_ENTITIES.register(modEventBus);
        TABS.register(modEventBus);

        modEventBus.addListener(this::registerAttributes);
        NeoForge.EVENT_BUS.register(new TerritoryHandler());
        LOGGER.info("Civilizations loaded. Long live the kingdom!");
    }

    /** Характеристики поселенца: здоровье, скорость и т.д. */
    private void registerAttributes(EntityAttributeCreationEvent event) {
        event.put(SETTLER.get(), SettlerEntity.createAttributes().build());
    }
}

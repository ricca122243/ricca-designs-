package com.ricca.civilizations;

import com.mojang.logging.LogUtils;
import com.ricca.civilizations.block.CatapultBlock;
import com.ricca.civilizations.block.CatapultBlockEntity;
import com.ricca.civilizations.block.TownHallBlock;
import com.ricca.civilizations.block.TownHallBlockEntity;
import com.ricca.civilizations.entity.BanditEntity;
import com.ricca.civilizations.entity.BoulderEntity;
import com.ricca.civilizations.entity.SettlerEntity;
import com.ricca.civilizations.item.CommandStaffItem;
import com.ricca.civilizations.item.KingdomCharterItem;
import com.ricca.civilizations.item.KingdomMapItem;
import com.ricca.civilizations.item.MithrilTier;
import com.ricca.civilizations.item.RulerBookItem;
import com.ricca.civilizations.kingdom.KingdomCommands;
import com.ricca.civilizations.kingdom.NpcKingdomSpawner;
import com.ricca.civilizations.kingdom.TerritoryHandler;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.monster.Pillager;
import net.minecraft.Util;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.ArmorMaterial;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.crafting.Ingredient;
import net.minecraft.world.level.block.DropExperienceBlock;
import net.minecraft.util.valueproviders.UniformInt;
import java.util.EnumMap;
import java.util.List;
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
    public static final DeferredRegister<ArmorMaterial> ARMOR_MATERIALS = DeferredRegister.create(Registries.ARMOR_MATERIAL, MODID);

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

    /** Катапульта. */
    public static final DeferredBlock<CatapultBlock> CATAPULT = BLOCKS.registerBlock("catapult",
            CatapultBlock::new,
            BlockBehaviour.Properties.of().mapColor(MapColor.WOOD).strength(2.5f).noOcclusion());
    public static final DeferredItem<BlockItem> CATAPULT_ITEM = ITEMS.registerSimpleBlockItem("catapult", CATAPULT);
    public static final DeferredHolder<BlockEntityType<?>, BlockEntityType<CatapultBlockEntity>> CATAPULT_BE = BLOCK_ENTITIES.register("catapult",
            () -> BlockEntityType.Builder.of(CatapultBlockEntity::new, CATAPULT.get()).build(null));

    /** Мифриловая руда: новая руда для лучшей брони и оружия. */
    public static final DeferredBlock<Block> MITHRIL_ORE = BLOCKS.registerBlock("mithril_ore",
            props -> new DropExperienceBlock(UniformInt.of(2, 5), props),
            BlockBehaviour.Properties.of().mapColor(MapColor.STONE).strength(3.5f, 3.0f).requiresCorrectToolForDrops());
    public static final DeferredItem<BlockItem> MITHRIL_ORE_ITEM = ITEMS.registerSimpleBlockItem("mithril_ore", MITHRIL_ORE);
    public static final DeferredItem<Item> RAW_MITHRIL = ITEMS.registerSimpleItem("raw_mithril");
    public static final DeferredItem<Item> MITHRIL_INGOT = ITEMS.registerSimpleItem("mithril_ingot");

    public static final DeferredHolder<ArmorMaterial, ArmorMaterial> MITHRIL_MATERIAL = ARMOR_MATERIALS.register("mithril",
            () -> new ArmorMaterial(
                    Util.make(new EnumMap<>(ArmorItem.Type.class), map -> {
                        map.put(ArmorItem.Type.BOOTS, 3);
                        map.put(ArmorItem.Type.LEGGINGS, 6);
                        map.put(ArmorItem.Type.CHESTPLATE, 8);
                        map.put(ArmorItem.Type.HELMET, 3);
                        map.put(ArmorItem.Type.BODY, 11);
                    }),
                    18,
                    SoundEvents.ARMOR_EQUIP_DIAMOND,
                    () -> Ingredient.of(MITHRIL_INGOT.get()),
                    List.of(new ArmorMaterial.Layer(ResourceLocation.fromNamespaceAndPath(MODID, "mithril"))),
                    2.0f,
                    0.05f));

    public static final DeferredItem<ArmorItem> MITHRIL_HELMET = ITEMS.registerItem("mithril_helmet",
            props -> new ArmorItem(MITHRIL_MATERIAL, ArmorItem.Type.HELMET, props),
            new Item.Properties().durability(ArmorItem.Type.HELMET.getDurability(30)));
    public static final DeferredItem<ArmorItem> MITHRIL_CHESTPLATE = ITEMS.registerItem("mithril_chestplate",
            props -> new ArmorItem(MITHRIL_MATERIAL, ArmorItem.Type.CHESTPLATE, props),
            new Item.Properties().durability(ArmorItem.Type.CHESTPLATE.getDurability(30)));
    public static final DeferredItem<ArmorItem> MITHRIL_LEGGINGS = ITEMS.registerItem("mithril_leggings",
            props -> new ArmorItem(MITHRIL_MATERIAL, ArmorItem.Type.LEGGINGS, props),
            new Item.Properties().durability(ArmorItem.Type.LEGGINGS.getDurability(30)));
    public static final DeferredItem<ArmorItem> MITHRIL_BOOTS = ITEMS.registerItem("mithril_boots",
            props -> new ArmorItem(MITHRIL_MATERIAL, ArmorItem.Type.BOOTS, props),
            new Item.Properties().durability(ArmorItem.Type.BOOTS.getDurability(30)));
    public static final DeferredItem<SwordItem> MITHRIL_SWORD = ITEMS.registerItem("mithril_sword",
            props -> new SwordItem(MithrilTier.INSTANCE, props.attributes(SwordItem.createAttributes(MithrilTier.INSTANCE, 3, -2.2f))),
            new Item.Properties());

    /** Камень катапульты. */
    public static final DeferredHolder<EntityType<?>, EntityType<BoulderEntity>> BOULDER = ENTITIES.register("boulder",
            () -> EntityType.Builder.<BoulderEntity>of(BoulderEntity::new, MobCategory.MISC)
                    .sized(0.5f, 0.5f)
                    .clientTrackingRange(4)
                    .updateInterval(10)
                    .build(ResourceLocation.fromNamespaceAndPath(MODID, "boulder").toString()));

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

    /** Книга правителя: управление королевством без команд. */
    public static final DeferredItem<Item> RULER_BOOK = ITEMS.registerItem("ruler_book",
            RulerBookItem::new,
            new Item.Properties().stacksTo(1).rarity(Rarity.UNCOMMON));

    /** Карта земель: показывает все королевства. */
    public static final DeferredItem<Item> KINGDOM_MAP = ITEMS.registerItem("kingdom_map",
            KingdomMapItem::new,
            new Item.Properties().stacksTo(1));

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

    /** Разбойник: налётчик, нападающий на королевства. */
    public static final DeferredHolder<EntityType<?>, EntityType<BanditEntity>> BANDIT = ENTITIES.register("bandit",
            () -> EntityType.Builder.of(BanditEntity::new, MobCategory.MONSTER)
                    .sized(0.6f, 1.95f)
                    .build(ResourceLocation.fromNamespaceAndPath(MODID, "bandit").toString()));

    public static final DeferredItem<Item> BANDIT_SPAWN_EGG = ITEMS.registerItem("bandit_spawn_egg",
            props -> new DeferredSpawnEggItem(BANDIT, 0x4A3B2A, 0x8A8A8A, props),
            new Item.Properties());

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
                        output.accept(KINGDOM_MAP.get());
                        output.accept(RULER_BOOK.get());
                        output.accept(TOWN_HALL_ITEM.get());
                        output.accept(KNIGHT_SWORD.get());
                        output.accept(CATAPULT_ITEM.get());
                        output.accept(MITHRIL_ORE_ITEM.get());
                        output.accept(RAW_MITHRIL.get());
                        output.accept(MITHRIL_INGOT.get());
                        output.accept(MITHRIL_SWORD.get());
                        output.accept(MITHRIL_HELMET.get());
                        output.accept(MITHRIL_CHESTPLATE.get());
                        output.accept(MITHRIL_LEGGINGS.get());
                        output.accept(MITHRIL_BOOTS.get());
                        output.accept(SETTLER_SPAWN_EGG.get());
                        output.accept(BANDIT_SPAWN_EGG.get());
                    })
                    .build());

    public Civilizations(IEventBus modEventBus, ModContainer modContainer) {
        BLOCKS.register(modEventBus);
        ITEMS.register(modEventBus);
        ENTITIES.register(modEventBus);
        BLOCK_ENTITIES.register(modEventBus);
        ARMOR_MATERIALS.register(modEventBus);
        TABS.register(modEventBus);

        modEventBus.addListener(this::registerAttributes);
        NeoForge.EVENT_BUS.register(new TerritoryHandler());
        NeoForge.EVENT_BUS.register(new NpcKingdomSpawner());
        NeoForge.EVENT_BUS.register(new KingdomCommands());
        LOGGER.info("Civilizations loaded. Long live the kingdom!");
    }

    /** Характеристики поселенца: здоровье, скорость и т.д. */
    private void registerAttributes(EntityAttributeCreationEvent event) {
        event.put(SETTLER.get(), SettlerEntity.createAttributes().build());
        event.put(BANDIT.get(), Pillager.createAttributes().build());
    }
}

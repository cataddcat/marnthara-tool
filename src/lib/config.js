// src/lib/config.js
// --- CONFIGURATION & CONSTANTS ---
export const APP_VERSION = "vite-refactor/6.2.0"; // Updated Version
export const WEBHOOK_URL = "https://your-make-webhook-url.com/your-unique-path";
export const STORAGE_KEY = "marnthara.input.v6.1";

// [NEW] Key for storing shop config locally and securely
export const SHOP_CONFIG_KEY = "marnthara.shop.config.v1";

export const PDF_EXPORT_DELAY_MS = 500;

// [NEW] Default (empty) structure for the Shop Config.
// This is used if nothing is found in local storage.
export const DEFAULT_SHOP_CONFIG = {
    name: "",
    address: "",
    phone: "",
    taxId: "", // This is used for email in your documents
    logoUrl: "",
    baseVatRate: 0.07,
    pdf: {
        paymentTerms: "ชำระมัดจำ 50%",
        priceValidity: "30 วัน",
        notes: ["- ข้อความที่ต้องการ"],
    },
};

export const SQM_TO_SQYD = 1.19599;

export const WALLPAPER_SPECS = {
    ROLL_WIDTH_M: 0.53,
    ROLL_LENGTH_M: 10,
    STRIPS_PER_ROLL_UNDER_2_5M: 3,
};

export const PRICING = {
    // เพิ่มราคาผ้าทึบไปจนถึง 3,000
    fabric: [
        1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100,
        2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000,
    ],
    sheer: [1000, 1100, 1200, 1300, 1400, 1500],
    // Added price range for Louis curtains
    louis: [
        2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300,
        3400, 3500,
    ],
    // Added ม่านแป๊บ surcharge
    style_surcharge: {
        ลอน: 0,
        ตาไก่: 0,
        จีบ: 0,
        ม่านพับ: 0,
        ม่านแป๊บ: 0,
        หลุยส์: 0,
    },
};

// [MODIFIED] Added ITEM_CONFIG for central management, Louis, and Custom
export const ITEM_CONFIG = {
    set: { templateId: "#setTpl", name: "ผ้าม่าน" },
    wallpaper: { templateId: "#wallpaperTpl", name: "วอลล์เปเปอร์" },
    wooden_blind: { templateId: "#areaBasedTpl", name: "มู่ลี่ไม้" },
    roller_blind: { templateId: "#areaBasedTpl", name: "ม่านม้วน" },
    vertical_blind: { templateId: "#areaBasedTpl", name: "ม่านปรับแสง" },
    partition: { templateId: "#areaBasedTpl", name: "ฉากกั้นห้อง" },
    pleated_screen: { templateId: "#areaBasedTpl", name: "มุ้งจีบ" },
    removal: { templateId: "#removalTpl", name: "รื้อถอน" },
    aluminum_blind: { templateId: "#areaBasedTpl", name: "มู่ลี่อลูมิเนียม" },
    custom: { templateId: "#customItemTpl", name: "รายการอื่นๆ" }, // [NEW] รายการอิสระ
};

/**
 * Single source of truth for all hardware/color fields on a curtain set.
 * - name:      input[name] on the item element (hidden field in #setTpl)
 * - modalName: input[name] inside #hardwareModal
 * - groupId:   ID of the visibility wrapper div inside #hardwareModal
 * - default:   fallback value when no data is present
 * - showFor:   array of set_style values that should show this group, or null = always visible
 */
export const HARDWARE_FIELDS = [
    {
        name: "track_color",
        modalName: "modal_track_color",
        groupId: "trackColorGroup",
        default: "ขาว",
        showFor: null,
    },
    {
        name: "bracket_color",
        modalName: "modal_bracket_color",
        groupId: "bracketColorGroup",
        default: "ขาว",
        showFor: null,
    },
    {
        name: "finial_color",
        modalName: "modal_finial_color",
        groupId: "finialColorGroup",
        default: "ขาว",
        showFor: ["ตาไก่"],
    },
    {
        name: "grommet_color",
        modalName: "modal_grommet_color",
        groupId: "grommetColorGroup",
        default: "เงิน",
        showFor: ["ตาไก่"],
    },
    {
        name: "louis_valance",
        modalName: "modal_louis_valance",
        groupId: "louisValanceGroup",
        default: "กล่องหลุยส์",
        showFor: ["หลุยส์"],
    },
    {
        name: "louis_tassels",
        modalName: "modal_louis_tassels",
        groupId: "louisTasselGroup",
        default: "สีเข้ากับผ้า",
        showFor: ["หลุยส์"],
    },
];

/** Convenience lookup: { track_color: "ขาว", grommet_color: "เงิน", … } */
export const HARDWARE_DEFAULTS = Object.fromEntries(
    HARDWARE_FIELDS.map((f) => [f.name, f.default])
);

export const SELECTORS = {
    // --- App ---
    orderForm: "#orderForm",
    roomsContainer: "#rooms",
    toastContainer: "#toast-container",
    printableContent: "#printable-content",
    filterStatusBar: "#filterStatusBar",

    // --- Header ---
    menuBtn: "#menuBtn",
    menuDropdown: "#menuDropdown",
    shopSettingsBtn: "#shopSettingsBtn",
    undoBtn: "#undoBtn",
    themeToggleBtn: "#themeToggleBtn",
    overviewBtn: "#overviewBtn",
    copyTextBtn: "#copyTextBtn",
    visualReportsBtn: "#visualReportsBtn",
    exportPdfBtn: "#exportPdfBtn",
    exportReceiptBtn: "#exportReceiptBtn",
    submitBtn: "#submitBtn",
    importBtn: "#importBtn",
    exportBtn: "#exportBtn",
    importFavsBtn: "#importFavsBtn",
    exportFavsBtn: "#exportFavsBtn",
    clearItemsBtn: "#clearItemsBtn",
    clearAllBtn: "#clearAllBtn",

    // --- Footer ---
    lockBtn: "#lockBtn",
    quickNavBtn: "#quickNavBtn",
    quickNavDropdown: "#quickNavDropdown",
    quickNavRoomList: "#quickNavRoomList",
    quickNavBtnText: "#quickNavBtnText",
    toggleAllRoomsBtn: "#toggleAllRoomsBtn",
    suspendedItemsBtn: "#suspendedItemsBtn",
    suspendedCountBadge: "#suspendedCountBadge",
    originalTotal: "#originalTotal",
    grandTotal: "#grandTotal",

    // --- File Importers ---
    fileImporter: "#fileImporter",
    favImporter: "#favImporter",

    // --- Customer Modal ---
    customerModal: "#customerModal",
    customerInfoBtn: "#customerInfoBtn",
    customerNameInput: "#customer_name",
    customerPhoneInput: "#customer_phone",
    customerAddressInput: "#customer_address",
    quoteDateInput: "#quote_date",

    // --- Room Card ---
    room: ".room-card",
    roomTpl: "#roomTpl",
    roomNameInput: 'input[name="room_name"]',
    roomNameDisplay: "[data-room-name-display]",
    roomBrief: "[data-room-brief]",
    allItemsContainer: "[data-all-items]",

    // --- Item Card ---
    itemCard: ".item-card",
    itemDetailsMore: ".item-details-more",
    itemGrid: ".item-grid",
    itemTitle: "[data-item-title]",
    toggleDetailsBtn: '[data-act="toggle-more-details"]',

    // --- Set Item (from #setTpl) ---
    setTpl: "#setTpl",
    setWidthInput: 'input[name="width_m"]',
    setHeightInput: 'input[name="height_m"]',
    setStyleSelect: 'select[name="set_style"]',
    setFabricVariantSelect: 'select[name="fabric_variant"]',
    setPricePerMSelect: 'select[name="set_price_per_m"]',
    setSheerPricePerMSelect: 'select[name="sheer_price_per_m"]',
    setLouisPricePerMSelect: 'select[name="louis_price_per_m"]',
    setFabricCodeInput: 'input[name="fabric_code"]',
    setSheerCodeInput: 'input[name="sheer_fabric_code"]',
    setOpeningStyleSelect: 'select[name="opening_style"]',
    setAdjustmentSideSelect: 'select[name="adjustment_side"]',
    setTrackColorInput: 'input[name="track_color"]',
    setBracketColorInput: 'input[name="bracket_color"]',
    setFinialColorInput: 'input[name="finial_color"]',
    setGrommetColorInput: 'input[name="grommet_color"]',
    setLouisValanceInput: 'input[name="louis_valance"]',
    setLouisTasselsInput: 'input[name="louis_tassels"]',
    setNotesInput: '[name="notes"]',

    // --- Wallpaper Item (from #wallpaperTpl) ---
    wallpaperTpl: "#wallpaperTpl",
    wallTpl: "#wallTpl",
    wallHeightInput: '[name="wallpaper_height_m"]',
    wallCodeInput: '[name="wallpaper_code"]',
    wallPriceRollInput: '[name="wallpaper_price_roll"]',
    wallInstallCostInput: '[name="wallpaper_install_cost"]',
    wallNotesInput: '[name="notes"]',
    wallWidthInput: '[name="wall_width_m"]',

    // --- Area-Based Item & Custom Items ---
    areaBasedTpl: "#areaBasedTpl",
    removalTpl: "#removalTpl",
    customItemTpl: "#customItemTpl", // [NEW] Custom Template
    areaBasedItem: ".area-based-item",
    customItem: ".custom-item", // [NEW] Custom Class
    areaWidthInput: '[name="area_width_m"]',
    areaHeightInput: '[name="area_height_m"]',
    areaPriceSqydInput: '[name="area_price_sqyd"]',
    areaCodeInput: '[name="area_code"]',
    areaNotesInput: '[name="notes"]',

    // --- Modals (General) ---
    modal: "#confirmationModal",
    modalTitle: "#modalTitle",
    modalBody: "#modalBody",

    // --- Discount Modal ---
    discountModal: "#discountModal",
    discountSubtotal: "#discountSubtotal",
    discountPercent: "#discountPercent",
    discountAmount: "#discountAmount",
    discountFinalTotal: "#discountFinalTotal",
    discountTypeInput: "#discount_type",
    discountValueInput: "#discount_value",

    // --- Copy Options Modal ---
    copyOptionsModal: "#copyOptionsModal",

    // --- Look Book Modal ---
    lookbookModal: "#lookbookModal",
    lookbookModalBody: "#lookbookModalBody",

    // --- Export Options Modal ---
    exportOptionsModal: "#exportOptionsModal",
    receiptOptionsModal: "#receiptOptionsModal",
    signatureModal: "#signatureModal",

    // --- Item Type Modal ---
    itemTypeModal: "#itemTypeModal",
    itemTypeModalTitle: "#itemTypeModalTitle",

    // --- Hardware Modal ---
    hardwareModal: "#hardwareModal",
    modalTrackColor: '[name="modal_track_color"]',
    modalBracketColor: '[name="modal_bracket_color"]',
    modalFinialColor: '[name="modal_finial_color"]',
    modalGrommetColor: '[name="modal_grommet_color"]',
    modalLouisValance: '[name="modal_louis_valance"]',
    modalLouisTassels: '[name="modal_louis_tassels"]',
    trackColorGroup: "#trackColorGroup",
    bracketColorGroup: "#bracketColorGroup",
    finialColorGroup: "#finialColorGroup",
    grommetColorGroup: "#grommetColorGroup",
    louisValanceGroup: "#louisValanceGroup",
    louisTasselGroup: "#louisTasselGroup",
    hardwareApplyToRoomBtn: "#hardwareApplyToRoom",

    // --- Favorites Conflict Modal ---
    favoritesConflictModal: "#favoritesConflictModal",

    // --- Favorites Selector Modal ---
    favoritesModal: "#favoritesModal",
    favoritesModalTitle: "#favoritesModalTitle",
    favoritesModalBody: "#favoritesModalBody",
    favSearchInput: "#favSearchInput",
    favSelectorItemTpl: "#favSelectorItemTpl",
    favInput: "input[data-favorite-type]",

    // --- Favorites Manager Modal ---
    favManagerModal: "#favManagerModal",
    favManagerTitle: "#favManagerTitle",
    favManagerBody: "#favManagerBody",
    favManagerItemTpl: "#favManagerItemTpl",
    favManagerEditBtn: '#favManagerModal [data-act="edit-selected-fav"]',
    favManagerDelBtn: '#favManagerModal [data-act="del-selected-fav"]',
    favAddModal: "#favAddModal",
    favAddCodeInput: '[name="fav_code_add"]',
    favAddPriceInput: '[name="fav_price_add"]',
    favEditModal: "#favEditModal",
    favEditCodeInput: '[name="fav_code_edit"]',
    favEditPriceInput: '[name="fav_price_edit"]',

    // --- Overview Modal ---
    overviewModal: "#overviewModal",
    overviewModalHeader: "#overviewModalHeader",
    overviewModalBody: "#overviewModalBody",

    // --- Shop Settings Modal ---
    shopSettingsModal: "#shopSettingsModal",
    shopSettingsForm: "#shopSettingsForm",
    shopSettingsSaveBtn: '#shopSettingsModal [data-act="save-shop-config"]',
};

"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Language = "zh" | "en";

const LANGUAGE_STORAGE_KEY = "ckb-ugmp:language";

const translations = {
  zh: {
    languageName: "中文",
    languageSwitch: "English",
    heroBadge: "CKB Digital Object Minting",
    heroTitle: "一键创建你的 DOB",
    heroDescription:
      "上传一张图片，连接钱包，确认费用后把它铸造成 CKB 上的 Spore / DOB 数字物件。这个页面面向终端用户，不要求理解存储协议、metadata 或交易结构。",
    howItWorks: "How It Works",
    homeStep1: "1. 选择图片，系统自动保存资源并生成铸造信息。",
    homeStep2: "2. 连接钱包，用户自行确认并支付测试网铸造费用。",
    homeStep3: "3. 铸造后在展示大厅查看图片和链上交易状态。",
    feeHint:
      "费用提示：图片本体不会直接写入链上，系统只保存必要引用，尽量降低链上空间成本。",
    openGallery: "打开展示大厅",
    wallet: "Wallet",
    connectWalletTitle: "连接钱包",
    walletDescription:
      "连接钱包后可以读取余额、确认网络，并在铸造时由你亲自签名。当前默认使用 CKB Testnet。",
    connectWallet: "连接钱包",
    switchWallet: "查看或切换钱包",
    waitingConnection: "等待连接",
    waitingRead: "等待读取",
    walletReadFailed: "钱包状态读取失败：",
    mintStudio: "Mint Studio",
    createDob: "创建新的 DOB",
    simplePath: "简化路径：选图 → 上传 → 预览 → 签名铸造",
    step01: "Step 01",
    chooseImageTitle: "选择要铸造的图片",
    chooseImage: "选择图片",
    noFileSelected: "尚未选择文件",
    imageLimit: "支持图片文件，单文件不超过 10 MB。图片会以原图上传，链上只保存必要引用。",
    step02: "Step 02",
    costFriendlyStorage: "费用友好的保存方式",
    storageLabel: "省钱模式：图片存到 IPFS",
    storageDescription: "系统会保存原图到 IPFS，只把必要引用用于铸造，避免把大图片直接写入链上。",
    storageNote: "当前版本默认使用最适合图片铸造的省钱模式。其他保存方式后续会放到高级设置中。",
    step03: "Step 03",
    uploadToIpfs: "上传到 IPFS",
    uploading: "上传中...",
    uploadToPinata: "上传至 Pinata",
    preview: "Preview",
    confirmBeforeMint: "铸造前确认",
    name: "Name",
    image: "Image",
    estimatedOnChainData: "Estimated On-chain Data",
    onChainDataHint: "只写入图片引用和基础信息；图片本体已保存在 IPFS，不直接写入链上。",
    previewEmpty: "上传图片后会在这里生成铸造预览。",
    hideAdvanced: "隐藏高级详情",
    showAdvanced: "查看高级详情",
    downloadJson: "下载技术详情 JSON",
    mintStatus: "铸造状态",
    connectBeforeMint: "连接钱包后可发起测试网铸造。签名前请确认钱包显示的费用。",
    buildTx: "构造交易中...",
    waitingSignature: "等待钱包签名...",
    mintDob: "确认并铸造 DOB",
    dryRun: "先预览结果（不产生链上费用）",
    dryRunHint: "预览模式只生成本地模拟记录，不会发起钱包签名，也不会写入 CKB。正式铸造需要支付测试网交易费用。",
    dryRunLocalOnly: "Dry-run 结果仅保存在本地，不能在 explorer 查询。",
    openExplorer: "在 Nervos Explorer 查看",
    assetLookup: "Asset Lookup",
    viewCreatedDob: "查看已创建的 DOB",
    lookupDescription:
      "输入 CID、Spore ID 或 tx hash，可以从本地记录中找回资产；真实 tx hash 可跳转到测试网浏览器查看链上状态。",
    openExplorerShort: "打开 Explorer",
    searchPlaceholder: "搜索 CID / 0x tx hash / Spore ID",
    noLookupMatch: "本地历史中没有匹配记录。若这是一个真实链上 tx hash，可以打开 Explorer 查看链上状态。",
    load: "载入",
    myDrafts: "My Drafts",
    myCreationRecords: "我的创建记录",
    importHistory: "导入历史",
    exportHistory: "导出历史",
    clearHistory: "清空历史",
    historyEmpty: "上传成功后会自动保存 CID、metadata 和后续 tx hash，刷新页面后仍可查看。",
    historyCleared: "历史记录已清空。",
    noValidHistory: "没有找到有效的历史记录。",
    importFailed: "导入失败，请检查 JSON 文件。",
    needWalletAndUpload: "请先连接钱包并完成上传。",
    needUploadMetadata: "请先完成上传并生成 metadata。",
    galleryBadge: "My DOB Collection",
    galleryTitle: "我的 DOB 展示大厅",
    galleryDescription:
      "查看你已经创建或预览过的数字物件。输入链上交易哈希时，系统会直接查询 CKB testnet 并展示交易状态。",
    collection: "Collection",
    galleryStep1: "1. 浏览本机创建过的 DOB 草稿和铸造记录。",
    galleryStep2: "2. 输入 tx hash 查询链上交易状态。",
    galleryStep3: "3. 区分预览记录和真实已提交记录。",
    galleryNote: "正式铸造的资产会逐步进入链上资产视图；预览记录只保存在本地浏览器。",
    entry: "Entry",
    assetEntry: "资产入口",
    entryHome: "回到首页可以继续创建新的 DOB。",
    entryGallery: "展示大厅用于查看你的创建记录和链上状态。",
    entryFuture: "后续会继续补充 Spore / DOB 的链上内容解析。",
    myDob: "我的 DOB",
    galleryIntro: "这里集中展示你的创建记录。预览记录只保存在本地，真实交易可以通过 tx hash 查询链上状态。",
    continueCreate: "继续创建",
    gallerySearchPlaceholder: "搜索 CID / Spore ID / tx hash",
    chainLoading: "正在查询链上交易...",
    chainErrorPrefix: "链上查询失败：",
    chainStatus: "链上状态",
    myRecords: "我的记录",
    currentShown: "当前显示",
    noGalleryMatch: "没有匹配记录。先回到首页创建或预览一个 DOB，再回到这里查看。",
    openImage: "打开图片",
    viewTransaction: "查看交易",
    localSimulation: "本地模拟",
    notMinted: "未铸造",
    dryRunLocalResult: "dry-run 仅为本地模拟结果。",
    statusUploaded: "uploaded",
    statusDryRun: "dry-run",
    statusMinted: "minted",
    statusAll: "all",
    statusReal: "real",
  },
  en: {
    languageName: "English",
    languageSwitch: "中文",
    heroBadge: "CKB Digital Object Minting",
    heroTitle: "Create Your DOB in One Flow",
    heroDescription:
      "Upload an image, connect a wallet, review the cost, and mint it as a Spore / DOB digital object on CKB. The flow is designed for end users, not protocol specialists.",
    howItWorks: "How It Works",
    homeStep1: "1. Choose an image. The app stores the resource and prepares mint data.",
    homeStep2: "2. Connect a wallet and confirm the testnet minting cost yourself.",
    homeStep3: "3. After minting, review the image and on-chain status in the gallery.",
    feeHint:
      "Cost note: image bytes are not written directly on-chain. Only the necessary reference is stored to reduce CKB space usage.",
    openGallery: "Open Gallery",
    wallet: "Wallet",
    connectWalletTitle: "Connect Wallet",
    walletDescription:
      "Connect a wallet to read balance, confirm network, and sign the mint transaction yourself. CKB Testnet is used by default.",
    connectWallet: "Connect Wallet",
    switchWallet: "View or Switch Wallet",
    waitingConnection: "Not connected",
    waitingRead: "Waiting",
    walletReadFailed: "Failed to read wallet state: ",
    mintStudio: "Mint Studio",
    createDob: "Create a New DOB",
    simplePath: "Simple path: choose image → upload → preview → sign mint",
    step01: "Step 01",
    chooseImageTitle: "Choose Image to Mint",
    chooseImage: "Choose Image",
    noFileSelected: "No file selected",
    imageLimit: "Image files only, up to 10 MB. The original image is uploaded; only a compact reference is stored on-chain.",
    step02: "Step 02",
    costFriendlyStorage: "Cost-Friendly Storage",
    storageLabel: "Cost mode: image stored on IPFS",
    storageDescription: "The app stores the original image on IPFS and only uses the required reference for minting.",
    storageNote: "This version defaults to the most cost-friendly mode for image minting. Other storage modes will move into advanced settings later.",
    step03: "Step 03",
    uploadToIpfs: "Upload to IPFS",
    uploading: "Uploading...",
    uploadToPinata: "Upload to Pinata",
    preview: "Preview",
    confirmBeforeMint: "Review Before Mint",
    name: "Name",
    image: "Image",
    estimatedOnChainData: "Estimated On-chain Data",
    onChainDataHint: "Only the image reference and basic information are written on-chain. The image bytes stay on IPFS.",
    previewEmpty: "Upload an image to generate the mint preview here.",
    hideAdvanced: "Hide Advanced Details",
    showAdvanced: "Show Advanced Details",
    downloadJson: "Download Technical JSON",
    mintStatus: "Mint Status",
    connectBeforeMint: "Connect a wallet to mint on testnet. Confirm the fee shown by the wallet before signing.",
    buildTx: "Building transaction...",
    waitingSignature: "Waiting for wallet signature...",
    mintDob: "Confirm and Mint DOB",
    dryRun: "Preview Result First (No On-chain Fee)",
    dryRunHint: "Preview mode only creates a local simulation record. It does not request a wallet signature or write to CKB.",
    dryRunLocalOnly: "Dry-run results are local only and cannot be queried in the explorer.",
    openExplorer: "View on Nervos Explorer",
    assetLookup: "Asset Lookup",
    viewCreatedDob: "View Created DOBs",
    lookupDescription:
      "Enter a CID, Spore ID, or tx hash to recover a local record. Real tx hashes can be opened in the testnet explorer.",
    openExplorerShort: "Open Explorer",
    searchPlaceholder: "Search CID / 0x tx hash / Spore ID",
    noLookupMatch: "No matching local record. If this is a real tx hash, open it in the explorer to check on-chain status.",
    load: "Load",
    myDrafts: "My Drafts",
    myCreationRecords: "My Creation Records",
    importHistory: "Import History",
    exportHistory: "Export History",
    clearHistory: "Clear History",
    historyEmpty: "Successful uploads save CID, metadata, and later tx hash locally, so they remain after refresh.",
    historyCleared: "History cleared.",
    noValidHistory: "No valid history records found.",
    importFailed: "Import failed. Check the JSON file.",
    needWalletAndUpload: "Connect a wallet and upload an image first.",
    needUploadMetadata: "Upload an image and generate metadata first.",
    galleryBadge: "My DOB Collection",
    galleryTitle: "My DOB Gallery",
    galleryDescription:
      "Review digital objects you have created or previewed. Enter an on-chain tx hash to query CKB testnet status directly.",
    collection: "Collection",
    galleryStep1: "1. Browse DOB drafts and mint records created on this device.",
    galleryStep2: "2. Enter a tx hash to query on-chain status.",
    galleryStep3: "3. Distinguish preview records from real submitted records.",
    galleryNote: "Minted assets will gradually move into an on-chain asset view. Preview records stay in this browser only.",
    entry: "Entry",
    assetEntry: "Asset Entry",
    entryHome: "Return home to create another DOB.",
    entryGallery: "Use the gallery to review your creation records and on-chain status.",
    entryFuture: "Spore / DOB on-chain content parsing will be expanded later.",
    myDob: "My DOBs",
    galleryIntro: "This page gathers your creation records. Preview records are local; real transactions can be queried by tx hash.",
    continueCreate: "Create More",
    gallerySearchPlaceholder: "Search CID / Spore ID / tx hash",
    chainLoading: "Querying on-chain transaction...",
    chainErrorPrefix: "Chain query failed: ",
    chainStatus: "Chain Status",
    myRecords: "My records",
    currentShown: "shown",
    noGalleryMatch: "No matching records. Create or preview a DOB on the home page first.",
    openImage: "Open Image",
    viewTransaction: "View Transaction",
    localSimulation: "Local Simulation",
    notMinted: "Not Minted",
    dryRunLocalResult: "dry-run is a local simulation result only.",
    statusUploaded: "uploaded",
    statusDryRun: "dry-run",
    statusMinted: "minted",
    statusAll: "all",
    statusReal: "real",
  },
} as const;

type TranslationKey = keyof typeof translations.zh;

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "zh";
  }

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === "zh" || saved === "en") {
    return saved;
  }

  return window.navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh");

  useEffect(() => {
    setLanguageState(getInitialLanguage());
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : "en";
  };

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage(language === "zh" ? "en" : "zh"),
      t: (key) => translations[language][key],
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return context;
}

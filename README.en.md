# SimpleTranslate - Chrome Extension

> Bilingual translation between Chinese, English, and other languages. Supports 20+ translation engines including Google, Microsoft, and more.

## Features

- 🌐 **20+ Translation Engines**: Microsoft, Google, Baidu, Youdao, DeepL, Tencent Interactive, Alibaba, Papago, and more
- 📖 **Bilingual Display**: Show original text + translation side by side
- 🎨 **Translation Highlighting**: Customizable highlight colors
- 🔍 **Selection Translation**: Select text with mouse to translate instantly
- ⚡ **Input Box Triple-Space**: Press spacebar 3 times in any input box to translate
- 📜 **Scroll Translation**: Automatically translate new content as you scroll
- 🔄 **Auto Translation**: Detect foreign language pages and translate automatically
- 💾 **Translation Cache**: Avoid redundant requests for faster performance
- 🖱️ **Context Menu**: Right-click to translate selected text

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** in the top right
4. Click **Load unpacked**
5. Select the `SimpleTranslate` folder

## File Structure

```
SimpleTranslate/
├── manifest.json              # Extension manifest (Manifest V3)
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── background/
│   └── service-worker.js      # Background service: cross-origin requests, storage, context menus
├── content/
│   ├── content.js             # Core translation logic (20+ engines)
│   ├── ui.js                  # Sidebar, settings panel, toast notifications
│   └── content.css            # Styles
├── popup/
│   ├── popup.html             # Popup window
│   ├── popup.js               # Popup logic
│   └── popup.css              # Popup styles
└── lib/
    └── crypto-js.min.js       # CryptoJS encryption library
```

## Usage

### Basic Operations

| Action | Description |
|--------|-------------|
| Hover sidebar | Expand translation panel |
| Click **To Chinese** | Translate page to Chinese |
| Click **To Foreign** | Translate page to foreign language |
| Click **Bilingual** | Toggle bilingual / monolingual display |
| Click **Highlight** | Toggle translation highlighting |
| Click **Original** | Toggle original/translated text |
| Click **Select** | Enable mouse selection translation |
| Click **Engine** | Open settings panel to switch engines |

### Selection Translation

1. Click the **Select** button in the sidebar to enable
2. Select any text with your mouse
3. Translation result popup appears

### Input Box Translation

Quickly press **spacebar three times** in any input box to automatically translate the input content.

### Engine Switching

Click the **Engine** button in the sidebar to open the settings panel where you can:
- Choose from 20+ translation engines
- Set highlight color
- Enable/disable scroll translation
- Switch foreign language (supported by some engines)

## Translation Engine List

| Engine | Status | Notes |
|--------|--------|-------|
| Microsoft | ✅ Recommended | No configuration needed |
| Google | ✅ Recommended | Requires VPN/proxy |
| Tencent Interactive | ✅ Recommended | Requires authorization from official site |
| Youdao Mobile | ✅ Recommended | No configuration needed |
| Baidu | 🔑 API Key | Requires API key |
| Youdao | 🔑 API Key | Requires API key |
| iFlytek | 🔑 API Key | Requires API key |
| Sogou | ✅ | No configuration needed |
| Ciba | ✅ | No configuration needed |
| Hujiang | ✅ | No configuration needed |
| Caiyun | ✅ | No configuration needed |
| Alibaba | ✅ | No configuration needed |
| Papago | ✅ | No configuration needed |
| Baidu Mobile | ✅ | No configuration needed |
| worldlinGO | ✅ | No configuration needed |
| DeepL | ⚠️ Limited | IP-based rate limiting |
| Yifan Tong | ✅ | No configuration needed |
| Yandex | ✅ | Requires authorization from official site |
| Foxit | ✅ | No configuration needed |
| CNKI | ✅ | Requires authorization from official site |
| Kingsoft | ✅ | Requires authorization from official site |

## Migration from Userscript

This extension is refactored from the [Chinese-English Bilingual Translation](https://greasyfork.org/zh-CN/scripts/469073) userscript. Key changes:

| Userscript | Chrome Extension |
|------------|------------------|
| `GM_xmlhttpRequest` | Service Worker `fetch()` |
| `GM_setValue / GM_getValue` | `chrome.storage.local` |
| `GM_addStyle` | CSS file injection |
| `GM_registerMenuCommand` | `chrome.contextMenus` |
| jQuery `$()` | Native DOM API |

## Notes

- Icons in the `icons/` directory are placeholders — replace with proper icons (16×16, 48×48, 128×128 PNG)
- Some engines (Baidu, Youdao, iFlytek) require you to apply for API keys and configure them in the code
- Google Translate requires VPN/proxy access
- Excluded site list can be modified in the `excludeSites` array in `content.js`

## License

MIT License

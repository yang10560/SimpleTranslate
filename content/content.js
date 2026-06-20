/**
 * SimpleTranslate - Content Script
 * Core translation logic with 20+ engines, caching, page traversal.
 */

(async function () {
  'use strict';

  // ==================== Chrome Extension Helpers ====================

  function extFetch(details) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetch', payload: details }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(response || new Error('Fetch failed'));
        }
      });
    });
  }

  function extGetValue(key, defaultValue) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'getStorage', payload: { key, defaultValue } },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(defaultValue);
          } else {
            resolve(response.value !== null ? response.value : defaultValue);
          }
        }
      );
    });
  }

  function extSetValue(key, value) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'setStorage', payload: { key, value } },
        () => resolve()
      );
    });
  }

  function extOpenTab(url) {
    chrome.runtime.sendMessage({ action: 'openTab', payload: { url } });
  }

  function extSetClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  // ==================== Detect Page Type ====================
  try {
    if (document.contentType === 'application/xml') return;
  } catch (ex) { console.error(ex); }

  // ==================== API Constants ====================
  let authCode;
  let secretCode;
  let sogou_uuid;

  const APIConst = {
    Baidu: 'baidu',
    BaiduMobileWeb: 'baiduMobileWeb',
    Microsoft: 'microsoft',
    Google: 'google',
    SogouWeb: 'sogouWeb',
    ICIBAWeb: 'icibaWeb',
    HujiangWeb: 'hujiangWeb',
    Youdao: 'youdao',
    CaiyunWeb: 'caiyunWeb',
    TransmartWeb: 'transmartWeb',
    AlibabaWeb: 'alibabaWeb',
    PapagoWeb: 'papagoWeb',
    YoudaoMobileWeb: 'youdaoMobileWeb',
    Worldlingo: 'worldlingo',
    DeepLWeb: 'deepLWeb',
    FlittoWeb: 'flittoWeb',
    YandexWeb: 'yandexWeb',
    FuxiWeb: 'fuxiWeb',
    CNKIWeb: 'CNKIWeb',
    Xunfei: 'xunfei',
    WPSKuaiyiWeb: 'WPSKuaiyiWeb',
    BaiduAPI: {
      name: "baidu",
      ChineseLang: 'zh',
      EnglishLang: 'en',
      appid: '20230622001720783',
      secret: 'dQVha4zSH26nMDLpfoVC'
    },
    BaiduMobileWebAPI: { name: "baiduMobileWeb", ChineseLang: 'zh', EnglishLang: 'en' },
    MicrosoftAPI: { name: "microsoft", ChineseLang: 'zh-Hans', EnglishLang: 'en' },
    GoogleAPI: { name: "google", ChineseLang: 'zh-CN', EnglishLang: 'en' },
    SogouWebAPI: { name: "sogouWeb", ChineseLang: 'zh-CHS', EnglishLang: 'en' },
    ICIBAWebAPI: { name: "icibaWeb", ChineseLang: 'zh', EnglishLang: 'en' },
    HujiangWebAPI: { name: 'hujiangWeb', ChineseLang: 'cn', EnglishLang: 'en' },
    YoudaoAPI: {
      name: 'youdao', ChineseLang: 'zh-CHS', EnglishLang: 'en',
      appId: '0625d97d20b47865', appKey: 'xxxxxxxxxxxxxxxxxxxx'
    },
    CaiyunWebAPI: { name: 'caiyunWeb', ChineseLang: 'zh', EnglishLang: 'en' },
    TransmartWebAPI: { name: 'transmartWeb', ChineseLang: 'zh', EnglishLang: 'en' },
    AlibabaWebAPI: { name: 'alibabaWeb', ChineseLang: 'zh', EnglishLang: 'en' },
    PapagoWebAPI: { name: 'papagoWeb', ChineseLang: 'zh-CN', EnglishLang: 'en' },
    YoudaoMobileWebAPI: { name: 'youdaoMobileWeb', ChineseLang: 'ZH_CN', EnglishLang: 'EN' },
    WorldlingoAPI: { name: 'worldlingo', ChineseLang: 'zh_cn', EnglishLang: 'en' },
    DeepLWebAPI: { name: 'deepLWeb', ChineseLang: 'ZH', EnglishLang: 'EN' },
    FlittoWebAPI: { name: 'flittoWeb', ChineseLang: 11, EnglishLang: 17 },
    YandexWebAPI: { name: 'yandexWeb', ChineseLang: "zh", EnglishLang: "en" },
    FuxiWebAPI: { name: 'fuxiWeb', ChineseLang: "zh-CN", EnglishLang: "en" },
    CNKIWebAPI: { name: 'CNKIWeb', ChineseLang: "1", EnglishLang: "0" },
    XunfeiAPI: {
      name: 'xunfei', ChineseLang: "cn", EnglishLang: "en",
      APPID: '535ee726', APISecret: 'xxx', APIKey: 'xxx'
    },
    WPSKuaiyiWebAPI: { name: 'WPSKuaiyiWeb', ChineseLang: "zh", EnglishLang: "en" }
  };

  // ==================== Engine List ====================
  const engineList = [
    { name: '微软', api: APIConst.MicrosoftAPI, tag: '推荐', tagColor: '#4caf50', toast: '已经切换微软翻译' },
    { name: '谷歌', api: APIConst.GoogleAPI, tag: '推荐', tagColor: '#4caf50', toast: '已经切换谷歌翻译' },
    { name: '腾讯交互', api: APIConst.TransmartWebAPI, tag: '推荐', tagColor: '#4caf50', toast: '已经切换腾讯交互式翻译.需鉴权', openUrl: 'https://transmart.qq.com/' },
    { name: '有道手机', api: APIConst.YoudaoMobileWebAPI, tag: '推荐', tagColor: '#4caf50', toast: '已经切换有道手机翻译' },
    { name: '百度', api: APIConst.BaiduAPI, tag: '需key', tagColor: '#ff9800', toast: '已经切换百度翻译,未配置api需源码中修改秘钥' },
    { name: '有道', api: APIConst.YoudaoAPI, tag: '需key', tagColor: '#ff9800', toast: '已经切换有道翻译，未配置api key' },
    { name: '讯飞', api: APIConst.XunfeiAPI, tag: '需key', tagColor: '#ff9800', toast: '已经切换讯飞API版' },
    { name: '搜狗', api: APIConst.SogouWebAPI, tag: '', tagColor: '', toast: '已经切换搜狗翻译' },
    { name: '词霸', api: APIConst.ICIBAWebAPI, tag: '', tagColor: '', toast: '已经切换词霸翻译' },
    { name: '沪江小D', api: APIConst.HujiangWebAPI, tag: '', tagColor: '', toast: '已经切换沪江翻译', openUrl: 'https://dict.hjenglish.com/app/trans' },
    { name: '彩云', api: APIConst.CaiyunWebAPI, tag: '', tagColor: '', toast: '已经切换彩云翻译' },
    { name: 'Alibaba', api: APIConst.AlibabaWebAPI, tag: '', tagColor: '', toast: '已经切换阿里翻译' },
    { name: 'Papago', api: APIConst.PapagoWebAPI, tag: '', tagColor: '', toast: '已经切换Papago翻译' },
    { name: '百度手机', api: APIConst.BaiduMobileWebAPI, tag: '', tagColor: '', toast: '已经切换百度翻译手机版' },
    { name: 'worldlinGO', api: APIConst.WorldlingoAPI, tag: '', tagColor: '', toast: '已经切换WorldlinGo翻译' },
    { name: 'DeepL', api: APIConst.DeepLWebAPI, tag: '限制', tagColor: '#f44336', toast: '已经切换DeepL Web翻译(有ip次数限制)' },
    { name: '易翻通', api: APIConst.FlittoWebAPI, tag: '', tagColor: '', toast: '已经切换易翻通 web' },
    { name: 'Yandex', api: APIConst.YandexWebAPI, tag: '', tagColor: '', toast: '已经切换Yandex翻译', openUrl: 'https://translate.yandex.com/' },
    { name: '福昕', api: APIConst.FuxiWebAPI, tag: '', tagColor: '', toast: '已经切换福昕翻译 web' },
    { name: 'CNKI', api: APIConst.CNKIWebAPI, tag: '', tagColor: '', toast: '已经切换CNKI web', openUrl: 'https://dict.cnki.net/index' },
    { name: '金山快译', api: APIConst.WPSKuaiyiWebAPI, tag: '', tagColor: '', toast: '已经切换金山快译', openUrl: 'https://kuaiyi.wps.cn' },
  ];

  // ==================== State ====================
  let TRANSMART_CLIENT_KEY = '';
  let currentAPI = APIConst.MicrosoftAPI;
  let isDoubleShow = true;
  let isHighlight = true;
  let englishAutoTranslate = false;
  let highlightColor = '#d8551f';
  let selectTolang = currentAPI.ChineseLang;
  let selectMode = false;
  let leftSelectMode = false;
  let excludeSites = ['www.qq.com', 'yeyu1024.xyz'];
  let noTranslateWords = ['SpringBoot', 'ChatGPT', 'YouTube', 'Twitter'];
  let scrollTranslate = false;
  let switchIndex = 0;
  let enableCache = true;
  let maxCacheCount = 1500;

  // ==================== Utility Functions ====================

  function isMobile() {
    const ua = navigator.userAgent.toLowerCase();
    return /Android|iPhone|SymbianOS|Windows Phone|iPad|iPod|Mobile/i.test(ua);
  }

  function uuidv4() {
    let t, n, r = "";
    for (t = 0; t < 32; t++) {
      n = 16 * Math.random() | 0;
      8 !== t && 12 !== t && 16 !== t && 20 !== t || (r += "-");
      const e = 3 & n, o = 16 === t ? 8 | e : n;
      r += (12 === t ? 4 : o).toString(16);
    }
    return r;
  }

  function generateRandomString(length) {
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function hasChinese(sentence) {
    if (!sentence) return false;
    return /[一-龥]/.test(sentence);
  }

  function hasEnglish(sentence) {
    if (!sentence) return false;
    return /[a-zA-Z]/.test(sentence);
  }

  function isAllChinese(str) {
    if (!str) return false;
    return /^[一-龥]+$/.test(str);
  }

  function getCurrentEngineIndex() {
    const idx = engineList.findIndex(e => e.api.name === currentAPI.name);
    return idx >= 0 ? idx : 0;
  }

  function isSupportMultiLang() {
    return currentAPI.name === APIConst.TransmartWeb || currentAPI.name === APIConst.Microsoft ||
      currentAPI.name === APIConst.Google || currentAPI.name === APIConst.BaiduMobileWeb ||
      currentAPI.name === APIConst.AlibabaWeb;
  }

  function getChromeVersion() {
    const match = navigator.userAgent.match(/Chrome\/([\d.]+)/);
    return match && match[1] ? match[1] : '122.0.6261.95';
  }

  function isEqual(obj1, obj2) {
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
    const keys1 = Object.keys(obj1), keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;
    for (const key of keys1) {
      if (!isEqual(obj1[key], obj2[key])) return false;
    }
    return true;
  }

  function jsonToObject(jsonStr) {
    try { return JSON.parse(jsonStr); } catch (e) { console.error('Invalid JSON:', e); return []; }
  }

  function objectToJson(obj) {
    try { return JSON.stringify(obj); } catch (e) { console.error('JSON error:', e); return '[]'; }
  }

  // ==================== Cache ====================
  let cacheChanged = true;
  let tempCache;

  function readCache(key) {
    if (cacheChanged) {
      const value = localStorage.getItem(key);
      const ret = value !== null ? jsonToObject(value) : [];
      tempCache = ret;
      return ret;
    }
    return tempCache || [];
  }

  function addToArray(arr, obj, maxLength) {
    maxLength = maxLength || maxCacheCount;
    if (arr.length >= maxLength) arr.shift();
    let start = 0, end = arr.length - 1;
    while (start <= end) {
      if (isEqual(arr[start], obj) || isEqual(arr[end], obj)) return arr;
      start++; end--;
    }
    arr.push(obj);
    return arr;
  }

  function combineArray(arr1, arr2) {
    let start = 0, end = arr2.length - 1;
    while (start <= end) {
      if (start === end) { addToArray(arr1, arr2[start]); }
      else { addToArray(arr1, arr2[start]); addToArray(arr1, arr2[end]); }
      start++; end--;
    }
    return arr1;
  }

  function storeCache(key, store_arr) {
    cacheChanged = true;
    const old_cache = readCache(key);
    const new_cache = combineArray(old_cache, store_arr);
    localStorage.setItem(key, objectToJson(new_cache));
  }

  function translateFromCache(text, node, lang, key) {
    return new Promise((resolve, reject) => {
      if (!text) { resolve("no text"); return; }
      if (noTranslateWords.includes(text)) { resolve("skip"); return; }

      try {
        const cache = readCache(key);
        if (cache) {
          let start = 0, end = cache.length - 1;
          while (start <= end) {
            if (lang === currentAPI.ChineseLang) {
              if (cache[start].english === text || cache[end].english === text) {
                setTimeout(() => {
                  renderPage({ cacheResult: cache[start].english === text ? cache[start].chinese : cache[end].chinese },
                    text, node, lang);
                });
                resolve("cached"); return;
              }
            } else if (lang === currentAPI.EnglishLang) {
              if (cache[start].chinese === text || cache[end].chinese === text) {
                setTimeout(() => {
                  renderPage({ cacheResult: cache[start].chinese === text ? cache[start].english : cache[end].english },
                    text, node, lang);
                });
                resolve("cached"); return;
              }
            } else {
              reject("lang error"); return;
            }
            start++; end--;
          }
        }
      } catch (e) {
        console.error("cache error", e);
        reject("cache error"); return;
      }
      reject("no cache");
    });
  }

  // ==================== Render Page ====================
  function renderPage(res, text, node, lang) {
    if (!res) return;
    try {
      let yiwen;
      if (res && res.cacheResult) {
        yiwen = res.cacheResult;
      } else if (currentAPI.name === APIConst.Baidu) {
        yiwen = JSON.parse(res.responseText).trans_result[0].dst;
      } else if (currentAPI.name === APIConst.Microsoft) {
        yiwen = JSON.parse(res.responseText)[0].translations[0].text;
      } else if (currentAPI.name === APIConst.Google) {
        yiwen = JSON.parse(res.responseText)[0][0][0];
      } else if (currentAPI.name === APIConst.SogouWeb) {
        yiwen = JSON.parse(res.responseText).data.translate.dit;
      } else if (currentAPI.name === APIConst.ICIBAWeb) {
        yiwen = JSON.parse(decodeICIBA(JSON.parse(res.responseText).content)).out;
      } else if (currentAPI.name === APIConst.HujiangWeb) {
        yiwen = JSON.parse(res.responseText).data.content;
      } else if (currentAPI.name === APIConst.Youdao) {
        yiwen = JSON.parse(res.responseText).translation[0];
      } else if (currentAPI.name === APIConst.CaiyunWeb) {
        yiwen = decodeCaiyun(JSON.parse(res.responseText).target);
      } else if (currentAPI.name === APIConst.TransmartWeb) {
        yiwen = JSON.parse(res.responseText).auto_translation[0];
      } else if (currentAPI.name === APIConst.AlibabaWeb) {
        yiwen = JSON.parse(res.responseText).data.translateText;
      } else if (currentAPI.name === APIConst.PapagoWeb) {
        yiwen = JSON.parse(res.responseText).translatedText;
      } else if (currentAPI.name === APIConst.YoudaoMobileWeb) {
        const doc = document.implementation.createHTMLDocument();
        doc.body.innerHTML = res.responseText;
        yiwen = doc.querySelector("#translateResult li").innerText.trim();
      } else if (currentAPI.name === APIConst.Worldlingo) {
        yiwen = res.responseText;
      } else if (currentAPI.name === APIConst.DeepLWeb) {
        yiwen = JSON.parse(res.responseText).result.translations[0].beams[0].sentences[0].text;
      } else if (currentAPI.name === APIConst.BaiduMobileWeb) {
        yiwen = JSON.parse(res.responseText).trans[0].dst;
      } else if (currentAPI.name === APIConst.FlittoWeb) {
        yiwen = JSON.parse(res.responseText)[0].tr_content;
      } else if (currentAPI.name === APIConst.YandexWeb) {
        yiwen = JSON.parse(res.responseText).text[0];
      } else if (currentAPI.name === APIConst.FuxiWeb) {
        yiwen = JSON.parse(res.responseText).result;
      } else if (currentAPI.name === APIConst.CNKIWeb) {
        yiwen = JSON.parse(res.responseText).data.mResult.replace(/\(.*?ad\.html\)/g, '').trim();
      } else if (currentAPI.name === APIConst.Xunfei) {
        yiwen = JSON.parse(decodeBase64toString(JSON.parse(res.responseText).payload.result.text)).trans_result.dst;
      } else if (currentAPI.name === APIConst.WPSKuaiyiWeb) {
        yiwen = JSON.parse(res.responseText).data.trans_result[0].tgt_para;
      } else {
        yiwen = JSON.parse(res.responseText)[0].translations[0].text;
      }

      if (yiwen === text) return;

      // Input/textarea handling
      if (/(input|textarea)/i.test(node.nodeName)) {
        if (node.getAttribute("triple")) {
          if (node.value) node.value = yiwen;
        } else if (node.hasAttribute('placeholder')) {
          node.setAttribute('placeholder', yiwen);
        }
        return;
      }

      const outersp = document.createElement("span");
      outersp.innerHTML = text + " ";
      const sp = document.createElement("span");
      sp.setAttribute("class",
        isDoubleShow && isHighlight ? `translate-span light-color lang-${lang}` : `translate-span lang-${lang}`);
      sp.innerHTML = yiwen;

      if (!isDoubleShow) {
        const srcSpan = document.createElement("span");
        srcSpan.setAttribute("class", `translate-src hide lang-${lang}`);
        srcSpan.innerHTML = text;
        outersp.innerHTML = '';
        outersp.append(srcSpan);
        outersp.append(sp);
      } else {
        outersp.append(sp);
      }
      node.replaceWith(outersp);

      // Cache
      if (enableCache && res && !res.cacheResult && yiwen && text) {
        if (lang === currentAPI.ChineseLang) {
          storeCache(`${currentAPI.name}wordCache`, [{ english: text, chinese: yiwen }]);
        } else if (lang === currentAPI.EnglishLang) {
          storeCache(`${currentAPI.name}wordCache`, [{ english: yiwen, chinese: text }]);
        }
      }
    } catch (ex) {
      console.error("render error!", ex, node);
    }
  }

  // ==================== Translation Engines ====================

  // Microsoft
  function translateMicrosoft(text, node, lang) {
    if (!authCode || !text || noTranslateWords.includes(text)) return;
    extFetch({
      method: "POST",
      url: `https://api-edge.cognitive.microsofttranslator.com/translate?from=&to=${lang}&api-version=3.0&includeSentenceLength=true`,
      headers: { "authorization": `Bearer ${authCode}`, "Content-Type": "application/json" },
      data: JSON.stringify([{ "Text": text }]),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Microsoft error:', err));
  }

  // Baidu API
  function translateBaiduApi(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const salt = `${Date.now()}`;
    const sign = CryptoJS.MD5(`${APIConst.BaiduAPI.appid}${text}${salt}${APIConst.BaiduAPI.secret}`).toString();
    const params = new URLSearchParams({
      q: text, from: "auto", to: lang,
      appid: APIConst.BaiduAPI.appid, salt, sign
    });
    extFetch({
      method: "POST",
      url: "https://fanyi-api.baidu.com/api/trans/vip/translate",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: params.toString(),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Baidu API error:', err));
  }

  // Google
  function translateGoogle(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    extFetch({
      method: "GET",
      url: `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${from}&tl=${lang}&q=${encodeURIComponent(text)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Google error:', err));
  }

  // Sogou
  function translateSogouWeb(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    const sign = CryptoJS.MD5("".concat(from).concat(lang).concat(text).concat(secretCode)).toString();
    extFetch({
      method: "POST",
      url: `https://fanyi.sogou.com/api/trans${isMobile() ? "wap" : "pc"}/text/result`,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Origin": "https://fanyi.sogou.com",
        "Referer": `https://fanyi.sogou.com/text?keyword=${encodeURIComponent(text)}&transfrom=en&transto=zh-CHS&model=general`,
        "Accept": "application/json, text/plain, */*",
      },
      data: JSON.stringify({
        from, to: lang, text,
        client: isMobile() ? "wap" : "pc",
        fr: isMobile() ? "browser_wap" : "browser_pc",
        needQc: 1, s: sign, uuid: sogou_uuid || uuidv4(), exchange: false
      }),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Sogou error:', err));
  }

  // ICIBA
  const AES_ECB = {
    encrypt: function (e, t) {
      return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(e), CryptoJS.enc.Utf8.parse(t), {
        mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7
      }).toString();
    },
    decrypt: function (e, t) {
      return CryptoJS.AES.decrypt(e, CryptoJS.enc.Utf8.parse(t), {
        mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7
      }).toString(CryptoJS.enc.Utf8);
    }
  };

  function decodeICIBA(content) {
    return AES_ECB.decrypt(content, "aahc3TfyfCEmER33");
  }

  function translateICIBAWeb(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    const v = "6key_web_new_fanyi".concat("6dVjYLFyzfkFkk").concat(text.replace(/(^\s*)|(\s*$)/g, ""));
    let sign = CryptoJS.MD5(v).toString().substring(0, 16);
    sign = AES_ECB.encrypt(sign, "L4fBtD5fLC9FQw22");
    extFetch({
      method: "POST",
      url: `https://ifanyi.iciba.com/index.php?c=trans&m=fy&client=6&auth_user=key_web_new_fanyi&sign=${sign}`,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "Referer": "https://www.iciba.com/translate",
        "origin": "https://ifanyi.iciba.com"
      },
      data: `from=${from}&to=${lang}&q=${encodeURIComponent(text)}`,
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('ICIBA error:', err));
  }

  // Hujiang
  function translatHujiangWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    extFetch({
      method: "POST",
      url: `https://dict.hjenglish.com/v10/dict/translation/${from}/${lang}`,
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        "Referer": "https://dict.hjenglish.com/app/trans",
        "origin": "https://dict.hjenglish.com"
      },
      data: `content=${encodeURIComponent(text)}`,
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Hujiang error:', err));
  }

  // Youdao API
  function truncate(q) {
    const len = q.length;
    if (len <= 20) return q;
    return q.substring(0, 10) + len + q.substring(len - 10, len);
  }

  function translatYoudaoAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    const appId = APIConst.YoudaoAPI.appId;
    const appkey = APIConst.YoudaoAPI.appKey;
    const salt = Date.now();
    const curtime = Math.round(Date.now() / 1000);
    const sign = CryptoJS.SHA256(appId + truncate(text) + salt + curtime + appkey).toString(CryptoJS.enc.Hex);
    const params = new URLSearchParams({
      q: text, appKey: appId, salt, from, to: lang,
      sign, signType: "v3", curtime
    });
    extFetch({
      method: "POST",
      url: "https://openapi.youdao.com/api",
      headers: {
        "accept": "application/json, text/javascript, */*;",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      data: params.toString(),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Youdao error:', err));
  }

  // Caiyun
  function toBase64Caiyun(e) {
    const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      i = "NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm",
      a = n => t.indexOf(n),
      o = n => a(n) > -1 ? i[a(n)] : n;
    return e.split("").map(o).join("");
  }

  function decodeCaiyun(target) {
    if (!target) return;
    const t = toBase64Caiyun(target);
    const bytes = CryptoJS.enc.Base64.parse(t);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  let caiyun_Token, caiyun_JWT;
  const caiyun_deviceID = generateRandomString(32);

  function translatCaiyunWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text) || !caiyun_JWT || !caiyun_Token) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    extFetch({
      method: "POST",
      url: "https://api.interpreter.caiyunai.com/v1/translator",
      headers: {
        "Referer": "https://fanyi.caiyunapp.com/",
        "origin": "https://fanyi.caiyunapp.com",
        "accept": "application/json, text/plain, */*",
        "app-name": "xiaoyi",
        "content-type": "application/json;charset=UTF-8",
        "device-id": caiyun_deviceID,
        "os-type": "web",
        "t-authorization": caiyun_JWT,
        "x-authorization": caiyun_Token
      },
      data: JSON.stringify({
        source: text, trans_type: `${from}2${lang}`,
        request_id: "web_fanyi", media: "text",
        os_type: "web", dict: true, cached: true,
        replaced: true, style: "formal", browser_id: caiyun_deviceID
      }),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Caiyun error:', err));
  }

  // Transmart (Tencent)
  function translatTransmartWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    extFetch({
      method: "POST",
      url: "https://transmart.qq.com/api/imt",
      headers: {
        'Content-Type': 'application/json',
        'Host': 'transmart.qq.com',
        'Origin': 'https://transmart.qq.com',
        'Referer': 'https://transmart.qq.com/'
      },
      data: JSON.stringify({
        header: {
          fn: "auto_translation", session: "",
          client_key: TRANSMART_CLIENT_KEY || `browser-chrome-${getChromeVersion()}-Windows_10-${uuidv4()}-${Date.now()}`,
          user: ""
        },
        type: "plain", model_category: "normal", text_domain: "general",
        source: { lang: "auto", text_list: [text] },
        target: { lang }
      }),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Transmart error:', err));
  }

  // DeepL
  function translatDeepLWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    let r = Date.now();
    let n = 1;
    n += ((text || "").match(/[i]/g) || []).length;
    const deepl_id = 1e4 * Math.round(1e4 * Math.random());
    extFetch({
      method: "POST",
      url: "https://www2.deepl.com/jsonrpc?method=LMT_handle_jobs",
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.deepl.com',
        'Referer': 'https://www.deepl.com/'
      },
      data: JSON.stringify({
        jsonrpc: "2.0", method: "LMT_handle_jobs",
        params: {
          jobs: [{
            kind: "default",
            sentences: [{ text, id: 0, prefix: "" }],
            raw_en_context_before: [], raw_en_context_after: [],
            preferred_num_beams: 4, quality: "fast"
          }],
          lang: {
            preference: {
              weight: {
                DE: 0.18427, EN: from === currentAPI.EnglishLang ? 9.93878 : 5.90582,
                ES: 0.13236, FR: 0.16311, IT: 0.11621, JA: 0.17963,
                NL: 0.1865, PL: 0.11549, PT: 0.10159, RU: 0.10577,
                ZH: from === currentAPI.ChineseLang ? 9.93878 : 5.90582,
                BG: 0.07468, CS: 0.09005, DA: 0.08567, EL: 0.07069,
                ET: 0.0836, FI: 0.09628, HU: 0.08731, LT: 0.07119,
                LV: 0.06866, RO: 0.07842, SK: 0.07497, SL: 0.08492,
                SV: 0.10275, TR: 0.07728, ID: 0.09161, UK: 0.08573,
                KO: 0.04671, NB: 0.05511
              }, default: "default"
            },
            source_lang_user_selected: from, target_lang: lang
          },
          priority: -1,
          commonJobParams: { mode: "translate", browserType: 1 },
          timestamp: r + (n - r % n)
        },
        id: deepl_id
      }).replace('hod":"', (deepl_id + 3) % 13 == 0 || (deepl_id + 5) % 29 == 0 ? 'hod" : "' : 'hod": "'),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('DeepL error:', err));
  }

  // Papago
  let papaId;
  function uuid_papago() {
    let a = Date.now();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (e) {
      const t = (a + 16 * Math.random()) % 16 | 0;
      a = Math.floor(a / 16);
      return ("x" === e ? t : 3 & t | 8).toString(16);
    });
  }

  function translatPapagoWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    papaId = papaId || uuid_papago();
    const time = Date.now() - 1073;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    extFetch({
      method: "POST",
      url: "https://papago.naver.com/apis/nsmt/translate",
      headers: {
        'Origin': 'https://papago.naver.com',
        'Referer': 'https://papago.naver.com/',
        "accept": "application/json",
        "Authorization": 'PPG ' + papaId + ':' + CryptoJS.HmacMD5(papaId + '\nhttps://papago.naver.com/apis/nsmt/translate\n' + time, "v1.8.12_7cf22c1499").toString(CryptoJS.enc.Base64),
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Device-Type": "pc", "Timestamp": `${time}`, "X-Apigw-Partnerid": "papago"
      },
      data: `deviceId=${papaId}&locale=zh-CN&dict=true&dictDisplay=30&honorific=false&instant=false&paging=false&source=${from}&target=${lang}&text=${encodeURIComponent(text)}`,
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Papago error:', err));
  }

  // Youdao Mobile
  function translatYoudaoMobileWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    extFetch({
      method: "POST",
      url: "https://m.youdao.com/translate",
      headers: {
        'Origin': 'https://m.youdao.com',
        'Referer': 'https://m.youdao.com/translate/',
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: `inputtext=${encodeURIComponent(text)}&type=${from}2${lang}`,
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Youdao Mobile error:', err));
  }

  // Baidu Mobile
  let baidu_gtk, baidu_token;

  function getBaiduSign(t, r) {
    let o, i = t.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
    if (null === i) {
      let a = t.length;
      a > 30 && (t = "".concat(t.substr(0, 10)).concat(t.substr(Math.floor(a / 2) - 5, 10)).concat(t.substr(-10, 10)));
    } else {
      for (var s = t.split(/[\uD800-\uDBFF][\uDC00-\uDFFF]/), c = 0, u = s.length, l = []; c < u; c++)
        "" !== s[c] && l.push.apply(l, s[c].split("")), c !== u - 1 && l.push(i[c]);
      var p = l.length;
      p > 30 && (t = l.slice(0, 10).join("") + l.slice(Math.floor(p / 2) - 5, Math.floor(p / 2) + 5).join("") + l.slice(-10).join(""));
    }
    for (var d = "".concat(String.fromCharCode(103)).concat(String.fromCharCode(116)).concat(String.fromCharCode(107)),
      h = (null !== r ? r : (r = window[d] || "") || "").split("."),
      f = Number(h[0]) || 0, m = Number(h[1]) || 0,
      g = [], y = 0, v = 0; v < t.length; v++) {
      var _ = t.charCodeAt(v);
      _ < 128 ? g[y++] = _ : (_ < 2048 ? g[y++] = _ >> 6 | 192 : (55296 == (64512 & _) && v + 1 < t.length && 56320 == (64512 & t.charCodeAt(v + 1)) ? (_ = 65536 + ((1023 & _) << 10) + (1023 & t.charCodeAt(++v)),
        g[y++] = _ >> 18 | 240, g[y++] = _ >> 12 & 63 | 128) : g[y++] = _ >> 12 | 224,
        g[y++] = _ >> 6 & 63 | 128), g[y++] = 63 & _ | 128);
    }
    for (var b = f,
      w = "".concat(String.fromCharCode(43)).concat(String.fromCharCode(45)).concat(String.fromCharCode(97)) + "".concat(String.fromCharCode(94)).concat(String.fromCharCode(43)).concat(String.fromCharCode(54)),
      k = "".concat(String.fromCharCode(43)).concat(String.fromCharCode(45)).concat(String.fromCharCode(51)) + "".concat(String.fromCharCode(94)).concat(String.fromCharCode(43)).concat(String.fromCharCode(98)) + "".concat(String.fromCharCode(43)).concat(String.fromCharCode(45)).concat(String.fromCharCode(102)),
      x = 0; x < g.length; x++) b = n_baidu(b += g[x], w);
    return b = n_baidu(b, k), (b ^= m) < 0 && (b = 2147483648 + (2147483647 & b)),
      "".concat((b %= 1e6).toString(), ".").concat(b ^ f);
  }

  function n_baidu(t, e) {
    for (var n = 0; n < e.length - 2; n += 3) {
      var r = e.charAt(n + 2);
      r = "a" <= r ? r.charCodeAt(0) - 87 : Number(r);
      r = "+" === e.charAt(n + 1) ? t >>> r : t << r;
      t = "+" === e.charAt(n) ? t + r & 4294967295 : t ^ r;
    }
    return t;
  }

  function translatBaiduMobileWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    extFetch({
      method: "POST",
      url: "https://fanyi.baidu.com/basetrans",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "MQQBrowser/26 Mozilla/5.0 (Linux; U; Android 2.3.7; zh-cn; MB200 Build/GRJ22; CyanogenMod-7) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
        "origin": "https://fanyi.baidu.com",
        "Referer": "https://fanyi.baidu.com/"
      },
      data: `query=${encodeURIComponent(text)}&from=${from}&to=${lang}&token=${baidu_token}&sign=${getBaiduSign(text, baidu_gtk)}`,
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Baidu Mobile error:', err));
  }

  // Flitto
  const Qe = () => window.crypto || window.msCrypto;
  const Xe = (function () {
    function e() {
      this.buffer = new Uint8Array(8);
      Qe().getRandomValues(this.buffer);
      this.buffer[0] = 127 & this.buffer[0];
    }
    e.prototype.toString = function (e) {
      var t = this.readInt32(0), n = this.readInt32(4), r = "";
      do {
        var a = t % e * 4294967296 + n;
        t = Math.floor(t / e); n = Math.floor(a / e);
        r = (a % e).toString(e) + r;
      } while (t || n);
      return r;
    };
    e.prototype.toPaddedHexadecimalString = function () {
      var e = this.toString(16);
      return Array(17 - e.length).join("0") + e;
    };
    e.prototype.readInt32 = function (e) {
      return 16777216 * this.buffer[e] + (this.buffer[e + 1] << 16) + (this.buffer[e + 2] << 8) + this.buffer[e + 3];
    };
    return e;
  })();

  function translatFlittoWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    const traceId = new Xe, spanId = new Xe;
    const traceparent = "00-0000000000000000".concat(traceId.toPaddedHexadecimalString(), "-")
      .concat(spanId.toPaddedHexadecimalString(), "-01");
    extFetch({
      method: "POST",
      url: "https://www.flitto.com.cn/api/1.2/tr/recommends/text",
      headers: {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json",
        "traceparent": traceparent,
        "origin": "https://www.flitto.com.cn",
        "Referer": "https://www.flitto.com.cn/language/translation/text"
      },
      data: JSON.stringify({ src_lang_id: from, dst_lang_id: lang, content: text, size: text.length }),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Flitto error:', err));
  }

  // Yandex
  let yandex_reqid, yandex_uid, yandex_spravka, yandex_index = 0;

  function translatYandexWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text) || !yandex_reqid) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    extFetch({
      method: "POST",
      url: `https://translate.yandex.net/api/v1/tr.json/translate?id=${yandex_reqid}-${yandex_index++}-0&srv=tr-text&source_lang=${from}&target_lang=${lang}&reason=type-end&format=text&ajax=1&yu=${yandex_uid}${yandex_spravka ? '&spravka=' + yandex_spravka : ''}`,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "origin": "https://translate.yandex.com",
        "Referer": "https://translate.yandex.com/",
      },
      data: `text=${encodeURIComponent(text)}&options=4`,
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Yandex error:', err));
  }

  // Fuxi (Foxit)
  function translatFuxiWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    const time = Date.now();
    extFetch({
      method: "POST",
      url: "https://fanyi.pdf365.cn/api/wordTranslateResult",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "origin": "https://fanyi.pdf365.cn",
        "Referer": "https://fanyi.pdf365.cn/free",
      },
      data: `plateform=web&orginL=${from}&targetL=${lang}&text=${encodeURIComponent(text)}&timestamp=${time}&sign=${CryptoJS.MD5(time + "FOXIT_YEE_TRANSLATE").toString()}&userId=`,
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Fuxi error:', err));
  }

  // Worldlingo
  function translatWorldlingoAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    extFetch({
      method: "GET",
      url: `https://www.worldlingo.com/Sg0NoecXVVBsQeWBZ7hb_1rhKD4jEN2ElsZbrxpDzkcM-/texttranslate?wl_srcenc=utf-8&wl_tp=&wl_srclang=${from}&wl_trglang=${lang}&wl_text=${encodeURIComponent(text)}`,
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Worldlingo error:', err));
  }

  // CNKI
  let CNKI_TOKEN;
  function encryptCNKI(txt) {
    return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(txt), CryptoJS.enc.Utf8.parse("4e87183cfd3a45fe"), {
      mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7
    }).toString().replace(/\//g, "_").replace(/\+/g, "-");
  }

  function translatCNKIWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text) || !CNKI_TOKEN) return;
    extFetch({
      method: "POST",
      url: "https://dict.cnki.net/fyzs-front-api/translate/literaltranslation",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "token": CNKI_TOKEN,
        "Origin": "https://dict.cnki.net",
        "Referer": "https://dict.cnki.net/index"
      },
      data: JSON.stringify({ words: encryptCNKI(text), translateType: lang }),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('CNKI error:', err));
  }

  // Xunfei
  function getRfc1123Date() {
    const date = new Date();
    const options = {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'GMT', hour12: false, timeZoneName: 'short'
    };
    const rfc1123Date = date.toLocaleString('en-US', options);
    let parts = rfc1123Date.split(",");
    let subparts = parts[1].split(" ");
    return `${parts[0]}, ${subparts[2]} ${subparts[1]}${parts[2]}${parts[3].replace("UTC", "GMT")}`;
  }

  function translatXunfeiAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    const today = getRfc1123Date();
    const signature_origin = `host: itrans.xf-yun.com\ndate: ${today}\nPOST /v1/its HTTP/1.1`;
    const signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(signature_origin, APIConst.XunfeiAPI.APISecret));
    const authorization = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(
      `api_key="${APIConst.XunfeiAPI.APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
    ));
    extFetch({
      method: "POST",
      url: `https://itrans.xf-yun.com/v1/its?authorization=${authorization}&host=itrans.xf-yun.com&date=${encodeURIComponent(today)}`,
      headers: { "content-type": "application/json", "Authentication": authorization, "date": today },
      data: JSON.stringify({
        header: { app_id: APIConst.XunfeiAPI.APPID, status: 3, res_id: generateRandomString(6) },
        parameter: { its: { from, to: lang, result: {} } },
        payload: { input_data: { encoding: "utf8", status: 3, text: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text)) } }
      }),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Xunfei error:', err));
  }

  // WPS Kuaiyi
  function getSignatureStr(obj) {
    const newkey = Object.keys(obj).sort();
    let signatureStr = '';
    newkey.forEach((item) => {
      if (obj[item] === 0) { signatureStr += item + '=' + obj[item]; }
      else if (obj[item] != 'undefined' && obj[item] != null && obj[item] != '' && typeof obj[item] != 'object') {
        signatureStr += item + '=' + obj[item];
      }
    });
    return signatureStr;
  }

  let wps_xcsrftoken;
  function translatWPSKuaiyiWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text) || !wps_xcsrftoken) return;
    const from = lang === currentAPI.ChineseLang ? currentAPI.EnglishLang : currentAPI.ChineseLang;
    const timestamp = Date.now();
    const nonce = `${Math.floor(Math.random() * 10000000000)}`;
    const data = { text, from_lang: from, to_lang: lang };
    const needSortObj = Object.assign({ timestamp, nonce }, data);
    const signatureStr = getSignatureStr(needSortObj);
    const sign_x = `appid=zxcde321456tgbvf&nonce=${nonce}&timestamp=${timestamp}`;
    const signature = CryptoJS.MD5(`/v1/mt/trans_text${signatureStr}d5cefewwheuasfd2c9ef83996fd0d82`).toString();
    extFetch({
      method: "POST",
      url: "https://kuaiyi.wps.cn/v1/mt/trans_text",
      headers: {
        "content-type": "application/json",
        "origin": "https://kuaiyi.wps.cn",
        "Referer": "https://kuaiyi.wps.cn/txt-translate?banGetPreTxt=true",
        "sign-x": sign_x, "signature": signature,
        "x-csrftoken": wps_xcsrftoken
      },
      data: JSON.stringify(data),
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('WPS error:', err));
  }

  // Alibaba
  let ali_uuid;
  const webFormBoundary = generateRandomString(16);

  function translatAlibabaWebAPI(text, node, lang) {
    if (!text || noTranslateWords.includes(text)) return;
    extFetch({
      method: "POST",
      url: "https://translate.alibaba.com/api/translate/text",
      headers: {
        "content-type": `multipart/form-data; boundary=----WebKitFormBoundary${webFormBoundary}`,
        'Origin': 'https://translate.alibaba.com',
        'Referer': 'https://translate.alibaba.com/',
        "x-xsrf-token_property_item": ali_uuid,
      },
      data: `------WebKitFormBoundary${webFormBoundary}\r\nContent-Disposition: form-data; name="srcLang"\r\n\r\nauto\r\n------WebKitFormBoundary${webFormBoundary}\r\nContent-Disposition: form-data; name="tgtLang"\r\n\r\n${lang}\r\n------WebKitFormBoundary${webFormBoundary}\r\nContent-Disposition: form-data; name="domain"\r\n\r\ngeneral\r\n------WebKitFormBoundary${webFormBoundary}\r\nContent-Disposition: form-data; name="query"\r\n\r\n${text}\r\n------WebKitFormBoundary${webFormBoundary}\r\nContent-Disposition: form-data; name="_csrf"\r\n\r\n${ali_uuid}\r\n------WebKitFormBoundary${webFormBoundary}--\r\n`,
    }).then(res => {
      if (res.status === 200) renderPage(res, text, node, lang);
    }).catch(err => console.error('Alibaba error:', err));
  }

  // ==================== API Dispatcher ====================
  function dispatchAPI(txt, node, lang) {
    const dispatch = {
      [APIConst.Baidu]: () => translateBaiduApi(txt, node, lang),
      [APIConst.Microsoft]: () => translateMicrosoft(txt, node, lang),
      [APIConst.Google]: () => translateGoogle(txt, node, lang),
      [APIConst.SogouWeb]: () => translateSogouWeb(txt, node, lang),
      [APIConst.ICIBAWeb]: () => translateICIBAWeb(txt, node, lang),
      [APIConst.HujiangWeb]: () => translatHujiangWebAPI(txt, node, lang),
      [APIConst.Youdao]: () => translatYoudaoAPI(txt, node, lang),
      [APIConst.CaiyunWeb]: () => translatCaiyunWebAPI(txt, node, lang),
      [APIConst.TransmartWeb]: () => translatTransmartWebAPI(txt, node, lang),
      [APIConst.AlibabaWeb]: () => translatAlibabaWebAPI(txt, node, lang),
      [APIConst.PapagoWeb]: () => translatPapagoWebAPI(txt, node, lang),
      [APIConst.YoudaoMobileWeb]: () => translatYoudaoMobileWebAPI(txt, node, lang),
      [APIConst.Worldlingo]: () => translatWorldlingoAPI(txt, node, lang),
      [APIConst.DeepLWeb]: () => translatDeepLWebAPI(txt, node, lang),
      [APIConst.BaiduMobileWeb]: () => translatBaiduMobileWebAPI(txt, node, lang),
      [APIConst.FlittoWeb]: () => translatFlittoWebAPI(txt, node, lang),
      [APIConst.YandexWeb]: () => translatYandexWebAPI(txt, node, lang),
      [APIConst.FuxiWeb]: () => translatFuxiWebAPI(txt, node, lang),
      [APIConst.CNKIWeb]: () => translatCNKIWebAPI(txt, node, lang),
      [APIConst.Xunfei]: () => translatXunfeiAPI(txt, node, lang),
      [APIConst.WPSKuaiyiWeb]: () => translatWPSKuaiyiWebAPI(txt, node, lang),
    };
    const fn = dispatch[currentAPI.name];
    if (fn) fn();
    else translateMicrosoft(txt, node, lang); // default
  }

  // ==================== Page Traversal ====================
  async function traversePlus(node, lang) {
    if (!node) return;
    if (/^(pre|script|code|#comment|iframe)$/i.test(node.nodeName)) return;
    if (/(translate-main|bbCodeCode|mathjax-tex|gpt-container|translate-span|highlight|translate-src|toast-|code|MyColorSelector)/i.test(node.className)) {
      if (/readme/i.test(node.id) || /B-ISSUE-DESCRIPTION/i.test(node.nodeName)) {
        // special case
      } else return;
    }

    if (node.shadowRoot) traversePlus(node.shadowRoot, lang);

    if (node.childNodes.length === 0) {
      if (!/^(INPUT|textarea)$/i.test(node.nodeName)) {
        if (isSupportMultiLang()) {
          if (lang === currentAPI.ChineseLang && isAllChinese(node.textContent)) return;
        } else {
          if (lang === currentAPI.EnglishLang && !hasChinese(node.textContent)) return;
          if (lang === currentAPI.ChineseLang && !hasEnglish(node.textContent)) return;
        }
      }

      if (node.textContent) {
        const srcText = node.textContent.trim();
        if (srcText) {
          if (/^\d+$/.test(srcText)) return;
          if (lang === currentAPI.ChineseLang && srcText.length > 1) {
            if (/^[a-zA-Z]$/.test(srcText.replace(/[^a-zA-Z]/g, '').trim())) return;
          }
          const txt = node.textContent.trim();
          if (enableCache) {
            translateFromCache(txt, node, lang, `${currentAPI.name}wordCache`)
              .then(() => { }, () => dispatchAPI(txt, node, lang));
          } else {
            dispatchAPI(txt, node, lang);
          }
        }
      } else if (/(input|textarea)/i.test(node.nodeName) && node.hasAttribute('placeholder')) {
        dispatchAPI(node.getAttribute('placeholder'), node, lang);
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traversePlus(node.childNodes[i], lang);
      }
    }
  }

  // ==================== Clear Spans ====================
  function clearSpan(lang) {
    document.querySelectorAll(".translate-span").forEach(item => {
      if (!isDoubleShow) {
        if (!item.className.includes(`lang-${lang}`)) item.remove();
      } else item.remove();
    });
    document.querySelectorAll(".translate-src").forEach(item => {
      if (!isDoubleShow) {
        if (!item.className.includes(`lang-${lang}`)) {
          item.replaceWith(document.createTextNode(item.textContent));
        }
      } else {
        item.replaceWith(document.createTextNode(item.textContent));
      }
    });
  }

  // ==================== Auth Functions ====================
  async function auth() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getAuthToken' }, (response) => {
        if (response && response.success) {
          authCode = response.token;
        }
        resolve();
      });
    });
  }

  async function authSogou() {
    try {
      const res = await extFetch({ method: "GET", url: "https://fanyi.sogou.com" });
      if (res.status === 200) {
        secretCode = secretCode || /secretCode":(\d+)/i.exec(res.responseText)[1];
        sogou_uuid = /uuid":"(.*?)"/i.exec(res.responseText)[1];
      }
    } catch (e) { console.error('Sogou auth error:', e); }
  }

  async function authCaiyun() {
    if (caiyun_JWT && caiyun_Token) return;
    try {
      const res = await extFetch({ method: "GET", url: "https://fanyi.caiyunapp.com/" });
      if (res.status === 200) {
        const tkjs = /\/assets\/index.(.*?).js/i.exec(res.responseText)[0];
        const res1 = await extFetch({ method: "GET", url: `https://fanyi.caiyunapp.com/dist/${tkjs}` });
        if (res1.status === 200) {
          caiyun_Token = /token:.{20}/i.exec(res1.responseText)[0] || caiyun_Token;
          if (caiyun_Token) await generateCaiyunJWT();
        }
      }
    } catch (e) { console.error('Caiyun auth error:', e); }
  }

  async function generateCaiyunJWT() {
    try {
      const res = await extFetch({
        method: "POST",
        url: "https://api.interpreter.caiyunai.com/v1/user/jwt/generate",
        headers: {
          "Referer": "https://fanyi.caiyunapp.com/",
          "origin": "https://fanyi.caiyunapp.com",
          "accept": "application/json, text/plain, */*",
          "app-name": "xy",
          "content-type": "application/json;charset=UTF-8",
          "device-id": caiyun_deviceID,
          "os-type": "web",
          "x-authorization": caiyun_Token
        },
        data: JSON.stringify({ browser_id: caiyun_deviceID }),
      });
      if (res.status === 200) {
        caiyun_JWT = JSON.parse(res.responseText).jwt || caiyun_JWT;
      }
    } catch (e) { console.error('Caiyun JWT error:', e); }
  }

  async function authAliBaba() {
    try {
      const res = await extFetch({ method: "GET", url: "https://translate.alibaba.com/api/translate/csrftoken" });
      if (res.status === 200) {
        ali_uuid = JSON.parse(res.responseText).token;
      }
    } catch (e) { console.error('Alibaba auth error:', e); }
  }

  async function authBaiduMobile() {
    try {
      const res = await extFetch({
        method: "GET", url: "https://fanyi.baidu.com",
        headers: { "user-agent": 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Mobile Safari/537.36' }
      });
      if (res.status === 200) {
        baidu_token = /token: ('|")(.*?)('|")/.exec(res.responseText)[2];
        baidu_gtk = /('|")(\d{6}\.\d{9})('|")/.exec(res.responseText)[2];
      }
    } catch (e) { console.error('Baidu Mobile auth error:', e); }
  }

  async function authYandex() {
    yandex_uid = await extGetValue("yandexuid", "");
    yandex_spravka = await extGetValue("yandexspravka", "");
    try {
      const res = await extFetch({ method: "GET", url: "https://translate.yandex.com" });
      if (res.status === 200) {
        yandex_reqid = yandex_reqid || /reqid = '(.*?)'/i.exec(res.responseText)[1];
      }
    } catch (e) { console.error('Yandex auth error:', e); }
  }

  async function authCNKI() {
    CNKI_TOKEN = await extGetValue("CNKI_TOKEN", "");
    if (!CNKI_TOKEN) Toast.error("CNKI_TOKEN不存在，请前往 https://dict.cnki.net 获取");
  }

  async function authWps() {
    wps_xcsrftoken = await extGetValue("wps_xcsrftoken", "");
    if (!wps_xcsrftoken) Toast.error("wps_xcsrftoken为空，请打开 https://kuaiyi.wps.cn/ 获取");
  }

  // ==================== Translate To ====================
  async function translateTo(lang, rootNode, noclear) {
    if (!noclear) clearSpan(lang);

    if (currentAPI.name === APIConst.Microsoft) await auth();
    if (currentAPI.name === APIConst.SogouWeb && !secretCode) await authSogou();
    if (currentAPI.name === APIConst.CaiyunWeb) { await authCaiyun(); if (!caiyun_JWT) return; }
    if (currentAPI.name === APIConst.AlibabaWeb && !ali_uuid) { await authAliBaba(); if (!ali_uuid) return; }
    if (currentAPI.name === APIConst.BaiduMobileWeb && (!baidu_token || !baidu_gtk)) { await authBaiduMobile(); if (!baidu_token) return; }
    if (currentAPI.name === APIConst.YandexWeb && !yandex_reqid) { await authYandex(); if (!yandex_reqid) return; }
    if (currentAPI.name === APIConst.CNKIWeb && !CNKI_TOKEN) { await authCNKI(); if (!CNKI_TOKEN) return; }
    if (currentAPI.name === APIConst.WPSKuaiyiWeb && !wps_xcsrftoken) { await authWps(); if (!wps_xcsrftoken) return; }

    console.log(`translate to....${lang} : ${currentAPI.name}`);
    let root = document.body;
    if (location.host.includes("twitter.com") || location.host.includes("x.com")) {
      root = document.querySelector('div[data-testid="primaryColumn"]') || root;
    }
    traversePlus(rootNode || root, lang);
  }

  // ==================== Switch API ====================
  function switchAPI(openWeb, targetIndex, silent) {
    try {
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < engineList.length) {
        switchIndex = targetIndex;
      } else {
        switchIndex = (getCurrentEngineIndex() + 1) % engineList.length;
      }
      const engine = engineList[switchIndex];
      currentAPI = engine.api;
      if (!silent) Toast.success(engine.toast || `已经切换${engine.name}翻译`);
      if (openWeb && engine.openUrl) {
        extOpenTab(engine.openUrl);
      }
    } catch (e) { }
    selectTolang = currentAPI.ChineseLang;
    extSetValue("switchIndex", switchIndex);
  }

  // ==================== Load Config ====================
  async function loadConfig() {
    TRANSMART_CLIENT_KEY = await extGetValue("TRANSMART_CLIENT_KEY",
      `browser-chrome-${getChromeVersion()}-Windows_10-${uuidv4()}-${Date.now()}`);
    isDoubleShow = await extGetValue("isDoubleShow", true);
    isHighlight = await extGetValue("isHighlight", true);
    englishAutoTranslate = await extGetValue("englishAutoTranslate", false);
    leftSelectMode = await extGetValue("leftSelectMode", false);
    highlightColor = await extGetValue("highlightColor", highlightColor);

    const selectlang = await extGetValue("selectTolang", "ChineseLang");
    if (selectlang === 'ChineseLang') selectTolang = currentAPI.ChineseLang;
    else selectTolang = currentAPI.EnglishLang;

    scrollTranslate = !!localStorage.getItem("scrollTranslate");

    try {
      const savedIndex = await extGetValue("switchIndex", 0);
      switchAPI(false, savedIndex, true);
    } catch (ex) { switchIndex = 0; }

    try {
      if (isSupportMultiLang()) {
        const selectForeignLang = await extGetValue("selectForeignLang");
        if (selectForeignLang) currentAPI.EnglishLang = selectForeignLang;
      }
    } catch (ex) { }

    const excludeSitesConfig = await extGetValue("excludeSites");
    if (excludeSitesConfig) {
      try { excludeSites = JSON.parse(excludeSitesConfig); } catch (e) { }
    }

    if (leftSelectMode) {
      leftSelectMode = false;
      leftSelect(true);
    }
  }

  // ==================== Selection Translation ====================
  function handleMouseUpOrTouchend(event) {
    event.stopPropagation();
    if (event.target.closest('#copyTranslatedText')) {
      extSetClipboard(document.querySelector('#qs_selectedText').innerText);
      Toast.success("复制成功!");
      return;
    }

    const selectText = window.getSelection().toString();
    if (event.target.closest('#qs_searchBoxOuter')) return;
    document.querySelectorAll('#qs_searchBoxOuter').forEach(item => item.remove());
    if (!selectText) return;

    let mouseX = event.pageX, mouseY = event.pageY;
    if (event.changedTouches && event.changedTouches.length > 0) {
      mouseX = event.changedTouches[0].pageX;
      mouseY = event.changedTouches[0].pageY;
    }

    const box = document.createElement('div');
    box.id = 'qs_searchBoxOuter';
    box.innerHTML = `
      <a id="qs_searchBox" style="display:block;left:${mouseX - 10}px;top:${mouseY}px;">
        <div id="qs_selectedText">${selectText}</div>
        <hr>
        <div id="qs_searchIconInner">
          <span id="copyTranslatedText" style="cursor:pointer;">📋</span>
        </div>
      </a>`;
    document.body.appendChild(box);

    const old_isDoubleShow = isDoubleShow;
    isDoubleShow = false;
    translateTo(selectTolang, box, true);
    setTimeout(() => { isDoubleShow = old_isDoubleShow; }, 2000);
  }

  function leftSelect(noToast) {
    if (leftSelectMode) {
      leftSelectMode = false;
      document.removeEventListener('mouseup', handleMouseUpOrTouchend);
      document.removeEventListener('touchcancel', handleMouseUpOrTouchend);
      if (!noToast) Toast.success('选词翻译已经关闭');
    } else {
      leftSelectMode = true;
      document.addEventListener('mouseup', handleMouseUpOrTouchend);
      document.addEventListener('touchcancel', handleMouseUpOrTouchend);
      if (!noToast) Toast.success('选词翻译已经开启');
    }
    extSetValue("leftSelectMode", leftSelectMode);
  }

  // Right-click select mode
  function handleMouseout(event) {
    if (event.target.classList.contains('translate-main')) return;
    event.target.style.border = '';
  }

  function handleMousemove(event) {
    if (event.target.classList.contains('translate-main')) return;
    event.target.style.border = '1px solid red';
  }

  function handleContextmenu(event) {
    event.preventDefault();
    event.target.style.border = '';
    translateTo(selectTolang, event.target);
  }

  function rightSelectMode() {
    if (selectMode) {
      selectMode = false;
      document.removeEventListener('mousemove', handleMousemove);
      document.removeEventListener('mouseout', handleMouseout);
      document.removeEventListener('contextmenu', handleContextmenu);
      Toast.success('鼠标右击选词翻译已经关闭');
    } else {
      selectMode = true;
      document.addEventListener('mousemove', handleMousemove);
      document.addEventListener('mouseout', handleMouseout);
      document.addEventListener('contextmenu', handleContextmenu);
      Toast.success('鼠标右击选词翻译已经开启');
    }
  }

  // ==================== Auto Translate ====================
  function isChinesePage() {
    const lang = document.documentElement.lang;
    const mainLang = document.characterSet.toLowerCase();
    const pageTitle = document.title;
    return lang.substring(0, 2) === 'zh' || mainLang.substring(0, 2) === 'gb' || /[一-鿿]/.test(pageTitle);
  }

  // ==================== Exclude Sites ====================
  if (excludeSites.includes(location.host)) {
    console.log('当前网站不允许运行');
    return;
  }

  // ==================== Initialize ====================
  try { await loadConfig(); } catch (e) { console.error("load config error:", e); }

  // Inject highlight color style
  const highlightStyle = document.createElement('style');
  highlightStyle.textContent = `.translate-span.light-color { color: ${highlightColor} !important; }`;
  document.head.appendChild(highlightStyle);

  // Create sidebar
  const sidebar = createSidebar();
  document.body.appendChild(sidebar);

  // ==================== Sidebar Events ====================
  const translatemainDom = document.querySelector(".translate-main");
  const translatearrow = document.querySelector(".translate-arrow");

  if (!isMobile()) {
    translatemainDom.addEventListener("mouseover", () => translatemainDom.classList.add("unfold"));
    translatearrow.addEventListener("mouseout", (e) => { e.stopPropagation(); translatemainDom.classList.remove("unfold"); });
    translatemainDom.addEventListener('mouseleave', () => translatemainDom.classList.remove('unfold'));
  } else {
    translatemainDom.addEventListener("click", () => translatemainDom.classList.add("unfold"));
    translatearrow.addEventListener("click", (e) => { e.stopPropagation(); translatemainDom.classList.remove("unfold"); });
  }

  // en2zh
  document.querySelector("#en2zh").addEventListener("click", (e) => {
    e.stopPropagation();
    Toast.info(`正在翻译.....当前引擎:${engineList[getCurrentEngineIndex()].name}`);
    translateTo(currentAPI.ChineseLang);
  });

  // zh2en
  document.querySelector("#zh2en").addEventListener("click", (e) => {
    e.stopPropagation();
    Toast.info(`正在翻译.....当前引擎:${engineList[getCurrentEngineIndex()].name}`);
    translateTo(currentAPI.EnglishLang);
  });

  // sourceText
  const sourceTextBtn = document.querySelector("#sourceText");
  sourceTextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (sourceTextBtn.querySelector("span").innerText === '原文') {
      document.querySelectorAll(".translate-span").forEach(n => n.classList.add("hide"));
      document.querySelectorAll(".translate-src").forEach(n => n.classList.remove("hide"));
      sourceTextBtn.querySelector("span").innerText = '译文';
    } else {
      document.querySelectorAll(".translate-span").forEach(n => n.classList.remove("hide"));
      document.querySelectorAll(".translate-src").forEach(n => n.classList.add("hide"));
      sourceTextBtn.querySelector("span").innerText = '原文';
    }
  });

  // doubleShow
  document.querySelector("#doubleShow").addEventListener("click", (e) => {
    e.stopPropagation();
    isDoubleShow = !isDoubleShow;
    isDoubleShow ? Toast.success("双显已开") : Toast.error("双显已关");
    extSetValue("isDoubleShow", isDoubleShow);
  });

  // highlight
  document.querySelector("#highlightTranslateText").addEventListener("click", (e) => {
    e.stopPropagation();
    isHighlight = !isHighlight;
    isHighlight ? Toast.success("高亮已开") : Toast.error("高亮已关");
    extSetValue("isHighlight", isHighlight);
  });

  // leftSelectMode
  document.querySelector("#leftSelectMode").addEventListener("click", (e) => {
    e.stopPropagation();
    leftSelect();
  });

  // rightSelectMode
  document.querySelector("#rightSelectMode").addEventListener("click", (e) => {
    e.stopPropagation();
    rightSelectMode();
  });

  // switchAPI - open settings panel
  document.querySelector("#switchAPI").addEventListener("click", (e) => {
    e.stopPropagation();
    // Remove existing panel
    const existing = document.getElementById('MyColorSelector');
    if (existing) { existing.remove(); return; }

    const panel = createSettingsPanel({ engineList, currentAPI, highlightColor, isMobile });
    document.body.appendChild(panel);

    // Color preview
    const nativeColorPicker = document.getElementById('nativeColorPicker');
    const colorDisplay = document.getElementById('colorDisplay');
    const colorHex = document.getElementById('colorHex');
    const colorPreview = document.getElementById('colorPreview');

    function updateColorDisplay(hexColor) {
      colorDisplay.style.backgroundColor = hexColor;
      colorHex.textContent = hexColor;
      colorPreview.style.color = hexColor;
    }
    updateColorDisplay(nativeColorPicker.value);
    nativeColorPicker.addEventListener("input", (ev) => updateColorDisplay(ev.target.value));

    // Save color
    document.getElementById('selectColorBtn').addEventListener("click", () => {
      extSetValue("highlightColor", nativeColorPicker.value);
      Toast.success("请重新刷新页面生效!");
      panel.remove();
    });

    // Cancel
    document.getElementById('selectColorCancelBtn').addEventListener("click", () => panel.remove());

    // Scroll translate
    document.getElementById('scrollBtn').addEventListener("click", () => {
      if (scrollTranslate) {
        localStorage.removeItem("scrollTranslate");
        scrollTranslate = false;
        Toast.error("本站滚动翻译已关！");
        window.removeEventListener('scroll', handleScroll);
      } else {
        localStorage.setItem("scrollTranslate", "open");
        scrollTranslate = true;
        Toast.info("本站滚动翻译已开！");
        window.addEventListener('scroll', handleScroll);
      }
    });

    // Engine selection
    document.getElementById('engineGrid').addEventListener('click', (ev) => {
      const card = ev.target.closest('.engine-card');
      if (!card) return;
      switchAPI(true, parseInt(card.dataset.engineIndex));
      panel.remove();
    });

    // Foreign language
    document.getElementById('selectForeignBtn').addEventListener('click', () => {
      const selectEl = document.getElementById('selectForeign');
      const selectedValue = selectEl.options[selectEl.selectedIndex].value;
      if (isSupportMultiLang()) {
        currentAPI.EnglishLang = selectedValue;
        Toast.success("设置成功！" + selectedValue);
        localStorage.removeItem(`${currentAPI.name}wordCache`);
        extSetValue("selectForeignLang", selectedValue);
        panel.remove();
      } else {
        Toast.error("暂时仅支持腾讯交互，谷歌，微软, 手机有道,阿里翻译。请切换引擎后设置");
      }
    });

    Toast.info(`当前引擎: ${engineList[getCurrentEngineIndex()].name}`);
  });

  // autoTranslateSwitch
  document.querySelector("#autoTranslateSwitch").addEventListener("click", (e) => {
    e.stopPropagation();
    englishAutoTranslate = !englishAutoTranslate;
    extSetValue("englishAutoTranslate", englishAutoTranslate);
    englishAutoTranslate ? Toast.success('外语自动翻译已打开! 请重新刷新页面.') : Toast.error('外语自动翻译已关闭! 请重新刷新页面.');
  });

  // changeSelectLang
  document.querySelector("#changeSelectLang").addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectTolang === currentAPI.ChineseLang) {
      selectTolang = currentAPI.EnglishLang;
      Toast.success('当前目标语言为外语');
      extSetValue("selectTolang", "EnglishLang");
    } else {
      selectTolang = currentAPI.ChineseLang;
      Toast.success('当前目标语言为中文');
      extSetValue("selectTolang", "ChineseLang");
    }
  });

  // updateScript
  document.querySelector("#updateScript").addEventListener("click", (e) => {
    e.stopPropagation();
    extOpenTab("https://greasyfork.org/zh-CN/scripts/469073");
  });

  // ==================== Scroll Translate ====================
  let documentHeight = document.documentElement.scrollHeight;
  function handleScroll() {
    const currentDocumentHeight = document.documentElement.scrollHeight;
    if (currentDocumentHeight > documentHeight) {
      documentHeight = currentDocumentHeight;
      translateTo(selectTolang);
    }
  }

  if (scrollTranslate) {
    window.addEventListener('scroll', handleScroll);
  }

  // ==================== Auto Translate ====================
  setTimeout(async () => {
    if (englishAutoTranslate && !isChinesePage()) {
      Toast.success('检测到外文, 正在自动翻译...');
      translateTo(currentAPI.ChineseLang);
    }
  }, 2000);

  // ==================== Triple Space Translate ====================
  setTimeout(() => {
    let spaceCount = 0;
    let lastKeyPressTime = 0;
    const timeThreshold = 300;

    document.body.addEventListener('keydown', (event) => {
      if (event.key === ' ' || event.keyCode === 32) {
        const currentTime = Date.now();
        if (currentTime - lastKeyPressTime < timeThreshold) {
          spaceCount++;
        } else {
          spaceCount = 1;
        }
        lastKeyPressTime = currentTime;
        if (spaceCount === 3) {
          const node = event.target;
          Toast.success(`正在翻译...=>${selectTolang}`);
          if (/(input|textarea)/i.test(node.nodeName)) {
            node.setAttribute("triple", "triple");
            dispatchAPI(node.innerText || node.value.trim(), node, selectTolang);
          }
          spaceCount = 0;
        }
      }
    });
  }, 2000);

  // ==================== Context Menu Messages ====================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'translateSelection':
        if (message.lang) {
          const lang = message.lang === 'zh' ? currentAPI.ChineseLang : currentAPI.EnglishLang;
          translateTo(lang);
        }
        break;
      case 'translatePage':
        translateTo(currentAPI.ChineseLang);
        break;
      case 'restorePage':
        clearSpan(currentAPI.ChineseLang);
        break;
    }
  });

  console.log("=========中英双显互译 (Chrome Extension)=======");
})();

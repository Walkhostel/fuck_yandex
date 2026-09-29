const BLOCKED_DOMAINS = new Set([
  "yandex.ru",
  "yandex.com",
  "yandex.by",
  "yandex.kz",
  "yandex.ua",
  "yandex.com.ua",
  "yandex.uz",
  "yandex.kg",
  "yandex.tj",
  "yandex.tm",
  "yandex.az",
  "yandex.md",
  "yandex.lt",
  "yandex.lv",
  "yandex.ee",
  "yandex.fr",
  "yandex.pl",
  "yandex.de",
  "yandex.eu",
  "yandex.asia",
  "yandex.com.tr",
  "yandex.com.am",
  "yandex.com.ge",
  "yandex.co.il",
  "ya.ru",
  "ya.cc",
  "yadi.sk",
  "yastatic.net",
  "yandexcloud.net",
  "yandex-team.ru",
  "yandex.org",
  "kinopoisk.ru",
  "dzen.ru",
  "clck.ru",
  "auto.ru",
  "afisha.ru",
  "edadeal.ru",
  "delivery-club.ru",
  "moikrug.ru",
  "yoomoney.ru",
]);

const TEMPORARY_ALLOW = new Map();
const TAB_HISTORY = new Map();

const ALLOW_TIME = 120_000;

function normalizeDomain(domain) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isDomainBlocked(hostname) {
  if (!hostname) {
    return false;
  }

  for (const domain of BLOCKED_DOMAINS) {
    const normalized = normalizeDomain(domain);

    if (
      hostname === normalized ||
      hostname.endsWith("." + normalized)
    ) {
      return true;
    }
  }

  return false;
}

function isTemporarilyAllowed(tabId, hostname) {
  const entry = TEMPORARY_ALLOW.get(tabId);

  if (!entry) {
    return false;
  }

  if (entry.expires <= Date.now()) {
    TEMPORARY_ALLOW.delete(tabId);
    return false;
  }

  return (
    hostname === entry.domain ||
    hostname.endsWith("." + entry.domain)
  );
}

browser.webNavigation.onCommitted.addListener(details => {
  if (details.frameId !== 0) {
    return;
  }

  let url;

  try {
    url = new URL(details.url);
  } catch {
    return;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  const old = TAB_HISTORY.get(details.tabId);

  TAB_HISTORY.set(details.tabId, {
    current: details.url,
    previous: old?.current ?? null
  });
});

browser.runtime.onMessage.addListener((message, sender) => {
  const tabId = message.tabId ?? sender.tab?.id;

  if (typeof tabId !== "number") {
    return Promise.resolve({ ok: false });
  }

  if (message.type === "allowOnce") {
    const hostname = getHostname(message.url);

    if (!hostname || !isDomainBlocked(hostname)) {
      return Promise.resolve({ ok: false });
    }

    TEMPORARY_ALLOW.set(tabId, {
      domain: hostname,
      expires: Date.now() + ALLOW_TIME
    });

    return Promise.resolve({ ok: true });
  }

  if (message.type === "goBack") {
    const history = TAB_HISTORY.get(tabId);

    if (!history?.previous) {
      browser.tabs.update(tabId, { url: "about:newtab" });
      return Promise.resolve({ ok: true });
    }

    browser.tabs.update(tabId, { url: history.previous });
    return Promise.resolve({ ok: true });
  }

  return Promise.resolve({ ok: false });
});

browser.tabs.onRemoved.addListener(tabId => {
  TEMPORARY_ALLOW.delete(tabId);
  TAB_HISTORY.delete(tabId);
});

browser.webRequest.onBeforeRequest.addListener(
  details => {
    if (details.type !== "main_frame") {
      return {};
    }

    const hostname = getHostname(details.url);

    if (!isDomainBlocked(hostname)) {
      return {};
    }

    if (isTemporarilyAllowed(details.tabId, hostname)) {
      return {};
    }

    const blockedPage =
      browser.runtime.getURL("blocked.html") +
      "?url=" +
      encodeURIComponent(details.url);

    return {
      redirectUrl: blockedPage
    };
  },
  {
    urls: [
      "http://*/*",
      "https://*/*"
    ],
    types: [
      "main_frame"
    ]
  },
  [
    "blocking"
  ]
);

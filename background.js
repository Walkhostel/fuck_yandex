const BLOCKED_DOMAINS = new Set([
  "yandex.ru"
]);

const TEMPORARY_ALLOW = new Map();

const ALLOW_TIME = 120_000; //2 min

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

browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "allowOnce") {
    const tabId = sender.tab?.id;

    if (typeof tabId !== "number") {
      return { ok: false };
    }

    const hostname = getHostname(message.url);

    if (!hostname || !isDomainBlocked(hostname)) {
      return { ok: false };
    }

    TEMPORARY_ALLOW.set(tabId, {
      domain: hostname,
      expires: Date.now() + ALLOW_TIME
    });

    return { ok: true };
  }

  if (message.type === "goBack") {
    const tabId = sender.tab?.id;

    if (typeof tabId !== "number") {
      return { ok: false };
    }

    browser.tabs.goBack(tabId).catch(() => {
      browser.tabs.update(tabId, {
        url: "about:blank"
      });
    });

    return { ok: true };
  }
});

browser.tabs.onRemoved.addListener(tabId => {
  TEMPORARY_ALLOW.delete(tabId);
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
    urls: ["http://*/*", "https://*/*"],
    types: ["main_frame"]
  },
  ["blocking"]
);

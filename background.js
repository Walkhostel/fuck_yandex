const DEFAULT_DOMAINS = [
  "yandex.ru"
];

const ALLOWED_ONCE = new Map();

async function getBlockedDomains() {
  const result = await browser.storage.local.get({
    blockedDomains: DEFAULT_DOMAINS
  });

  return result.blockedDomains;
}

function normalizeDomain(domain) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function isBlocked(url, domains) {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  return domains.some(domain => {
    domain = normalizeDomain(domain);

    return (
      hostname === domain ||
      hostname.endsWith("." + domain)
    );
  });
}

browser.runtime.onMessage.addListener(async message => {
  if (message.type !== "allowOnce") {
    return;
  }

  try {
    const url = new URL(message.url);

    ALLOWED_ONCE.set(message.url, Date.now() + 10_000);

    return { ok: true };
  } catch {
    return { ok: false };
  }
});

browser.webRequest.onBeforeRequest.addListener(
  async details => {
    const domains = await getBlockedDomains();

    if (!isBlocked(details.url, domains)) {
      return {};
    }

    const expiration = ALLOWED_ONCE.get(details.url);

    if (expiration && expiration > Date.now()) {
      ALLOWED_ONCE.delete(details.url);
      return {};
    }

    ALLOWED_ONCE.delete(details.url);

    const blockedPage =
      browser.runtime.getURL("blocked.html") +
      "?url=" +
      encodeURIComponent(details.url);

    return {
      redirectUrl: blockedPage
    };
  },
  {
    urls: ["<all_urls>"],
    types: ["main_frame"]
  },
  ["blocking"]
);

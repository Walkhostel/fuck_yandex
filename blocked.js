document.querySelectorAll('[data-i18n]').forEach(el => {
  const msg = browser.i18n.getMessage(el.dataset.i18n);
  if (msg) el.textContent = msg;
});

const params = new URLSearchParams(location.search);
const originalUrl = params.get("url");

const domainElement = document.getElementById("domain");
const backButton = document.getElementById("back");
const continueButton = document.getElementById("continue");

let validUrl = null;

if (originalUrl) {
  try {
    const url = new URL(originalUrl);
    validUrl = url.href;
    domainElement.textContent = browser.i18n.getMessage("domain", url.hostname);
  } catch {
    domainElement.textContent = browser.i18n.getMessage("invalidUrl");
  }
} else {
  domainElement.textContent = browser.i18n.getMessage("noUrl");
}

backButton.addEventListener("click", async () => {
  const tab = await browser.tabs.getCurrent();
  const result = await browser.runtime.sendMessage({
    type: "goBack",
    tabId: tab.id
  }).catch(() => null);

  if (!result?.ok) {
    history.back();
  }
});

continueButton.addEventListener("click", async () => {
  if (!validUrl) return;
  const tab = await browser.tabs.getCurrent();
  const result = await browser.runtime.sendMessage({
    type: "allowOnce",
    url: validUrl,
    tabId: tab.id
  }).catch(() => null);

  if (result?.ok) {
    window.location.replace(validUrl);
  }
});


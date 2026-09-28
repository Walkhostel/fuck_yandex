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
    domainElement.textContent = `Попытка открыть ${url.hostname}`;
  } catch {
    domainElement.textContent = "Некорректный URL";
  }
} else {
  domainElement.textContent = "Исходный URL отсутствует";
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

const params = new URLSearchParams(location.search);
const originalUrl = params.get("url");

const domainElement = document.getElementById("domain");
const backButton = document.getElementById("back");
const continueButton = document.getElementById("continue");

let hostname = null;

if (!originalUrl) {
  domainElement.textContent = "Исходный URL отсутствует";
  continueButton.disabled = true;
} else {
  try {
    const url = new URL(originalUrl);
    hostname = url.hostname;

    domainElement.textContent =
      `Попытка открыть ${hostname}`;
  } catch {
    domainElement.textContent = "Некорректный URL";
    continueButton.disabled = true;
  }
}

backButton.addEventListener("click", async () => {
  await browser.runtime.sendMessage({
    type: "goBack"
  });
});

continueButton.addEventListener("click", async () => {
  if (!originalUrl || !hostname) {
    return;
  }

  continueButton.disabled = true;

  const result = await browser.runtime.sendMessage({
    type: "allowOnce",
    url: originalUrl
  });

  if (result?.ok) {
    window.location.replace(originalUrl);
  } else {
    continueButton.disabled = false;
  }
});

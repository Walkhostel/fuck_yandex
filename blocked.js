const params = new URLSearchParams(location.search);
const originalUrl = params.get("url");

if (!originalUrl) {
  document.getElementById("domain").textContent =
    "Исходный URL отсутствует.";
} else {
  try {
    const url = new URL(originalUrl);

    document.getElementById("domain").textContent =
      `Вы пытаетесь открыть: ${url.hostname}`;
  } catch {
    document.getElementById("domain").textContent =
      "Некорректный URL.";
  }
}

document.getElementById("back").addEventListener("click", () => {
  history.back();
});

document.getElementById("continue").addEventListener("click", async () => {
  if (!originalUrl) {
    return;
  }

  const result = await browser.runtime.sendMessage({
    type: "allowOnce",
    url: originalUrl
  });

  if (result?.ok) {
    window.location.replace(originalUrl);
  }
});

const params = new URLSearchParams(location.search);
const testName = params.get("test");

if (!testName) {
  alert("No test selected");
  location.href = "index.html";
}

fetch(`tests/${testName}/test.json`)
  .then(r => r.json())
  .then(data => {
    document.title = `${data.title} — ${data.code}`;
    document.getElementById("testTitle").textContent = data.title;
    document.getElementById("startTitle").textContent = data.title;
    data.basePath = `tests/${testName}/`;
    window.TEST_DATA = data;
  })
  .catch(() => {
    alert("Test failed to load");
    location.href = "index.html";
  });

const params = new URLSearchParams(location.search);
const testName = params.get("test");

if (!testName) {
  alert("No test specified");
  throw new Error("Missing test param");
}

fetch(`tests/${testName}/test.json`)
  .then(r => {
    if (!r.ok) throw new Error("Test failed to load");
    return r.json();
  })
  .then(data => {
    data.basePath = `tests/${testName}/`;
    window.TEST_DATA = data;
    document.title = data.title;
    document.getElementById("testTitle").textContent = data.title;
  })
  .catch(err => {
    alert("Test failed to load");
    console.error(err);
  });

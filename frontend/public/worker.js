let array = [];
let fileName = "";
let fileSize = "";
self.addEventListener("message", (event) => {
  if (event.data === "download") {
    const blob = new Blob(array);
    self.postMessage({ blob, fileName, fileSize });
    array = [];
    fileName = "";
    fileSize = "";
  } else if (event.data.type === "metadata") {
    fileName = event.data.fileName;
    fileSize = event.data.fileSize;
  } else if (event.data === "cancel") {
    array = [];
  } else {
    array.push(event.data);
  }
});

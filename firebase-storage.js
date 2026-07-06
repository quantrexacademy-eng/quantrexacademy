// Quantrex — Firebase Storage (PDFs, images, profile photos)
const QuantrexStorage = (() => {
  let storage = null;

  function init() {
    if (storage) return true;
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.init()) {
      if (typeof firebase.storage === "function") {
        storage = firebase.storage();
        return true;
      }
    }
    return false;
  }

  function profileRef(uid, fileName) {
    return storage.ref().child("profiles/" + uid + "/" + fileName);
  }

  async function uploadProfilePhoto(uid, file) {
    if (!init() || !uid || !file) return null;
    const ref = profileRef(uid, "avatar.jpg");
    await ref.put(file, { contentType: file.type || "image/jpeg" });
    return ref.getDownloadURL();
  }

  function getPdfUrl(path) {
    if (!init()) return null;
    return storage.ref().child("pdfs/" + path).getDownloadURL();
  }

  function getBookAssetUrl(path) {
    if (!init()) return null;
    return storage.ref().child("books/" + path).getDownloadURL();
  }

  function getImageUrl(path) {
    if (!init()) return null;
    return storage.ref().child("images/" + path).getDownloadURL();
  }

  return {
    init,
    uploadProfilePhoto,
    getPdfUrl,
    getBookAssetUrl,
    getImageUrl
  };
})();
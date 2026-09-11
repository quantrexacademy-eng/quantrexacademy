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

  function teacherPdfRef(teacherId, fileName) {
    return storage.ref().child("teacher_pdfs/" + teacherId + "/" + fileName);
  }

  async function uploadTeacherPdf(teacherId, file, title) {
    if (!init() || !teacherId || !file) return null;
    const safe = String(file.name || "upload.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = Date.now() + "_" + safe;
    const ref = teacherPdfRef(teacherId, fileName);
    await ref.put(file, { contentType: "application/pdf" });
    const pdfUrl = await ref.getDownloadURL();
    return {
      id: teacherId + "_" + fileName,
      teacherId,
      type: "pdf",
      fileName,
      title: title || safe,
      url: pdfUrl,
      pdfUrl,
      uploadedAt: Date.now()
    };
  }

  function teacherVideoRef(teacherId, fileName) {
    return storage.ref().child("teacher_videos/" + teacherId + "/" + fileName);
  }

  async function uploadTeacherVideo(teacherId, file, title) {
    if (!init() || !teacherId || !file) return null;
    const safe = String(file.name || "upload.mp4").replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = Date.now() + "_" + safe;
    const ref = teacherVideoRef(teacherId, fileName);
    await ref.put(file, { contentType: file.type || "video/mp4" });
    const url = await ref.getDownloadURL();
    return {
      id: teacherId + "_" + fileName,
      teacherId,
      type: "video",
      fileName,
      title: title || safe,
      url,
      uploadedAt: Date.now()
    };
  }

  return {
    init,
    uploadProfilePhoto,
    uploadTeacherPdf,
    uploadTeacherVideo,
    getPdfUrl,
    getBookAssetUrl,
    getImageUrl
  };
})();
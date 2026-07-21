// Quantrex Teacher — Custom Test builder + Content Library (PDF, video, lecture links)
const QuantrexTeacherBuilder = (() => {
  let _active = false;
  let _contentTab = localStorage.getItem("qx_content_tab") || "pdf";

  function teacherId() {
    return JSON.parse(localStorage.getItem("quantrex_teacher_profile") || "{}").uid
      || JSON.parse(localStorage.getItem("quantrex_user") || "{}").uid;
  }

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  async function start(skipNav) {
    if (typeof fetchCtExams !== "function" || typeof ctNewDraft !== "function") {
      showToast("Custom test module loading…");
      return false;
    }
    await fetchCtExams();
    const exam = typeof ctDefaultExam === "function" ? ctDefaultExam() : null;
    if (!exam) { showToast("Exam catalog not ready"); return false; }
    _ctDraft = ctNewDraft(exam);
    _ctDraft.wizardStep = "pick";
    _ctDraft._teacherAssign = true;
    _active = true;
    if (!skipNav) {
      if (typeof QuantrexAssignments !== "undefined") {
        QuantrexAssignments.setTeacherTab("builder");
      } else {
        go("teacher");
      }
    }
    return true;
  }

  function close() {
    setLanding();
    if (typeof QuantrexAssignments !== "undefined") {
      QuantrexAssignments.setTeacherTab("builder");
    } else {
      go("teacher");
    }
  }

  function refresh() {
    go("teacher");
  }

  function setWizardActive() {
    _active = true;
  }

  function setLanding() {
    _active = false;
  }

  function isActive() {
    return _active && _ctDraft && _ctDraft._teacherAssign;
  }

  async function viewHtml() {
    if (typeof viewTeacherCustomTests !== "function") {
      return `<div class="assign-create-box">
        <h3>Create Own Test</h3>
        <p style="color:var(--gray)">Custom test module loading…</p>
        <button type="button" class="btn-soft" onclick="go('teacher')">Retry</button>
      </div>`;
    }
    const step = isActive() ? "wizard" : "landing";
    const html = await viewTeacherCustomTests({ step, teacherMode: true });
    return `${typeof QuantrexAssignments !== "undefined" ? QuantrexAssignments.teacherTabsHtml("builder") : ""}<div class="qx-teach-builder-wrap">${html}</div>`;
  }

  function onGenerated(record) {
    if (typeof QuantrexAssignments === "undefined") return;
    QuantrexAssignments.applyFromCustomTest(record);
    showToast("Test ready — select batches to publish");
  }

  async function saveContent(meta) {
    const tid = teacherId();
    if (!tid || !meta) throw new Error("Login required");
    const doc = {
      id: meta.id || `${tid}_${Date.now()}`,
      teacherId: tid,
      type: meta.type || "pdf",
      title: meta.title || "Untitled",
      url: meta.url || meta.pdfUrl || "",
      fileName: meta.fileName || null,
      description: meta.description || "",
      uploadedAt: meta.uploadedAt || Date.now()
    };
    if (doc.type === "pdf") doc.pdfUrl = doc.url;
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.db) {
      await QuantrexDB.db.collection("teacher_content").doc(doc.id).set(doc, { merge: true });
      if (doc.type === "pdf") {
        await QuantrexDB.db.collection("teacher_pdf_files").doc(doc.id).set({
          id: doc.id, teacherId: tid, title: doc.title, pdfUrl: doc.url, fileName: doc.fileName, uploadedAt: doc.uploadedAt
        }, { merge: true });
      }
    }
    return doc;
  }

  async function uploadPdf(file, title) {
    const tid = teacherId();
    if (!tid || !file) throw new Error("Login required");
    if (typeof QuantrexStorage === "undefined" || !QuantrexStorage.uploadTeacherPdf) {
      throw new Error("Storage not ready");
    }
    const meta = await QuantrexStorage.uploadTeacherPdf(tid, file, title || file.name);
    return saveContent(meta);
  }

  async function uploadVideo(file, title) {
    const tid = teacherId();
    if (!tid || !file) throw new Error("Login required");
    if (typeof QuantrexStorage === "undefined" || !QuantrexStorage.uploadTeacherVideo) {
      throw new Error("Storage not ready");
    }
    const meta = await QuantrexStorage.uploadTeacherVideo(tid, file, title || file.name);
    return saveContent(meta);
  }

  async function saveLectureLink(title, url, description) {
    const tid = teacherId();
    if (!tid || !url) throw new Error("Link required");
    const normalized = String(url).trim();
    if (!/^https?:\/\//i.test(normalized)) throw new Error("Enter a valid http(s) link");
    return saveContent({
      id: `${tid}_link_${Date.now()}`,
      teacherId: tid,
      type: "lecture_link",
      title: title || "Lecture Recording",
      url: normalized,
      description: description || ""
    });
  }

  async function saveVideoLink(title, url, description) {
    const tid = teacherId();
    if (!tid || !url) throw new Error("Link required");
    const normalized = String(url).trim();
    if (!/^https?:\/\//i.test(normalized)) throw new Error("Enter a valid http(s) link");
    return saveContent({
      id: `${tid}_vidlink_${Date.now()}`,
      teacherId: tid,
      type: "video",
      title: title || "Video",
      url: normalized,
      description: description || "",
      fileName: null
    });
  }

  async function listContent(type) {
    const tid = teacherId();
    if (!tid) return [];
    const out = [];
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.db) {
      try {
        const snap = await QuantrexDB.db.collection("teacher_content")
          .where("teacherId", "==", tid).limit(80).get();
        snap.docs.forEach(d => out.push({ id: d.id, ...d.data() }));
      } catch (e) { /* */ }
      if (!out.length) {
        try {
          const legacy = await QuantrexDB.db.collection("teacher_pdf_files")
            .where("teacherId", "==", tid).limit(50).get();
          legacy.docs.forEach(d => {
            const data = d.data();
            out.push({
              id: d.id, ...data, type: "pdf",
              url: data.pdfUrl || data.url
            });
          });
        } catch (e) { /* */ }
      }
    }
    out.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
    if (type) return out.filter(c => c.type === type);
    return out;
  }

  async function listPdfs() {
    return listContent("pdf");
  }

  function contentTypeLabel(type) {
    if (type === "video") return "Video";
    if (type === "lecture_link") return "Lecture Link";
    return "PDF";
  }

  function contentTypeIcon(type) {
    if (type === "video") return "🎬";
    if (type === "lecture_link") return "🔗";
    return "📄";
  }

  function setContentTab(tab) {
    _contentTab = tab || "pdf";
    localStorage.setItem("qx_content_tab", _contentTab);
    if (typeof QuantrexAssignments !== "undefined") QuantrexAssignments.setTeacherTab("content");
    else go("teacher");
  }

  function contentCard(f) {
    const type = f.type || "pdf";
    const url = f.url || f.pdfUrl || "";
    const desc = f.description ? `<p style="font-size:12px;color:var(--gray);margin:4px 0 8px">${esc(f.description)}</p>` : "";
    const openBtn = url
      ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="btn-outline sm">Open</a>`
      : "";
    return `<div class="assign-card">
      <div class="assign-card-head"><strong>${contentTypeIcon(type)} ${esc(f.title || f.fileName || "Content")}</strong><span class="tag">${contentTypeLabel(type)}</span></div>
      ${desc}
      <p style="font-size:13px;color:var(--gray)">${f.uploadedAt ? new Date(f.uploadedAt).toLocaleString("en-IN") : ""}</p>
      ${openBtn}
      <button type="button" class="btn-primary sm" style="margin-left:8px" onclick="QuantrexTeacherBuilder.shareContent('${esc(f.id)}')">Share with Students →</button>
    </div>`;
  }

  async function viewContentLibraryHtml() {
    const tabs = [
      ["pdf", "📄 PDF Upload"],
      ["video", "🎬 Video"],
      ["lecture_link", "🔗 Lecture Recording Link"]
    ];
    const tabBar = `<div class="qx-teach-tabs" style="margin-bottom:16px">${tabs.map(([id, label]) =>
      `<button type="button" class="qx-teach-tab${_contentTab === id ? " on" : ""}" onclick="QuantrexTeacherBuilder.setContentTab('${id}')">${label}</button>`
    ).join("")}</div>`;

    const files = await listContent(_contentTab);
    const rows = files.map(contentCard).join("");

    let uploadPanel = "";
    if (_contentTab === "pdf") {
      uploadPanel = `
        <div class="assign-form-grid">
          <input type="text" id="taPdfTitle" class="assign-input" placeholder="PDF title (e.g. Mechanics Test 1)">
          <input type="file" id="taPdfFile" class="assign-input" accept="application/pdf,.pdf">
        </div>
        <button type="button" class="btn-primary" onclick="QuantrexTeacherBuilder.handleUpload()">Upload PDF →</button>`;
    } else if (_contentTab === "video") {
      uploadPanel = `
        <p style="font-size:13px;color:var(--gray);margin:0 0 12px">Upload a short clip (max 100 MB) <strong>or</strong> paste a YouTube / Drive / Zoom recording link.</p>
        <div class="assign-form-grid">
          <input type="text" id="taVideoTitle" class="assign-input" placeholder="Video title">
          <input type="file" id="taVideoFile" class="assign-input" accept="video/mp4,video/webm,video/*">
        </div>
        <button type="button" class="btn-primary sm" onclick="QuantrexTeacherBuilder.handleVideoUpload()">Upload Video File →</button>
        <div class="assign-form-grid" style="margin-top:14px">
          <input type="text" id="taVideoLink" class="assign-input" placeholder="Or paste video URL (YouTube, Drive…)">
          <input type="text" id="taVideoLinkDesc" class="assign-input" placeholder="Short note (optional)">
        </div>
        <button type="button" class="btn-outline sm" onclick="QuantrexTeacherBuilder.handleVideoLink()">Save Video Link →</button>`;
    } else {
      uploadPanel = `
        <p style="font-size:13px;color:var(--gray);margin:0 0 12px">Share lecture recording links — Google Drive, Zoom cloud, YouTube unlisted, etc.</p>
        <div class="assign-form-grid">
          <input type="text" id="taLinkTitle" class="assign-input" placeholder="Lecture title (e.g. Electrostatics — Class 12)">
          <input type="url" id="taLinkUrl" class="assign-input" placeholder="https://… recording link">
          <input type="text" id="taLinkDesc" class="assign-input" placeholder="Topic / batch note (optional)">
        </div>
        <button type="button" class="btn-primary" onclick="QuantrexTeacherBuilder.handleLectureLink()">Save Lecture Link →</button>`;
    }

    return `
    <div class="assign-create-box">
      <h3>Content Library</h3>
      <p style="color:var(--gray);font-size:14px;margin:8px 0 16px">Upload PDFs, share videos, and post lecture recording links — assign or share directly with your batch.</p>
      ${tabBar}
      ${uploadPanel}
    </div>
    <div class="assign-grid" style="margin-top:16px">${rows || `<div class="empty">No ${contentTypeLabel(_contentTab).toLowerCase()} items yet.</div>`}</div>`;
  }

  async function viewPdfFolderHtml() {
    return viewContentLibraryHtml();
  }

  async function handleUpload() {
    const file = document.getElementById("taPdfFile")?.files?.[0];
    const title = document.getElementById("taPdfTitle")?.value?.trim();
    if (!file) { showToast("Choose a PDF file"); return; }
    if (file.size > 15 * 1024 * 1024) { showToast("Max 15 MB PDF"); return; }
    try {
      showToast("Uploading…");
      await uploadPdf(file, title || file.name);
      showToast("PDF uploaded!");
      setContentTab("pdf");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Upload failed"));
    }
  }

  async function handleVideoUpload() {
    const file = document.getElementById("taVideoFile")?.files?.[0];
    const title = document.getElementById("taVideoTitle")?.value?.trim();
    if (!file) { showToast("Choose a video file"); return; }
    if (file.size > 100 * 1024 * 1024) { showToast("Max 100 MB video"); return; }
    try {
      showToast("Uploading video…");
      await uploadVideo(file, title || file.name);
      showToast("Video uploaded!");
      setContentTab("video");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Upload failed"));
    }
  }

  async function handleVideoLink() {
    const title = document.getElementById("taVideoTitle")?.value?.trim()
      || document.getElementById("taVideoLink")?.value?.trim()?.slice(0, 40);
    const url = document.getElementById("taVideoLink")?.value?.trim();
    const desc = document.getElementById("taVideoLinkDesc")?.value?.trim();
    if (!url) { showToast("Paste a video URL"); return; }
    try {
      await saveVideoLink(title, url, desc);
      showToast("Video link saved!");
      setContentTab("video");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Failed"));
    }
  }

  async function handleLectureLink() {
    const title = document.getElementById("taLinkTitle")?.value?.trim();
    const url = document.getElementById("taLinkUrl")?.value?.trim();
    const desc = document.getElementById("taLinkDesc")?.value?.trim();
    if (!url) { showToast("Enter lecture recording URL"); return; }
    try {
      await saveLectureLink(title, url, desc);
      showToast("Lecture link saved!");
      setContentTab("lecture_link");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Failed"));
    }
  }

  function assignPdf(id, title, url) {
    shareContentByMeta({ id, title, type: "pdf", url: url || "", pdfUrl: url });
  }

  async function shareContent(contentId) {
    const items = await listContent();
    const item = items.find(c => c.id === contentId);
    if (!item) { showToast("Content not found"); return; }
    shareContentByMeta(item);
  }

  function shareContentByMeta(meta) {
    if (typeof QuantrexAssignments === "undefined") return;
    QuantrexAssignments.applyFromContent(meta);
  }

  return {
    start, close, refresh, isActive, setWizardActive, setLanding, viewHtml, onGenerated,
    uploadPdf, uploadVideo, listPdfs, listContent, viewPdfFolderHtml, viewContentLibraryHtml,
    handleUpload, handleVideoUpload, handleVideoLink, handleLectureLink,
    assignPdf, shareContent, setContentTab
  };
})();
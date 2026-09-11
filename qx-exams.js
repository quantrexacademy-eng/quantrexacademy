/** All Quantrex website exams + Other — for flexible registration / inquiry. */
window.QxExams = (function () {
  const GROUPS = [
    {
      id: "engineering",
      label: "Engineering",
      items: [
        "JEE Main", "JEE Advanced", "MHT CET", "BITSAT", "COMEDK", "VITEEE",
        "Manipal MET", "KCET", "TS EAPCET", "AP EAPCET", "WBJEE", "IISER IAT", "NEST", "KVPY"
      ]
    },
    {
      id: "medical",
      label: "Medical",
      items: ["NEET", "AIIMS", "JIPMER"]
    },
    {
      id: "defence",
      label: "Defence",
      items: ["NDA"]
    },
    {
      id: "academic",
      label: "Academic",
      items: [
        "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
        "Olympiad", "IIT Foundation"
      ]
    }
  ];

  function allNames() {
    const out = [];
    GROUPS.forEach(function (g) { g.items.forEach(function (n) { out.push(n); }); });
    return out;
  }

  function checkboxHtml(selected) {
    const sel = {};
    (selected || []).forEach(function (n) { sel[String(n)] = true; });
    return GROUPS.map(function (g) {
      const boxes = g.items.map(function (n) {
        const id = "ex_" + n.replace(/\s+/g, "_");
        return '<label class="qx-ex-chip"><input type="checkbox" name="qxExam" value="' + n.replace(/"/g, "&quot;") + '"' +
          (sel[n] ? " checked" : "") + '> ' + n + "</label>";
      }).join("");
      return '<div class="qx-ex-group"><div class="qx-ex-lab">' + g.label + '</div><div class="qx-ex-chips">' + boxes + '</div></div>';
    }).join("") +
      '<label class="qx-ex-chip qx-ex-other"><input type="checkbox" id="qxExamOtherOn" name="qxExamOtherOn" value="Other"' +
      (sel.Other ? " checked" : "") + '> Other</label>' +
      '<input type="text" id="qxExamOther" class="qx-ex-other-in" placeholder="Other exam" maxlength="48"' +
      (sel.Other ? "" : " hidden") + ">";
  }

  function readChecked(root) {
    const scope = root || document;
    const out = [];
    scope.querySelectorAll('input[name="qxExam"]:checked').forEach(function (el) {
      out.push(el.value);
    });
    const otherOn = scope.querySelector("#qxExamOtherOn");
    const otherIn = scope.querySelector("#qxExamOther");
    if (otherOn && otherOn.checked) {
      const t = otherIn && otherIn.value ? String(otherIn.value).trim() : "Other";
      if (t) out.push(t);
    } else if (otherIn && otherIn.value && String(otherIn.value).trim()) {
      out.push(String(otherIn.value).trim());
    }
    return out;
  }

  function bind(root) {
    const scope = root || document;
    const otherOn = scope.querySelector("#qxExamOtherOn");
    const otherIn = scope.querySelector("#qxExamOther");
    if (!otherOn || !otherIn || otherOn._qxBound) return;
    otherOn._qxBound = true;
    function sync() {
      otherIn.hidden = !otherOn.checked;
      if (otherOn.checked) otherIn.focus();
    }
    otherOn.addEventListener("change", sync);
    sync();
  }

  return { GROUPS: GROUPS, allNames: allNames, checkboxHtml: checkboxHtml, readChecked: readChecked, bind: bind };
})();

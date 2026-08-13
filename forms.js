/* Lead forms → email, via Web3Forms.
   ------------------------------------------------------------------
   ONE THING TO DO BEFORE LAUNCH:
   1. Go to https://web3forms.com, enter morgan.amos@kpdd.com, and they
      email you an access key (free, no account needed).
   2. Paste that key between the quotes below and redeploy.

   Until the key is filled in, the forms fall back to opening the
   visitor's email app with the message pre-filled, so no lead is ever
   silently lost. */

var WEB3FORMS_ACCESS_KEY = "PASTE-YOUR-WEB3FORMS-ACCESS-KEY-HERE";
var FALLBACK_EMAIL = "morgan.amos@kpdd.com";

(function () {
  var forms = document.querySelectorAll("form[data-lead-form]");
  if (!forms.length) return;
  var keyed = /^[0-9a-f-]{20,}$/i.test(WEB3FORMS_ACCESS_KEY);

  Array.prototype.forEach.call(forms, function (form) {
    var button = form.querySelector("button[type=submit]");
    var note = form.querySelector(".form-note");
    var label = button ? button.textContent : "";

    if (keyed) {
      var key = document.createElement("input");
      key.type = "hidden";
      key.name = "access_key";
      key.value = WEB3FORMS_ACCESS_KEY;
      form.appendChild(key);
    }

    function say(text) { if (note) note.textContent = text; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);

      if (!keyed) { mailto(data); return; }

      button.disabled = true;
      button.textContent = "Sending\u2026";
      say("");

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data
      })
        .then(function (r) { return r.json(); })
        .then(function (json) {
          if (!json.success) throw new Error(json.message || "Submission failed");
          button.textContent = "Thank you, Morgan will be in touch.";
          if (typeof gtag === "function") {
            gtag("event", "generate_lead", {
              form_name: form.className.indexOf("seller") > -1 ? "seller_inquiry" : "buyer_inquiry"
            });
          }
          say("Your message is on its way. Morgan replies personally, usually the same day.");
          form.querySelectorAll(".field").forEach(function (f) { f.value = ""; });
        })
        .catch(function () {
          button.disabled = false;
          button.textContent = label;
          say("That didn't send. Call or text (706) 888-1865, or email " + FALLBACK_EMAIL + ".");
          mailto(data);
        });
    });

    function mailto(data) {
      var lines = [];
      data.forEach(function (value, name) {
        if (!value || name === "access_key" || name === "botcheck" || name === "from_name" || name === "subject") return;
        lines.push(name.replace(/_/g, " ") + ": " + value);
      });
      var subject = data.get("subject") || "Website inquiry";
      window.location.href =
        "mailto:" + FALLBACK_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      if (button) { button.textContent = "Opening your email\u2026"; }
    }
  });
})();

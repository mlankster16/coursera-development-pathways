/* Coursera Development Pathways — page behaviours. Vanilla, no dependencies.
   Two behaviours, both on find-your-pathway.html:
     - Pathway finder: a step-by-step question flow (data-step / data-pick)
     - FAQ accordion: independent rows (data-faq), all expanded for print
   Anchor offsets on the pathway pages are handled in site.css
   (scroll-margin-top), so they need no script. */
(function () {
  'use strict';

  /* ---- Pathway finder ------------------------------------------------ */
  var steps = document.querySelectorAll('[data-step]');
  if (steps.length) {
    var state;
    var reset = function () {
      state = { step: 0, track: null, readiness: null, complex: null, familiar: null };
    };
    reset();

    var PAGES = {
      course: 'course-pathways.html',
      specialization: 'specialization-pathways.html'
    };
    var STANDARD = { title: 'Standard Development', duration: 'Approximately 6 months', url: PAGES.course + '#standard', blurb: 'The Course is beginning with limited Coursera or online learning experience, little existing source content, and a need for meaningful learning design support.' };
    var SPEC_CUSTOM = { title: 'Custom Development', duration: 'Approximately 12–24 months', url: PAGES.specialization + '#custom', blurb: 'The Specialization includes complex design needs, substantial new development, external requirements, or multiple levels of review and approval.' };

    var computeResult = function (s) {
      if (s.complex) {
        return s.track === 'course'
          ? { title: 'Custom Development', duration: 'Approximately 6+ months', url: PAGES.course + '#custom', blurb: 'The Course includes complex design needs, external requirements, substantial content development, or other factors that require a tailored process.' }
          : SPEC_CUSTOM;
      }
      if (s.track === 'course') {
        if (s.readiness === 'a') return { title: 'Ready to Publish', duration: 'Approximately 4–6 weeks', url: PAGES.course + '#ready-to-publish', blurb: 'The Course content is complete and ready for review, build, and publication.' };
        if (s.readiness === 'b') return { title: 'Accelerated: Existing Content Is Ready', duration: 'Approximately 3 months', url: PAGES.course + '#accelerated-existing', blurb: 'Most of the Course content already exists and needs focused adaptation for a commercial online learning environment.' };
        if (s.readiness === 'c') return s.familiar
          ? { title: 'Accelerated: The Learning Plan Is Ready', duration: 'Approximately 4 months', url: PAGES.course + '#accelerated-plan', blurb: 'The Course structure and learning plan are already clear, but most of the Learning Assets still need to be developed.' }
          : STANDARD;
        return STANDARD;
      }
      if (s.readiness === 'a') return { title: 'Ready to Publish', duration: 'Approximately 1–2 months', url: PAGES.specialization + '#ready-to-publish', blurb: 'The Courses and Specialization content are complete and ready for review, build, and publication.' };
      if (s.readiness === 'b') return { title: 'Ready to Adapt', duration: 'Approximately 4–6 months', url: PAGES.specialization + '#ready-to-adapt', blurb: 'Most Course content already exists and needs focused adaptation for a commercial online learning environment.' };
      if (s.readiness === 'c') return { title: 'Ready to Develop', duration: 'Approximately 6–10 months', url: PAGES.specialization + '#ready-to-develop', blurb: 'The Specialization vision, Course outcomes, and learning plan are clear, but most Learning Assets still need to be developed.' };
      return SPEC_CUSTOM;
    };

    var texts = function (s) {
      var course = s.track === 'course';
      var t = {
        readinessQuestion: course
          ? 'How ready is your Course content?'
          : 'How ready is your Specialization and Course content?',
        readinessA: 'Content is complete and ready for review',
        readinessB: course ? 'Most content exists, but needs adapting' : 'Most Course content already exists',
        readinessC: course ? 'Learning plan is clear, but assets still need developing' : 'Vision and Course outcomes are clear, but assets still need developing',
        readinessD: course ? 'Just starting — limited existing content or online-course experience' : 'Still an early idea that needs substantial development'
      };
      if (s.step === 4) {
        var r = computeResult(s);
        t.resultTitle = r.title;
        t.resultDuration = r.duration;
        t.resultBlurb = r.blurb;
        t.resultUrl = r.url;
      }
      return t;
    };

    var render = function (moveFocus) {
      var t = texts(state);
      document.querySelectorAll('[data-text]').forEach(function (el) {
        var v = t[el.getAttribute('data-text')];
        if (v !== undefined) el.textContent = v;
      });
      var link = document.querySelector('[data-result-url]');
      if (link) link.setAttribute('href', t.resultUrl || '#');
      steps.forEach(function (el) {
        el.hidden = +el.getAttribute('data-step') !== state.step;
      });
      if (moveFocus) {
        var current = document.querySelector('[data-step="' + state.step + '"] [data-step-heading]');
        if (current) current.focus();
      }
    };

    var PICKS = {
      pickSpecialization: function () { state.track = 'specialization'; state.step = 1; },
      pickCourse: function () { state.track = 'course'; state.step = 1; },
      pickReadyA: function () { state.readiness = 'a'; state.step = 2; },
      pickReadyB: function () { state.readiness = 'b'; state.step = 2; },
      pickReadyC: function () { state.readiness = 'c'; state.step = 2; },
      pickReadyD: function () { state.readiness = 'd'; state.step = 2; },
      pickComplexYes: function () { state.complex = true; state.step = 4; },
      pickComplexNo: function () {
        state.complex = false;
        state.step = state.track === 'course' && state.readiness === 'c' ? 3 : 4;
      },
      pickFamiliarYes: function () { state.familiar = true; state.step = 4; },
      pickFamiliarNo: function () { state.familiar = false; state.step = 4; },
      restart: reset
    };

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-pick]');
      if (!btn) return;
      var fn = PICKS[btn.getAttribute('data-pick')];
      if (!fn) return;
      fn();
      render(true);
    });

    render(false);
  }

  /* ---- FAQ accordion ------------------------------------------------- */
  var faqs = document.querySelectorAll('[data-faq]');
  var setFaq = function (btn, open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (panel) panel.hidden = !open;
    var sign = btn.querySelector('[data-faq-sign]');
    if (sign) sign.textContent = open ? '–' : '+';
  };
  faqs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setFaq(btn, btn.getAttribute('aria-expanded') !== 'true');
    });
  });

  /* Print complete: open every answer, then restore what was open. */
  var before = null;
  window.addEventListener('beforeprint', function () {
    before = [];
    faqs.forEach(function (btn) {
      before.push(btn.getAttribute('aria-expanded') === 'true');
      setFaq(btn, true);
    });
  });
  window.addEventListener('afterprint', function () {
    if (!before) return;
    faqs.forEach(function (btn, i) { setFaq(btn, before[i]); });
    before = null;
  });
})();

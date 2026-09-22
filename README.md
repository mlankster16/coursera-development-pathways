# Coursera Development Pathways

Duke CTL's starting point for faculty developing a Coursera Course or
Specialization. Companion to the
[Coursera Design Guide](https://mlankster16.github.io/coursera-design-guide/).

Live site: https://mlankster16.github.io/coursera-development-pathways/

## What's here

    index.html                      Home — process guide
    find-your-pathway.html          Pathway finder, timeline comparison, FAQ
    specialization-pathways.html    4 Specialization pathways
    course-pathways.html            5 Course pathways
    site.css                        typography base, phone + print rules, hover states
    site.js                         pathway finder + FAQ accordion
    assets/ctl-logo-white.png
    .nojekyll                       serve files as-is on GitHub Pages
    tools/build.mjs                 regenerates the four pages from design sources

Plain static HTML — no framework and no build step at runtime. All links are
relative, so the site works at the `/coursera-development-pathways/` subpath
and when opened locally.

## Updating from a new design export

The pages are generated from the design handoff's `designs/*.dc.html` files.
Don't hand-edit the four HTML pages; re-run the build instead:

    node tools/build.mjs "<path to design_handoff_coursera_development_pathways/designs>"

The script rewrites the four pages and the generated hover block at the end of
`site.css` (everything above that marker is hand-written and kept). It refuses
to write if any design-tool markup survives (`style-hover`, `{{ }}`,
`<sc-if>`, `<helmet>`, `.dc.html`) or if an internal link or `#anchor` doesn't
resolve.

## Deviations from the design files

- **Phones (≤680px):** the handoff specifies 24px section side padding, but the
  design's rule targets the shell rather than the sections. `site.css` applies
  the intended 24px, drops the beige page frame, wraps the header, and lets the
  Home hierarchy row wrap. Above 680px the pages match the designs exactly.
- **Find Your Pathway footer spacing:** the design source sets the footer
  24px below the FAQ, so its top rule nearly touches the last FAQ hairline.
  The build raises it to 64px to match Home. Once the source is fixed, the
  override does nothing.
- **Accessibility:** FAQ triggers are real `<button>`s inside headings;
  finder focus moves to each new question; `nav`/`main` landmarks and
  `aria-current` on the current page; decorative arrows are `aria-hidden`, and
  new-tab links announce "(opens in a new tab)".
- **Anchor offset:** the 20px offset for `#pathway` links uses CSS
  `scroll-margin-top` rather than a script.

## Deploying

GitHub Pages → Deploy from branch → `main` / root.

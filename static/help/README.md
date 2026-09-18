# Maintaining the local help

`de.md` and `en.md` are bundled with the static frontend and need no external
service. Each file has one level-one document title and eight level-two
chapter headings in the order listed in
`guideChapterIds` in `../help.js`. Keep both languages in sync.

All three release builds include the complete `static` directory. Help files
are embedded in the Windows executable and Linux AppImage, and included in
the macOS app resources. They do not require a separate download.
Place future screenshots and other help assets beneath `static/help/` so they
are included recursively. `tools/check_bundled_help.py` compares `help.js` and
every file under `static/help/` with the built executable/app before packaging.
A missing or differing file fails the build.

Follow markdownlint 0.41.1 defaults, including blank lines around headings
and lists and a maximum line length of 80 characters. Paragraphs and list
items may wrap across source lines; separate paragraphs with a blank line.

Supported Markdown: paragraphs, level-three and level-four section headings,
unordered and numbered lists, bold text, inline code, and chapter links such
as `[Migration](#migration)`. Link fragments must match the chapter heading's
Markdown anchor in the corresponding language. A `:::details Title` line
opens a technical-details section; a standalone `:::` closes it. Raw HTML
is escaped. External links and embedded scripts are not rendered.

Verify instructions against the corresponding UI and device workflow before
editing. Do not turn intended behavior into a claim of hardware verification.

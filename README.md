# Creations of Ra

A deliberately small static blog for the artist Ra.

Public site: https://creations-of-ra.com/
GitHub repository: https://github.com/GeorgeFejer91/creations-of-ra

## Editing

No framework, JavaScript, dependency installation, database or build step is needed. The site uses HTML and CSS with local system fonts. It does not load analytics, third-party fonts, cookies or tracking scripts.

- `index.html`: homepage, journal list and short about section.
- `styles.css`: the shared visual design and mobile layout.
- `posts/a-beginning/index.html`: initial introductory note.
- `feed.xml`: RSS feed.
- `sitemap.xml`: indexed pages.
- `404.html`: missing-page response.

The launch note and about copy are starter editorial text, not a supplied artist biography or a description of actual artworks. Replace them with Ra's own copy as it becomes available.

## Add an entry

Copy `posts/a-beginning/index.html` into `posts/YOUR-SLUG/index.html`. Update the title, date, body, description and canonical/OG URLs. Keep the relative links when using the same directory depth. Add an entry row to the Journal section of `index.html`, update its entry count, add an RSS item to `feed.xml`, and list the page in `sitemap.xml`.

Publish all changed files together. Existing posts have ordinary permanent HTML URLs and remain readable without JavaScript. There is no browser-based admin editor or comments service.

## Publishing through Secret Tunnel V.2

The initial publication uses the direct route. Local Git initialization/binding is not implied by a direct publication.

1. Write changes using the MCP file tools in the selected CreationsOfRa folder.
2. Call `github_direct_publish` with repository `GeorgeFejer91/creations-of-ra`, branch `main`, and the exact changed paths.
3. Verify the returned commit with `github_direct_ref` and `github_direct_pages_status`.

GitHub Pages is configured with Actions. Its custom domain is set through the Pages API, not a CNAME file. The Pages workflow is stored in `.github/workflows/pages.yml` in the remote repository. Do not publish `.chatgpt/`, credential files or local test receipts.

## DNS

At Namecheap, preserve the four GitHub Pages apex A records on `@`: 185.199.108.153, 185.199.109.153, 185.199.110.153 and 185.199.111.153. The `www` CNAME should point to `GeorgeFejer91.github.io`, not `creations-of-ra.github.io`. DNS belongs to the registrar; the MCP does not change Namecheap records.

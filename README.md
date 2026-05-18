# Take Back the Mac

The Mac is not vendor territory. It is the user's machine.

This repository maintains the Take Back the Mac manifesto and a public idea board for concrete demands around macOS, iOS, the App Store, uninstall behavior, background processes, Services pressure, and local ownership.

Apple asks users to accept a controlled platform in exchange for safety, coherence, and peace of mind. That can be a fair bargain. It stops being fair when users give up control and still have to live like system administrators.

## Inspiration

Credit where due: this project is partly inspired by Marco Arment's [A letter to John Ternus](https://marco.org/2026/04/01/letter-to-john-ternus), also discussed on [Accidental Tech Podcast 686](https://atp.fm/686).

Marco made the humane version of the argument: computers should work for their owners, with respect for their time, attention, money, data, and privacy. This repo picks up that thread and turns it toward uninstall behavior, app residue, background processes, App Store stewardship, Services pressure, and local ownership.

## The ask

Apple should use its control to defend the user's boundary:

- Uninstall should mean uninstall.
- App footprints should be visible.
- Background helpers should be plain-language and removable.
- App Store review should protect users from scams and dark patterns.
- Services should support the device experience, not swallow it.
- Local ownership should be real.

Start here: [takebackthemac.org/manifesto](https://takebackthemac.org/manifesto/)

## Web app

The public web app is an Astro site with Cloudflare Pages Functions and D1 behind the parts that need memory. It includes:

- A manifesto page
- A public idea board
- Idea submission with a required email address
- Upvoting on ideas
- Upvoting on the core demands

Live site: [takebackthemac.org](https://takebackthemac.org/)

Fallback: [take-back-the-mac.pages.dev](https://take-back-the-mac.pages.dev/)

Local development:

```sh
npm run dev
```

Cloudflare-local development with Functions and D1:

```sh
npm run dev:cf
```

Deploy:

```sh
npm run deploy
```

Cloudflare resources:

- Pages project: `take-back-the-mac`
- D1 database: `take-back-the-mac-votes`
- Domain: `takebackthemac.org`

If the schema changes, run:

```sh
npm run d1:migrate:remote
```

## Adjacent efforts to contact

This is not starting from zero. PRs are welcome for better contacts, active campaigns, and people doing related work.

- [Marco Arment](https://marco.org/2026/04/01/letter-to-john-ternus) for the user-respect framing that helped spark this.
- [Coalition for App Fairness](https://appfairness.org/our-vision/) for App Store competition and developer rights.
- [Electronic Frontier Foundation](https://www.eff.org/) for digital rights, privacy, interoperability, and platform accountability.
- [Open Web Advocacy](https://open-web-advocacy.org/) for browser-engine choice and open-web rights on locked-down platforms.
- [The Repair Association](https://www.repair.org/) and [iFixit](https://www.ifixit.com/) for right-to-repair and ownership advocacy.
- [Free Software Foundation](https://www.fsf.org/) and [Defective by Design](https://www.defectivebydesign.org/) for software freedom and anti-DRM work.

More: [Adjacent Efforts](ADJACENT-EFFORTS.md)

## Contributing

PRs are welcome. Bring specific examples, screenshots, file paths, receipts, and proposed language.

Please keep the work user-centered. This is not generic Apple-bashing. It is an argument for a better bargain between Apple and the people who paid for the machines.

That's a Mac, Jack.

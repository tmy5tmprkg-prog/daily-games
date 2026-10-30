# The Great Candy Catch

A tiny Halloween arcade game for the GitHub Pages site. Move the pumpkin pail with your mouse or finger, catch eight pieces of candy, and avoid the veggies. Feed your friend three times to uncover the surprise.

The game is available after entering the password. The Halloween Ghost Party track attempts to play on load; browsers that block autoplay start it on the first interaction. Use the music button to turn it off or on. The end screen shows the supplied ultrasound image.

The password check is client-side and is intended as a casual gate, not secure access control.

## Original games

The previous Daily Games collection remains in the repository. To show its tabs and open one of those games, add `?legacy=1` to the page URL. The default public experience is always the Halloween game.

## Run locally

Serve this folder with any static web server, for example:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

`.github/workflows/pages.yml` deploys the repository on pushes to `main` and from the Actions tab. In the repository's Pages settings, set the build and deployment source to **GitHub Actions**.

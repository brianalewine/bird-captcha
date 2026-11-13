# BIRDCHA

A bird-identification game inspired by the reCAPTCHA checkbox. Pick birds from a photo grid or identify a North American bird by its call. For fun only.

## Play locally

Run `python3 -m http.server 8000` in this directory and open [localhost:8000](http://localhost:8000). The static site runs directly from the repository root. Photos load from iNaturalist and audio streams from the National Park Service. An internet connection is required for challenges.

## GitHub Pages

Select **Settings → Pages → Deploy from a branch**, choose **main** and **/ (root)**, then save.

The photo challenge draws from 18 iNaturalist photos. Some rounds have no matching birds. The headphone button plays one of six National Park Service recordings. Enter a common or scientific name to solve it. Click the checked box to play again.

[Photo credits](PHOTO-CREDITS.md) · [Recording credits](AUDIO-CREDITS.md)

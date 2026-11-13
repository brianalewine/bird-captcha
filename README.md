# BIRDCHA

A bird-identification game inspired by the reCAPTCHA checkbox. Pick birds from a photo grid or identify a North American bird by its call. For fun only.

## Play locally

Run `python3 -m http.server 8000` in this directory and open [localhost:8000](http://localhost:8000). The static site runs directly from the repository root. Photos and recordings load directly from their hosts. An internet connection is required for challenges.

## GitHub Pages

Select **Settings → Pages → Deploy from a branch**, choose **main** and **/ (root)**, then save.

Both challenges draw from the 150 bird species with the most research-grade observations in iNaturalist’s North America region at the time the catalog was collected. This ranking reflects reporting frequency. Some photo rounds have no matching birds. The headphone button opens a smaller audio challenge and plays a field recording. Enter a common or scientific name to solve it. Click the checked box to play again.

[Species ranking](SPECIES.md) · [Photo credits](PHOTO-CREDITS.md) · [Recording credits](AUDIO-CREDITS.md)

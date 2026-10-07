# qxmd328: mirror data/seo/** to the us-central1 bucket read by the seoQ function
# (lib/qx-data-store.js). Run after rebuilding any data/seo files, BEFORE deploying.
param([string]$Bucket = "quantrexacademy-app-seo-uc1")
Set-Location (Split-Path $PSScriptRoot -Parent)
gcloud storage rsync data\seo "gs://$Bucket/data/seo" --recursive --delete-unmatched-destination-objects

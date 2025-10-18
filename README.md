# NFT Discord Tracker Bot

## Koyeb Docker commands https://www.koyeb.com/docs/build-and-deploy/cli/reference#koyeb-services-logs

```sh
docker pull koyeb/koyeb-cli:latest

docker run --rm  koyeb/koyeb-cli:latest services list --token KOYEB_TOKEN_TO_REPLACE
docker run --rm  koyeb/koyeb-cli:latest services logs discord-dolz/nft-tracker-discord --help
docker run --rm  koyeb/koyeb-cli:latest services logs discord-dolz/nft-tracker-discord \
    --start-time "2025-10-17 21:50:00 +0000 UTC" \
    --end-time "2025-10-18 00:00:00 +0000 UTC" \
    --token KOYEB_TOKEN_TO_REPLACE > logs.txt
```

# LairHub

Find a local host for **one night**. The guest pays into an escrow contract on QIE when they book; the host is paid only after the **guest confirms the stay took place**. Fully on-chain (no database): listings and bookings live in the `StayEscrow` contract and the web app reads them directly.

```
contracts/StayEscrow.sol   escrow + listings + bookings (Solidity 0.8.24, evm "paris")
test/                      13 passing tests (booking, guest confirmation, auto-release, cancel, dispute, fees, rejecting host)
scripts/deploy.js          deploy to qieTestnet / qieMainnet
web/                       Next.js (App Router) + wagmi/viem, deployed to Cloudflare Workers; /api/keeper is the fallback payout bot
keeper-cron/               tiny scheduled Cloudflare Worker that calls /api/keeper daily
```

## How a stay works

1. Host publishes a listing (title, neighbourhood, price per night).
2. Guest picks a UTC night and pays the exact price → funds sit in the contract.
3. Guest can cancel for a full refund up to 24h before the night; the host can cancel any time before the morning after (guest always refunded).
4. From **09:00 UTC the morning after** the night the guest can **confirm the stay** (`confirmStay`). The host is paid immediately: price minus the platform fee (5% by default, max 10%, locked in at booking time).
5. Instead of confirming, the guest can **report a problem** (`dispute`) any time until the confirm window closes. That freezes the money; the platform owner settles it with `resolve(bookingId, guestBps)`.
6. **Fallback so a silent guest can't hold a host's money hostage:** if the guest neither confirms nor disputes within 24h of the morning (`CONFIRM_WINDOW`), anyone — the host, or the keeper bot — can call `release()` to pay the host.
7. If a payout can't be pushed to an address it is parked in `pending` and withdrawn with `withdraw()`.

Timeline for a night on day D (UTC): book → D 00:00 night starts → **D+1 09:00 guest can confirm** → **D+2 09:00 host can collect if the guest stayed silent**.

## Setup

### 1. Contracts

```bash
npm install
cp .env.example .env              # add PRIVATE_KEY (deployer wallet, funded with QIE)
npx hardhat test                  # add USE_SOLCJS=1 if binaries.soliditylang.org is blocked
npx hardhat run scripts/deploy.js --network qieTestnet   # chain 1983, faucet: qie.digital/faucet
npx hardhat run scripts/deploy.js --network qieMainnet   # chain 1990, needs real QIE for gas
```

Verify the source on the explorer (mainnet.qie.digital) so judges can read it.

### 2. Web app

```bash
cd web
npm install
cp .env.example .env.local        # NEXT_PUBLIC_NETWORK, NEXT_PUBLIC_CONTRACT_ADDRESS, keeper vars
npm run dev
```

### 3. Deploy to Cloudflare (Workers)

The web app runs on Cloudflare Workers through the OpenNext adapter (`@opennextjs/cloudflare`). Two Workers are deployed: the app (`web/`, named `lairhub`) and a tiny scheduled Worker (`keeper-cron/`) that wakes the app's `/api/keeper` route once a day.

**Environment variables: where each one goes**

| Variable | Kind | Where to set it |
|---|---|---|
| `NEXT_PUBLIC_NETWORK` (`testnet` or `mainnet`) | public, baked into the build | **Build variable** (Workers Builds → Settings → Build → Variables), or `web/.env.production` if you deploy from your machine |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | public, baked into the build | same as above |
| `KEEPER_PRIVATE_KEY` | secret, read at runtime | Worker secret on `lairhub`: `npx wrangler secret put KEEPER_PRIVATE_KEY` (or dashboard → Worker → Settings → Variables and Secrets) |
| `CRON_SECRET` | secret, read at runtime | Worker secret on **both** `lairhub` and `lairhub-keeper-cron`, with the **same value** |

`NEXT_PUBLIC_` values are compiled into the JavaScript, so they must exist at build time; changing them means rebuilding. Never put the secrets in build variables or in `wrangler.jsonc`. Use a dedicated low-balance wallet for `KEEPER_PRIVATE_KEY`: it only pays gas, and `release()` is permissionless and only works after the confirm window closes, so it can only trigger payouts already owed.

**Option A: deploy from your machine**

```bash
cd web
npm install
npx wrangler login
echo "NEXT_PUBLIC_NETWORK=testnet" > .env.production
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress" >> .env.production
npm run deploy                                  # builds with OpenNext and deploys the "lairhub" Worker
npx wrangler secret put KEEPER_PRIVATE_KEY
npx wrangler secret put CRON_SECRET

cd ../keeper-cron                               # deploy AFTER the app Worker exists
npm install
npx wrangler secret put CRON_SECRET             # same value as above
npm run deploy                                  # schedules the daily 10:00 UTC trigger
```

**Option B: automatic deploys from GitHub** (Cloudflare dashboard → Workers & Pages → Create → Import a repository)

- Root directory: `web`, Build command: `npx opennextjs-cloudflare build`, Deploy command: `npx opennextjs-cloudflare deploy`.
- Add `NEXT_PUBLIC_NETWORK` and `NEXT_PUBLIC_CONTRACT_ADDRESS` as **Build variables**, then add the two secrets to the Worker once it exists.
- Deploy `keeper-cron/` once from your machine (second half of Option A), or import it as a second project with root directory `keeper-cron`.

Local test of the Cloudflare runtime: `cd web && cp .dev.vars.example .dev.vars && npm run preview`.

The Worker name `lairhub` appears in `web/wrangler.jsonc` and in the service binding in `keeper-cron/wrangler.jsonc`; if you rename one, rename both.

Wallet: QIE Wallet works through the standard injected provider. Testers must enable the **testnet toggle** in QIE Wallet settings before the app can switch to chain 1983.

## Known limitations (MVP)

See the list in the chat reply that came with this project; the ones that matter most before real users:
host/guest trust and safety (no identity or reviews), exact address privacy, UTC-based "morning", price volatility of the native token, disputes decided by one admin key (and a guest can dispute to delay payment), the fallback keeper, and local regulations on short-term lodging.

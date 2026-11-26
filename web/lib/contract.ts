import { parseAbi } from "viem";
import { activeChain } from "./chains";

export const abi = parseAbi([
  "function listingCount() view returns (uint256)",
  "function bookingCount() view returns (uint256)",
  "function feeBps() view returns (uint16)",
  "function listings(uint256) view returns (address host, uint128 pricePerNight, bool active, string title, string area, string metadataURI)",
  "function bookings(uint256) view returns (uint256 listingId, address guest, address host, uint128 amount, uint64 night, uint16 feeBps, uint8 status)",
  "function nightTaken(uint256, uint64) view returns (bool)",
  "function pending(address) view returns (uint256)",
  "function createListing(string title, string area, string metadataURI, uint128 pricePerNight) returns (uint256)",
  "function updateListing(uint256 id, uint128 pricePerNight, bool active, string metadataURI)",
  "function bookNight(uint256 listingId, uint64 night) payable returns (uint256)",
  "function cancelByGuest(uint256 bookingId)",
  "function cancelByHost(uint256 bookingId)",
  "function dispute(uint256 bookingId)",
  "function confirmStay(uint256 bookingId)",
  "function release(uint256 bookingId)",
  "function withdraw()",
]);

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "") as `0x${string}`;
export const configured = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);

export const CONTRACT = { address: CONTRACT_ADDRESS, abi, chainId: activeChain.id } as const;

export const STATUS = ["None", "Booked", "Paid out", "Cancelled", "Disputed", "Resolved"] as const;
export const BOOKED = 1;

// Must mirror the contract.
// The guest can confirm from 09:00 UTC the morning after the night (releaseAt) and the host is paid
// at once. If the guest neither confirms nor disputes within 24h, anyone can release (autoReleaseAt).
export const DAY = 86400;
export const RELEASE_OFFSET = 9 * 3600;
export const CONFIRM_WINDOW = 24 * 3600;
export const FREE_CANCEL_WINDOW = 24 * 3600;
export const releaseAtOf = (night: number) => (night + 1) * DAY + RELEASE_OFFSET;
export const autoReleaseAtOf = (night: number) => releaseAtOf(night) + CONFIRM_WINDOW;

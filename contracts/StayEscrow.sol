// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title StayEscrow
/// @notice One-night stays: guests pay into escrow and the host is paid only once the guest
///         confirms the stay took place. Hosts list a room, guests book a single night
///         (identified by its UTC day index).
///
///         Flow after booking:
///           - From 09:00 UTC the morning after the night, the guest can `confirmStay` and the
///             host is paid immediately.
///           - Until the confirm window closes (24h later) the guest can `dispute` instead,
///             which freezes the funds for the platform to settle.
///           - If the guest does neither, the window closes and anyone can `release` to the
///             host, so a silent guest can never hold a host's money hostage.
contract StayEscrow is Ownable, ReentrancyGuard {
    enum Status {
        None,
        Booked,
        Released,
        Cancelled,
        Disputed,
        Resolved
    }

    struct Listing {
        address host;
        uint128 pricePerNight; // in wei of the native token
        bool active;
        string title;
        string area; // coarse location only (never put a street address on-chain)
        string metadataURI; // optional off-chain details (photos, house rules)
    }

    struct Booking {
        uint256 listingId;
        address guest;
        address host;
        uint128 amount;
        uint64 night; // UTC day index: unix timestamp / 1 days
        uint16 feeBps; // platform fee locked in at booking time
        Status status;
    }

    /// @dev The stay can be confirmed from 09:00 UTC on the morning after the night.
    uint256 public constant RELEASE_OFFSET = 9 hours;
    /// @dev After the confirm opens, the guest has this long to confirm or dispute. If they do
    ///      neither, the host can be paid without confirmation.
    uint256 public constant CONFIRM_WINDOW = 24 hours;
    /// @dev Guests get a full refund if they cancel at least this long before the night starts.
    uint256 public constant FREE_CANCEL_WINDOW = 24 hours;
    uint16 public constant MAX_FEE_BPS = 1000; // 10%

    uint16 public feeBps = 500; // 5%
    uint256 public listingCount;
    uint256 public bookingCount;
    uint256 public accruedFees;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Booking) public bookings;
    /// listingId => night => taken
    mapping(uint256 => mapping(uint64 => bool)) public nightTaken;
    /// Funds that could not be pushed (e.g. recipient reverts) wait here to be pulled.
    mapping(address => uint256) public pending;

    event ListingCreated(uint256 indexed listingId, address indexed host, uint128 pricePerNight, string area);
    event ListingUpdated(uint256 indexed listingId, uint128 pricePerNight, bool active);
    event Booked(uint256 indexed bookingId, uint256 indexed listingId, address indexed guest, uint64 night, uint128 amount);
    event StayConfirmed(uint256 indexed bookingId, address indexed guest);
    event Released(uint256 indexed bookingId, address indexed host, uint256 hostAmount, uint256 fee);
    event Cancelled(uint256 indexed bookingId, address indexed by, uint256 refund);
    event Disputed(uint256 indexed bookingId, address indexed guest);
    event Resolved(uint256 indexed bookingId, uint256 guestAmount, uint256 hostAmount, uint256 fee);
    event Withdrawn(address indexed to, uint256 amount);
    event FeeUpdated(uint16 feeBps);

    error NotHost();
    error NotGuest();
    error NotActive();
    error BadInput();
    error WrongPayment();
    error NightUnavailable();
    error BadStatus();
    error TooEarly();
    error TooLate();
    error NothingToWithdraw();
    error TransferFailed();

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ───────────────────────────── Hosts ─────────────────────────────

    function createListing(
        string calldata title,
        string calldata area,
        string calldata metadataURI,
        uint128 pricePerNight
    ) external returns (uint256 id) {
        if (pricePerNight == 0 || bytes(title).length == 0 || bytes(area).length == 0) revert BadInput();
        id = ++listingCount;
        listings[id] = Listing(msg.sender, pricePerNight, true, title, area, metadataURI);
        emit ListingCreated(id, msg.sender, pricePerNight, area);
    }

    function updateListing(uint256 id, uint128 pricePerNight, bool active, string calldata metadataURI) external {
        Listing storage l = listings[id];
        if (l.host != msg.sender) revert NotHost();
        if (pricePerNight == 0) revert BadInput();
        l.pricePerNight = pricePerNight;
        l.active = active;
        l.metadataURI = metadataURI;
        emit ListingUpdated(id, pricePerNight, active);
    }

    // ───────────────────────────── Guests ─────────────────────────────

    /// @param night UTC day index (unix timestamp / 86400) of the night being booked.
    function bookNight(uint256 listingId, uint64 night) external payable nonReentrant returns (uint256 id) {
        Listing storage l = listings[listingId];
        if (l.host == address(0) || !l.active) revert NotActive();
        if (l.host == msg.sender) revert BadInput();
        if (msg.value != l.pricePerNight) revert WrongPayment();
        if (night < block.timestamp / 1 days) revert NightUnavailable(); // tonight is the earliest
        if (nightTaken[listingId][night]) revert NightUnavailable();

        nightTaken[listingId][night] = true;
        id = ++bookingCount;
        bookings[id] = Booking(listingId, msg.sender, l.host, l.pricePerNight, night, feeBps, Status.Booked);
        emit Booked(id, listingId, msg.sender, night, l.pricePerNight);
    }

    /// @notice Guest cancels for a full refund, at least 24h before the night starts.
    function cancelByGuest(uint256 bookingId) external nonReentrant {
        Booking storage b = bookings[bookingId];
        if (b.guest != msg.sender) revert NotGuest();
        if (b.status != Status.Booked) revert BadStatus();
        if (block.timestamp + FREE_CANCEL_WINDOW > uint256(b.night) * 1 days) revert TooLate();
        _cancel(bookingId, b);
    }

    /// @notice Host cancels at any time before payout; the guest is always refunded in full.
    function cancelByHost(uint256 bookingId) external nonReentrant {
        Booking storage b = bookings[bookingId];
        if (b.host != msg.sender) revert NotHost();
        if (b.status != Status.Booked) revert BadStatus();
        if (block.timestamp >= releaseTime(bookingId)) revert TooLate();
        _cancel(bookingId, b);
    }

    /// @notice Guest freezes the payout if something went wrong. The owner (platform) resolves it.
    ///         Possible any time until the confirm window closes.
    function dispute(uint256 bookingId) external {
        Booking storage b = bookings[bookingId];
        if (b.guest != msg.sender) revert NotGuest();
        if (b.status != Status.Booked) revert BadStatus();
        if (block.timestamp >= autoReleaseTime(bookingId)) revert TooLate();
        b.status = Status.Disputed;
        emit Disputed(bookingId, msg.sender);
    }

    // ───────────────────────────── Payout ─────────────────────────────

    /// @notice Unix time when the guest can start confirming: 09:00 UTC the morning after the night.
    function releaseTime(uint256 bookingId) public view returns (uint256) {
        return (uint256(bookings[bookingId].night) + 1) * 1 days + RELEASE_OFFSET;
    }

    /// @notice Unix time when the confirm window closes and the host can be paid without confirmation.
    function autoReleaseTime(uint256 bookingId) public view returns (uint256) {
        return releaseTime(bookingId) + CONFIRM_WINDOW;
    }

    /// @notice The guest confirms the stay took place; the host is paid immediately.
    function confirmStay(uint256 bookingId) external nonReentrant {
        Booking storage b = bookings[bookingId];
        if (b.guest != msg.sender) revert NotGuest();
        if (b.status != Status.Booked) revert BadStatus();
        if (block.timestamp < releaseTime(bookingId)) revert TooEarly();
        emit StayConfirmed(bookingId, msg.sender);
        _releaseToHost(bookingId, b);
    }

    /// @notice Fallback payout when the guest neither confirmed nor disputed within the window.
    ///         Permissionless: the host or a keeper bot can call it.
    function release(uint256 bookingId) external nonReentrant {
        Booking storage b = bookings[bookingId];
        if (b.status != Status.Booked) revert BadStatus();
        if (block.timestamp < autoReleaseTime(bookingId)) revert TooEarly();
        _releaseToHost(bookingId, b);
    }

    /// @notice Platform settles a disputed booking. guestBps is the share (0–10000) refunded to the guest;
    ///         the remainder goes to the host minus the platform fee on the host's portion.
    function resolve(uint256 bookingId, uint16 guestBps) external onlyOwner nonReentrant {
        Booking storage b = bookings[bookingId];
        if (b.status != Status.Disputed) revert BadStatus();
        if (guestBps > 10_000) revert BadInput();

        b.status = Status.Resolved;
        uint256 guestAmount = (uint256(b.amount) * guestBps) / 10_000;
        uint256 hostGross = uint256(b.amount) - guestAmount;
        uint256 fee = (hostGross * b.feeBps) / 10_000;
        accruedFees += fee;
        if (guestAmount > 0) _pay(b.guest, guestAmount);
        if (hostGross - fee > 0) _pay(b.host, hostGross - fee);
        emit Resolved(bookingId, guestAmount, hostGross - fee, fee);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pending[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        pending[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }

    // ───────────────────────────── Platform ─────────────────────────────

    function withdrawFees(address to) external onlyOwner nonReentrant {
        uint256 amount = accruedFees;
        if (amount == 0) revert NothingToWithdraw();
        accruedFees = 0;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(to, amount);
    }

    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert BadInput();
        feeBps = newFeeBps; // applies to future bookings only
        emit FeeUpdated(newFeeBps);
    }

    // ───────────────────────────── Internals ─────────────────────────────

    function _releaseToHost(uint256 bookingId, Booking storage b) internal {
        b.status = Status.Released;
        uint256 fee = (uint256(b.amount) * b.feeBps) / 10_000;
        uint256 hostAmount = uint256(b.amount) - fee;
        accruedFees += fee;
        _pay(b.host, hostAmount);
        emit Released(bookingId, b.host, hostAmount, fee);
    }

    function _cancel(uint256 bookingId, Booking storage b) internal {
        b.status = Status.Cancelled;
        nightTaken[b.listingId][b.night] = false;
        _pay(b.guest, b.amount);
        emit Cancelled(bookingId, msg.sender, b.amount);
    }

    /// @dev Push payment; if the recipient rejects it, park it for a later pull so one bad
    ///      address can never lock the escrow.
    function _pay(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) pending[to] += amount;
    }
}

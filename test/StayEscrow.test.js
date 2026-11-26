const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const DAY = 86400;
const PRICE = ethers.parseEther("10");
const FEE = (amount) => (amount * 500n) / 10000n;
// 09:00 UTC the morning after `night`: the guest can confirm from here
const morning = (night) => (night + 1) * DAY + 9 * 3600;
// end of the 24h confirm window: the host can be paid without confirmation from here
const autoRelease = (night) => morning(night) + DAY;

async function deploy() {
  const [owner, host, guest, other] = await ethers.getSigners();
  const Stay = await ethers.getContractFactory("StayEscrow");
  const stay = await Stay.deploy(owner.address);
  await stay.connect(host).createListing("Cozy room", "Lekki, Lagos", "ipfs://meta", PRICE);
  const today = Math.floor((await time.latest()) / DAY);
  return { stay, owner, host, guest, other, today };
}

describe("StayEscrow", () => {
  describe("booking", () => {
    it("escrows the payment and blocks double-booking a night", async () => {
      const { stay, guest, other, today } = await loadFixture(deploy);
      const night = today + 3;
      await expect(stay.connect(guest).bookNight(1, night, { value: PRICE }))
        .to.emit(stay, "Booked")
        .withArgs(1, 1, guest.address, night, PRICE);
      expect(await ethers.provider.getBalance(await stay.getAddress())).to.equal(PRICE);
      await expect(stay.connect(other).bookNight(1, night, { value: PRICE })).to.be.revertedWithCustomError(
        stay,
        "NightUnavailable"
      );
      await stay.connect(other).bookNight(1, night + 1, { value: PRICE }); // a different night is free
    });

    it("rejects wrong payment, own listing, past nights and inactive listings", async () => {
      const { stay, host, guest, today } = await loadFixture(deploy);
      await expect(stay.connect(guest).bookNight(1, today + 2, { value: PRICE - 1n })).to.be.revertedWithCustomError(
        stay,
        "WrongPayment"
      );
      await expect(stay.connect(host).bookNight(1, today + 2, { value: PRICE })).to.be.revertedWithCustomError(
        stay,
        "BadInput"
      );
      await expect(stay.connect(guest).bookNight(1, today - 1, { value: PRICE })).to.be.revertedWithCustomError(
        stay,
        "NightUnavailable"
      );
      await stay.connect(host).updateListing(1, PRICE, false, "");
      await expect(stay.connect(guest).bookNight(1, today + 2, { value: PRICE })).to.be.revertedWithCustomError(
        stay,
        "NotActive"
      );
    });
  });

  describe("guest confirmation", () => {
    it("pays the host only when the guest confirms, and only from the morning after", async () => {
      const { stay, host, guest, other, today } = await loadFixture(deploy);
      const night = today + 2;
      await stay.connect(guest).bookNight(1, night, { value: PRICE });
      expect(await stay.releaseTime(1)).to.equal(morning(night));

      // nothing moves before the morning, even for the guest
      await time.increaseTo(night * DAY + 3600);
      await expect(stay.connect(guest).confirmStay(1)).to.be.revertedWithCustomError(stay, "TooEarly");

      await time.increaseTo(morning(night));
      await expect(stay.connect(other).confirmStay(1)).to.be.revertedWithCustomError(stay, "NotGuest");
      await expect(stay.connect(host).confirmStay(1)).to.be.revertedWithCustomError(stay, "NotGuest");

      const confirmTx = stay.connect(guest).confirmStay(1);
      await expect(confirmTx).to.emit(stay, "StayConfirmed").withArgs(1, guest.address);
      await expect(confirmTx).to.changeEtherBalances([host, stay], [PRICE - FEE(PRICE), -(PRICE - FEE(PRICE))]);
      expect(await stay.accruedFees()).to.equal(FEE(PRICE));

      await expect(stay.connect(guest).confirmStay(1)).to.be.revertedWithCustomError(stay, "BadStatus");
      await expect(stay.connect(guest).dispute(1)).to.be.revertedWithCustomError(stay, "BadStatus");
    });

    it("does not let anyone pay the host without confirmation during the confirm window", async () => {
      const { stay, other, today } = await loadFixture(deploy);
      const night = today + 2;
      await stay.connect(other).bookNight(1, night, { value: PRICE });
      await time.increaseTo(morning(night) + 3600); // morning is open, guest silent
      await expect(stay.release(1)).to.be.revertedWithCustomError(stay, "TooEarly");
      await time.increaseTo(autoRelease(night) - 60);
      await expect(stay.release(1)).to.be.revertedWithCustomError(stay, "TooEarly");
    });

    it("auto-releases to the host once the window closes if the guest stays silent", async () => {
      const { stay, host, guest, other, today } = await loadFixture(deploy);
      const night = today + 2;
      await stay.connect(guest).bookNight(1, night, { value: PRICE });
      expect(await stay.autoReleaseTime(1)).to.equal(autoRelease(night));
      await time.increaseTo(autoRelease(night));
      await expect(stay.connect(other).release(1)).to.changeEtherBalance(host, PRICE - FEE(PRICE));
      await expect(stay.release(1)).to.be.revertedWithCustomError(stay, "BadStatus");
      await expect(stay.connect(guest).confirmStay(1)).to.be.revertedWithCustomError(stay, "BadStatus");
    });
  });

  describe("fees", () => {
    it("lets the platform withdraw accrued fees", async () => {
      const { stay, owner, guest, other, today } = await loadFixture(deploy);
      await stay.connect(guest).bookNight(1, today + 2, { value: PRICE });
      await time.increaseTo(morning(today + 2));
      await stay.connect(guest).confirmStay(1);
      await expect(stay.connect(other).withdrawFees(other.address)).to.be.revertedWithCustomError(
        stay,
        "OwnableUnauthorizedAccount"
      );
      await expect(stay.withdrawFees(owner.address)).to.changeEtherBalance(owner, FEE(PRICE));
    });

    it("keeps the fee that was in force when the booking was made", async () => {
      const { stay, owner, host, guest, today } = await loadFixture(deploy);
      await stay.connect(guest).bookNight(1, today + 2, { value: PRICE });
      await stay.connect(owner).setFeeBps(1000);
      await time.increaseTo(morning(today + 2));
      await expect(stay.connect(guest).confirmStay(1)).to.changeEtherBalance(host, PRICE - FEE(PRICE));
      await expect(stay.setFeeBps(1001)).to.be.revertedWithCustomError(stay, "BadInput");
    });

    it("parks funds for pulling if the host cannot receive them", async () => {
      const { stay, guest, today } = await loadFixture(deploy);
      const Rejector = await ethers.getContractFactory("Rejector");
      const rej = await Rejector.deploy();
      await rej.list(await stay.getAddress()); // listing #2, host cannot receive
      const price = ethers.parseEther("1");
      await stay.connect(guest).bookNight(2, today + 2, { value: price });
      await time.increaseTo(morning(today + 2));
      await stay.connect(guest).confirmStay(1); // booking #1 (on listing #2)
      expect(await stay.pending(await rej.getAddress())).to.equal(price - FEE(price));
    });
  });

  describe("cancellation", () => {
    it("refunds the guest in full when cancelling 24h+ ahead, and frees the night", async () => {
      const { stay, guest, other, today } = await loadFixture(deploy);
      const night = today + 5;
      await stay.connect(guest).bookNight(1, night, { value: PRICE });
      await expect(stay.connect(guest).cancelByGuest(1)).to.changeEtherBalance(guest, PRICE);
      await stay.connect(other).bookNight(1, night, { value: PRICE }); // night is free again
    });

    it("blocks guest cancellation inside the 24h window", async () => {
      const { stay, guest, today } = await loadFixture(deploy);
      const night = today + 5;
      await stay.connect(guest).bookNight(1, night, { value: PRICE });
      await time.increaseTo(night * DAY - 3600);
      await expect(stay.connect(guest).cancelByGuest(1)).to.be.revertedWithCustomError(stay, "TooLate");
    });

    it("lets the host cancel (full refund) before the morning after, not later", async () => {
      const { stay, host, guest, other, today } = await loadFixture(deploy);
      await stay.connect(guest).bookNight(1, today + 2, { value: PRICE });
      await expect(stay.connect(other).cancelByHost(1)).to.be.revertedWithCustomError(stay, "NotHost");
      await expect(stay.connect(host).cancelByHost(1)).to.changeEtherBalance(guest, PRICE);

      await stay.connect(guest).bookNight(1, today + 3, { value: PRICE });
      await time.increaseTo(morning(today + 3));
      await expect(stay.connect(host).cancelByHost(2)).to.be.revertedWithCustomError(stay, "TooLate");
    });
  });

  describe("disputes", () => {
    it("freezes the payout (no confirm, no auto-release) and lets the owner split the funds", async () => {
      const { stay, owner, host, guest, today } = await loadFixture(deploy);
      const night = today + 2;
      await stay.connect(guest).bookNight(1, night, { value: PRICE });
      await expect(stay.connect(host).dispute(1)).to.be.revertedWithCustomError(stay, "NotGuest");
      await stay.connect(guest).dispute(1);

      await time.increaseTo(autoRelease(night));
      await expect(stay.release(1)).to.be.revertedWithCustomError(stay, "BadStatus");
      await expect(stay.connect(guest).confirmStay(1)).to.be.revertedWithCustomError(stay, "BadStatus");
      await expect(stay.connect(guest).resolve(1, 5000)).to.be.revertedWithCustomError(
        stay,
        "OwnableUnauthorizedAccount"
      );

      // 50% back to the guest, host gets the other half minus 5% fee on that half
      const half = PRICE / 2n;
      await expect(stay.connect(owner).resolve(1, 5000)).to.changeEtherBalances(
        [guest, host],
        [half, half - FEE(half)]
      );
      expect(await stay.accruedFees()).to.equal(FEE(half));
    });

    it("can be raised in the morning, but not once the confirm window has closed", async () => {
      const { stay, guest, other, today } = await loadFixture(deploy);
      await stay.connect(guest).bookNight(1, today + 2, { value: PRICE });
      await stay.connect(other).bookNight(1, today + 3, { value: PRICE });

      await time.increaseTo(morning(today + 2) + 3600); // morning after night 1: still disputable
      await stay.connect(guest).dispute(1);

      await time.increaseTo(autoRelease(today + 3)); // window for booking #2 closed
      await expect(stay.connect(other).dispute(2)).to.be.revertedWithCustomError(stay, "TooLate");
    });
  });
});

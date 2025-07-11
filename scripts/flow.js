const { ethers } = require("hardhat");

async function main() {
  // Deploy tokens
  const [deployer, donor, fieldOffice, beneficiary] = await ethers.getSigners();

  // Deploy RahatToken
  const RahatToken = await ethers.getContractFactory("RahatToken");
  const rahatToken = await RahatToken.connect(deployer).deploy();
  await rahatToken.deployed();

  // Deploy CashToken
  const CashToken = await ethers.getContractFactory("CashToken");
  const cashToken = await CashToken.connect(deployer).deploy();
  await cashToken.deployed();

  // Deploy CashOutManager
  const CashOutManager = await ethers.getContractFactory("CashOutManager");
  const manager = await CashOutManager.connect(deployer).deploy(
    rahatToken.address,
    cashToken.address
  );
  await manager.deployed();

  // Set CashOutManager as minter for CashToken
  await cashToken.connect(deployer).transferOwnership(manager.address);

  // Donor mints RahatToken to self
  await rahatToken
    .connect(deployer)
    .mint(donor.address, ethers.utils.parseEther("1000"));

  // Donor transfers RahatToken to Field Office
  await rahatToken
    .connect(donor)
    .approve(fieldOffice.address, ethers.utils.parseEther("500"));
  await rahatToken
    .connect(donor)
    .transfer(fieldOffice.address, ethers.utils.parseEther("500"));

  // Field Office assigns tokens to Beneficiary via manager
  await rahatToken
    .connect(fieldOffice)
    .approve(manager.address, ethers.utils.parseEther("200"));
  await manager
    .connect(fieldOffice)
    .assignToBeneficiary(beneficiary.address, ethers.utils.parseEther("200"));

  // Beneficiary cashes out RahatToken for CashToken
  await rahatToken
    .connect(beneficiary)
    .approve(manager.address, ethers.utils.parseEther("200"));
  await manager.connect(beneficiary).cashOut(ethers.utils.parseEther("200"));

  // Check balances
  const beneficiaryRahat = await rahatToken.balanceOf(beneficiary.address);
  const beneficiaryCash = await cashToken.balanceOf(beneficiary.address);

  console.log(
    "Beneficiary RahatToken:",
    ethers.utils.formatEther(beneficiaryRahat)
  );
  console.log(
    "Beneficiary CashToken:",
    ethers.utils.formatEther(beneficiaryCash)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

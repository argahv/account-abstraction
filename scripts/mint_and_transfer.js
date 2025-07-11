const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load addresses
  const deployments = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments.json"))
  );
  const rahatTokenAddress = deployments.RahatToken;
  const fieldOfficeAddress = "0x3fa0279cF03c5A8f4374d623DC21Ae7Ceee5eb13"; // Set this before running
  const mintAmount = ethers.utils.parseEther("1000");
  const transferAmount = ethers.utils.parseEther("500");

  const [donor] = await ethers.getSigners();
  const rahatToken = await ethers.getContractAt(
    "RahatToken",
    rahatTokenAddress
  );

  // Mint tokens to donor
  const mintTx = await rahatToken
    .connect(donor)
    .mint(donor.address, mintAmount);
  await mintTx.wait();
  console.log(
    `Minted ${ethers.utils.formatEther(mintAmount)} RahatToken to donor: ${
      donor.address
    }`
  );

  // Transfer tokens to Field Office
  const transferTx = await rahatToken
    .connect(donor)
    .transfer(fieldOfficeAddress, transferAmount);
  await transferTx.wait();
  console.log(
    `Transferred ${ethers.utils.formatEther(
      transferAmount
    )} RahatToken to Field Office: ${fieldOfficeAddress}`
  );

  // Save info
  const info = {
    donor: donor.address,
    fieldOffice: fieldOfficeAddress,
    mintAmount: mintAmount.toString(),
    transferAmount: transferAmount.toString(),
    mintTxHash: mintTx.hash,
    transferTxHash: transferTx.hash,
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "mint_and_transfer.json"),
    JSON.stringify(info, null, 2)
  );
  console.log("Mint and transfer info saved to mint_and_transfer.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

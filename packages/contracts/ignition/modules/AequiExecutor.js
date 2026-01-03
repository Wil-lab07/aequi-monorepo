const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AequiExecutorModule", (m) => {
  const deployer = m.getAccount(0);
  const aequiExecutor = m.contract("AequiExecutor", [deployer]);

  return { aequiExecutor };
});

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AequiExecutorModule", (m) => {
  const aequiExecutor = m.contract("AequiExecutor");

  return { aequiExecutor };
});

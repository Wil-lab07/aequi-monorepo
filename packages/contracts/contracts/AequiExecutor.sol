// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC-20 interface subset used by the executor.
interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Lightweight multicall-style executor that pulls funds from the caller, forwards
/// them through arbitrary calls (e.g. DEX routers), and optionally flushes leftovers to a
/// recipient. Approvals can be granted per execution and revoked afterwards, limiting the
/// exposure window relative to approving a shared public contract.
contract AequiExecutor {
    /// @dev Simple non-reentrancy guard.
    uint256 private constant _UNLOCKED = 1;
    uint256 private constant _LOCKED = 2;
    uint256 private _status = _UNLOCKED;

    error ReentrancyGuard();
    error TokenTransferFailed(address token, bytes data);
    error ExternalCallFailed(address target, bytes data);
    error NativeTransferFailed(address recipient, uint256 amount);

    struct TokenPull {
        address token;
        uint256 amount;
    }

    struct Approval {
        address token;
        address spender;
        uint256 amount;
        bool revokeAfter;
    }

    struct Call {
        address target;
        uint256 value;
        bytes data;
    }

    modifier nonReentrant() {
        if (_status != _UNLOCKED) revert ReentrancyGuard();
        _status = _LOCKED;
        _;
        _status = _UNLOCKED;
    }

    receive() external payable {}

    /// @notice Executes a sequence of arbitrary calls after pulling the required ERC-20 funds
    /// from the caller. Any leftover tokens listed in `tokensToFlush` plus remaining native ETH
    /// are sent to `recipient` at the end of execution. Intended usage: build a swap route,
    /// request per-hop approvals, execute the hops, then revoke approvals to minimise risk.
    /// @param pulls Tokens and amounts to transfer from the caller into the executor.
    /// @param approvals ERC-20 approvals to set before running the call bundle. If `revokeAfter`
    ///        is true the allowance is reset to zero after execution.
    /// @param calls Arbitrary calls (DEX swaps, unwrap, etc.).
    /// @param recipient Address receiving any leftovers (ERC-20 and native).
    /// @param tokensToFlush Token addresses to sweep to the recipient after execution.
    /// @return results The raw return data for each external call in `calls`.
    function execute(
        TokenPull[] calldata pulls,
        Approval[] calldata approvals,
        Call[] calldata calls,
        address recipient,
        address[] calldata tokensToFlush
    ) external payable nonReentrant returns (bytes[] memory results) {
        _pullTokensFromSender(pulls);
        _setApprovals(approvals);

        results = _performCalls(calls);
        _revokeApprovals(approvals);
        _flushBalances(recipient, tokensToFlush);
    }

    function _pullTokensFromSender(TokenPull[] calldata pulls) private {
        for (uint256 index = 0; index < pulls.length; index++) {
            TokenPull calldata entry = pulls[index];
            if (entry.amount == 0) {
                continue;
            }
            _callToken(entry.token, abi.encodeWithSelector(IERC20Minimal.transferFrom.selector, msg.sender, address(this), entry.amount));
        }
    }

    function _setApprovals(Approval[] calldata approvals) private {
        for (uint256 index = 0; index < approvals.length; index++) {
            Approval calldata entry = approvals[index];
            if (entry.amount == 0) {
                continue;
            }
            _callToken(entry.token, abi.encodeWithSelector(IERC20Minimal.approve.selector, entry.spender, entry.amount));
        }
    }

    function _performCalls(Call[] calldata calls) private returns (bytes[] memory results) {
        results = new bytes[](calls.length);
        for (uint256 index = 0; index < calls.length; index++) {
            Call calldata entry = calls[index];
            (bool success, bytes memory returnData) = entry.target.call{value: entry.value}(entry.data);
            if (!success) {
                revert ExternalCallFailed(entry.target, returnData);
            }
            results[index] = returnData;
        }
    }

    function _revokeApprovals(Approval[] calldata approvals) private {
        for (uint256 index = 0; index < approvals.length; index++) {
            Approval calldata entry = approvals[index];
            if (!entry.revokeAfter || entry.amount == 0) {
                continue;
            }
            _callToken(entry.token, abi.encodeWithSelector(IERC20Minimal.approve.selector, entry.spender, 0));
        }
    }

    function _flushBalances(address recipient, address[] calldata tokensToFlush) private {
        require(recipient != address(0), "INVALID_RECIPIENT");

        for (uint256 index = 0; index < tokensToFlush.length; index++) {
            address token = tokensToFlush[index];
            uint256 balance = IERC20Minimal(token).balanceOf(address(this));
            if (balance > 0) {
                _callToken(token, abi.encodeWithSelector(IERC20Minimal.transfer.selector, recipient, balance));
            }
        }

        uint256 nativeBalance = address(this).balance;
        if (nativeBalance > 0) {
            (bool success, ) = recipient.call{value: nativeBalance}("");
            if (!success) {
                revert NativeTransferFailed(recipient, nativeBalance);
            }
        }
    }

    function _callToken(address token, bytes memory data) private {
        (bool success, bytes memory returnData) = token.call(data);
        if (!success) {
            revert TokenTransferFailed(token, returnData);
        }
        if (returnData.length > 0 && !abi.decode(returnData, (bool))) {
            revert TokenTransferFailed(token, returnData);
        }
    }
}

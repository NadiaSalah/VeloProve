
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint256) public balances;

    function withdraw() public {
        uint256 bal = balances[msg.sender];
        require(bal > 0);
        (bool sent, ) = msg.sender.call{value: bal}("");
        require(sent, "Failed");
        balances[msg.sender] = 0; // State update AFTER external call (Reentrancy)
    }

    function adminWithdraw() public {
        require(tx.origin == 0x1234567890123456789012345678901234567890); // tx.origin vuln
        selfdestruct(payable(msg.sender)); // unprotected selfdestruct
    }
}

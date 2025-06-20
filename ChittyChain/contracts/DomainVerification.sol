// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DomainVerification {
    struct Domain {
        string fqdn;
        address owner;
        uint256 expiryDate;
        bytes32 sslCertHash;
        uint256 lastVerified;
        bool autoRenew;
    }
    
    mapping(string => Domain) public domains;
    
    event DomainVerified(string fqdn, bytes32 sslHash, uint256 timestamp);
    
    function verifyDomain(string memory _fqdn, bytes32 _sslHash) public {
        domains[_fqdn].lastVerified = block.timestamp;
        domains[_fqdn].sslCertHash = _sslHash;
        
        emit DomainVerified(_fqdn, _sslHash, block.timestamp);
    }
}

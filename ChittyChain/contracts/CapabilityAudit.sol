// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CapabilityAudit {
    struct Capability {
        string sourceRepo;
        string targetRepo;
        string capabilityName;
        string capabilityType;
        bytes32 hash;
        uint256 timestamp;
        bool preserved;
    }
    
    mapping(bytes32 => Capability) public capabilities;
    mapping(string => bytes32[]) public repoCapabilities;
    
    event CapabilityMigrated(
        string indexed sourceRepo,
        string indexed targetRepo,
        string capabilityName,
        bytes32 hash
    );
    
    function recordCapability(
        string memory _source,
        string memory _target,
        string memory _name,
        string memory _type
    ) public returns (bytes32) {
        bytes32 hash = keccak256(abi.encodePacked(_source, _name, block.timestamp));
        
        capabilities[hash] = Capability({
            sourceRepo: _source,
            targetRepo: _target,
            capabilityName: _name,
            capabilityType: _type,
            hash: hash,
            timestamp: block.timestamp,
            preserved: true
        });
        
        repoCapabilities[_target].push(hash);
        
        emit CapabilityMigrated(_source, _target, _name, hash);
        
        return hash;
    }
}

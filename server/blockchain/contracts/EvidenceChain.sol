// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract EvidenceChain is AccessControl, ReentrancyGuard {
    bytes32 public constant ATTORNEY_ROLE = keccak256("ATTORNEY_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant FORENSIC_ROLE = keccak256("FORENSIC_ROLE");

    struct EvidenceRecord {
        bytes32 hash;
        string caseId;
        string documentType;
        string ipfsHash;
        address submittedBy;
        address verifiedBy;
        uint256 blockNumber;
        uint256 timestamp;
        string[] chainOfCustody;
        bytes metadata;
        bool isVerified;
        uint256 retentionPeriod; // 7 years in seconds
    }

    struct CaseData {
        string caseNumber;
        string jurisdiction;
        address[] attorneys;
        address[] authorizedPersons;
        bool isActive;
        uint256 createdAt;
        bytes32[] evidenceHashes;
    }

    mapping(bytes32 => EvidenceRecord) public evidenceRecords;
    mapping(string => CaseData) public cases;
    mapping(bytes32 => bool) public validEvidence;
    mapping(address => string[]) public attorneyCases;
    
    bytes32[] public allEvidenceHashes;
    string[] public allCaseIds;

    uint256 public constant COOK_COUNTY_RETENTION = 7 * 365 * 24 * 60 * 60; // 7 years
    
    event EvidenceSubmitted(
        bytes32 indexed evidenceHash,
        string indexed caseId,
        address indexed submitter
    );
    
    event EvidenceVerified(
        bytes32 indexed evidenceHash,
        address indexed verifier
    );
    
    event CaseCreated(
        string indexed caseId,
        address indexed creator
    );
    
    event ChainOfCustodyUpdated(
        bytes32 indexed evidenceHash,
        string custodyUpdate
    );

    modifier onlyCaseParticipant(string memory caseId) {
        require(
            hasRole(ATTORNEY_ROLE, msg.sender) ||
            hasRole(FORENSIC_ROLE, msg.sender) ||
            _isAuthorizedForCase(caseId, msg.sender),
            "Not authorized for this case"
        );
        _;
    }

    modifier validCaseId(string memory caseId) {
        require(cases[caseId].isActive, "Case does not exist or is inactive");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ATTORNEY_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
        _grantRole(FORENSIC_ROLE, msg.sender);
    }

    function createCase(
        string memory caseNumber,
        string memory jurisdiction,
        address[] memory attorneys,
        address[] memory authorizedPersons
    ) external onlyRole(ATTORNEY_ROLE) {
        require(bytes(cases[caseNumber].caseNumber).length == 0, "Case already exists");
        
        CaseData storage newCase = cases[caseNumber];
        newCase.caseNumber = caseNumber;
        newCase.jurisdiction = jurisdiction;
        newCase.attorneys = attorneys;
        newCase.authorizedPersons = authorizedPersons;
        newCase.isActive = true;
        newCase.createdAt = block.timestamp;
        
        allCaseIds.push(caseNumber);
        attorneyCases[msg.sender].push(caseNumber);
        
        emit CaseCreated(caseNumber, msg.sender);
    }

    function submitEvidence(
        string memory caseId,
        bytes32 evidenceHash,
        string memory documentType,
        string memory ipfsHash,
        bytes memory metadata
    ) external validCaseId(caseId) onlyCaseParticipant(caseId) nonReentrant {
        require(!validEvidence[evidenceHash], "Evidence already exists");
        require(evidenceHash != bytes32(0), "Invalid evidence hash");
        
        EvidenceRecord storage evidence = evidenceRecords[evidenceHash];
        evidence.hash = evidenceHash;
        evidence.caseId = caseId;
        evidence.documentType = documentType;
        evidence.ipfsHash = ipfsHash;
        evidence.submittedBy = msg.sender;
        evidence.blockNumber = block.number;
        evidence.timestamp = block.timestamp;
        evidence.metadata = metadata;
        evidence.retentionPeriod = COOK_COUNTY_RETENTION;
        evidence.chainOfCustody = new string[](1);
        evidence.chainOfCustody[0] = string(abi.encodePacked(
            "Submitted by: ",
            _addressToString(msg.sender),
            " at block: ",
            _uintToString(block.number)
        ));
        
        validEvidence[evidenceHash] = true;
        allEvidenceHashes.push(evidenceHash);
        cases[caseId].evidenceHashes.push(evidenceHash);
        
        emit EvidenceSubmitted(evidenceHash, caseId, msg.sender);
    }

    function verifyEvidence(
        bytes32 evidenceHash,
        string memory verificationNotes
    ) external onlyRole(FORENSIC_ROLE) {
        require(validEvidence[evidenceHash], "Evidence does not exist");
        require(!evidenceRecords[evidenceHash].isVerified, "Evidence already verified");
        
        EvidenceRecord storage evidence = evidenceRecords[evidenceHash];
        evidence.verifiedBy = msg.sender;
        evidence.isVerified = true;
        
        // Add to chain of custody
        evidence.chainOfCustody.push(string(abi.encodePacked(
            "Verified by: ",
            _addressToString(msg.sender),
            " - ",
            verificationNotes,
            " at block: ",
            _uintToString(block.number)
        )));
        
        emit EvidenceVerified(evidenceHash, msg.sender);
    }

    function updateChainOfCustody(
        bytes32 evidenceHash,
        string memory custodyUpdate
    ) external onlyCaseParticipant(evidenceRecords[evidenceHash].caseId) {
        require(validEvidence[evidenceHash], "Evidence does not exist");
        
        evidenceRecords[evidenceHash].chainOfCustody.push(string(abi.encodePacked(
            custodyUpdate,
            " by: ",
            _addressToString(msg.sender),
            " at block: ",
            _uintToString(block.number)
        )));
        
        emit ChainOfCustodyUpdated(evidenceHash, custodyUpdate);
    }

    function getEvidence(bytes32 evidenceHash) 
        external 
        view 
        onlyCaseParticipant(evidenceRecords[evidenceHash].caseId)
        returns (EvidenceRecord memory) 
    {
        require(validEvidence[evidenceHash], "Evidence does not exist");
        return evidenceRecords[evidenceHash];
    }

    function getCaseEvidence(string memory caseId) 
        external 
        view 
        validCaseId(caseId)
        onlyCaseParticipant(caseId)
        returns (bytes32[] memory) 
    {
        return cases[caseId].evidenceHashes;
    }

    function getChainOfCustody(bytes32 evidenceHash) 
        external 
        view 
        onlyCaseParticipant(evidenceRecords[evidenceHash].caseId)
        returns (string[] memory) 
    {
        require(validEvidence[evidenceHash], "Evidence does not exist");
        return evidenceRecords[evidenceHash].chainOfCustody;
    }

    function validateEvidenceIntegrity(bytes32 evidenceHash) 
        external 
        view 
        returns (bool isValid, uint256 blockNumber, uint256 timestamp) 
    {
        require(validEvidence[evidenceHash], "Evidence does not exist");
        
        EvidenceRecord memory evidence = evidenceRecords[evidenceHash];
        
        // Check if evidence is within retention period
        bool withinRetention = (block.timestamp - evidence.timestamp) <= evidence.retentionPeriod;
        
        // Check if evidence has proper chain of custody
        bool hasChainOfCustody = evidence.chainOfCustody.length > 0;
        
        isValid = withinRetention && hasChainOfCustody && evidence.isVerified;
        blockNumber = evidence.blockNumber;
        timestamp = evidence.timestamp;
    }

    function getCookCountyCompliantReport(string memory caseId) 
        external 
        view 
        validCaseId(caseId)
        onlyCaseParticipant(caseId)
        returns (
            uint256 totalEvidence,
            uint256 verifiedEvidence,
            uint256 withinRetention,
            bool cookCountyCompliant
        ) 
    {
        bytes32[] memory caseEvidence = cases[caseId].evidenceHashes;
        totalEvidence = caseEvidence.length;
        
        for (uint256 i = 0; i < caseEvidence.length; i++) {
            EvidenceRecord memory evidence = evidenceRecords[caseEvidence[i]];
            
            if (evidence.isVerified) {
                verifiedEvidence++;
            }
            
            if ((block.timestamp - evidence.timestamp) <= evidence.retentionPeriod) {
                withinRetention++;
            }
        }
        
        // Cook County compliance requires all evidence to be verified and within retention
        cookCountyCompliant = (verifiedEvidence == totalEvidence) && (withinRetention == totalEvidence);
    }

    function getAuditTrail() 
        external 
        view 
        onlyRole(AUDITOR_ROLE)
        returns (bytes32[] memory) 
    {
        return allEvidenceHashes;
    }

    function _isAuthorizedForCase(string memory caseId, address user) internal view returns (bool) {
        CaseData memory caseData = cases[caseId];
        
        for (uint256 i = 0; i < caseData.attorneys.length; i++) {
            if (caseData.attorneys[i] == user) {
                return true;
            }
        }
        
        for (uint256 i = 0; i < caseData.authorizedPersons.length; i++) {
            if (caseData.authorizedPersons[i] == user) {
                return true;
            }
        }
        
        return false;
    }

    function _addressToString(address addr) internal pure returns (string memory) {
        return string(abi.encodePacked("0x", _toHexString(uint256(uint160(addr)), 20)));
    }

    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length);
        for (uint256 i = 2 * length; i > 0; --i) {
            buffer[i - 1] = bytes1(uint8(value & 0xf) + (uint8(value & 0xf) < 10 ? 48 : 87));
            value >>= 4;
        }
        return string(buffer);
    }
}

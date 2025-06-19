// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DomainVerification is AccessControl, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    struct DomainRecord {
        string domain;
        address owner;
        string sslCertificateHash;
        uint256 verificationDate;
        uint256 expirationDate;
        bool isVerified;
        bool isActive;
        string[] verificationMethods;
        bytes32 evidenceHash;
    }

    struct SSLCertificate {
        string domain;
        string issuer;
        string subject;
        uint256 validFrom;
        uint256 validTo;
        string certificateHash;
        string publicKeyHash;
        bool isValid;
        uint256 recordedAt;
    }

    mapping(string => DomainRecord) public domainRecords;
    mapping(string => SSLCertificate) public sslCertificates;
    mapping(address => string[]) public ownerDomains;
    mapping(bytes32 => bool) public verifiedEvidence;
    
    string[] public allDomains;
    bytes32[] public allEvidenceHashes;

    event DomainRegistered(
        string indexed domain,
        address indexed owner,
        uint256 timestamp
    );
    
    event DomainVerified(
        string indexed domain,
        address indexed verifier,
        uint256 timestamp
    );
    
    event SSLCertificateRecorded(
        string indexed domain,
        string certificateHash,
        uint256 validFrom,
        uint256 validTo
    );
    
    event VerificationEvidence(
        string indexed domain,
        bytes32 indexed evidenceHash,
        string verificationMethod
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
    }

    function registerDomain(
        string memory domain,
        address owner,
        string[] memory verificationMethods
    ) external onlyRole(VERIFIER_ROLE) {
        require(bytes(domain).length > 0, "Domain cannot be empty");
        require(owner != address(0), "Invalid owner address");
        require(!domainRecords[domain].isActive, "Domain already registered");
        
        DomainRecord storage record = domainRecords[domain];
        record.domain = domain;
        record.owner = owner;
        record.verificationDate = block.timestamp;
        record.isActive = true;
        record.verificationMethods = verificationMethods;
        
        allDomains.push(domain);
        ownerDomains[owner].push(domain);
        
        emit DomainRegistered(domain, owner, block.timestamp);
    }

    function recordSSLCertificate(
        string memory domain,
        string memory issuer,
        string memory subject,
        uint256 validFrom,
        uint256 validTo,
        string memory certificateHash,
        string memory publicKeyHash
    ) external onlyRole(VERIFIER_ROLE) {
        require(domainRecords[domain].isActive, "Domain not registered");
        require(validTo > validFrom, "Invalid certificate validity period");
        require(validTo > block.timestamp, "Certificate already expired");
        
        SSLCertificate storage cert = sslCertificates[domain];
        cert.domain = domain;
        cert.issuer = issuer;
        cert.subject = subject;
        cert.validFrom = validFrom;
        cert.validTo = validTo;
        cert.certificateHash = certificateHash;
        cert.publicKeyHash = publicKeyHash;
        cert.isValid = true;
        cert.recordedAt = block.timestamp;
        
        // Update domain record with SSL info
        domainRecords[domain].sslCertificateHash = certificateHash;
        domainRecords[domain].expirationDate = validTo;
        
        emit SSLCertificateRecorded(domain, certificateHash, validFrom, validTo);
    }

    function verifyDomain(
        string memory domain,
        string memory verificationMethod,
        bytes32 evidenceHash,
        string memory ipfsHash
    ) external onlyRole(VERIFIER_ROLE) nonReentrant {
        require(domainRecords[domain].isActive, "Domain not registered");
        require(!domainRecords[domain].isVerified, "Domain already verified");
        require(evidenceHash != bytes32(0), "Invalid evidence hash");
        require(!verifiedEvidence[evidenceHash], "Evidence already used");
        
        DomainRecord storage record = domainRecords[domain];
        record.isVerified = true;
        record.evidenceHash = evidenceHash;
        
        verifiedEvidence[evidenceHash] = true;
        allEvidenceHashes.push(evidenceHash);
        
        emit DomainVerified(domain, msg.sender, block.timestamp);
        emit VerificationEvidence(domain, evidenceHash, verificationMethod);
    }

    function updateSSLCertificate(
        string memory domain,
        string memory newCertificateHash,
        uint256 newValidFrom,
        uint256 newValidTo
    ) external onlyRole(VERIFIER_ROLE) {
        require(domainRecords[domain].isActive, "Domain not registered");
        require(newValidTo > newValidFrom, "Invalid certificate validity period");
        require(newValidTo > block.timestamp, "Certificate already expired");
        
        SSLCertificate storage cert = sslCertificates[domain];
        require(cert.isValid, "No existing certificate to update");
        
        // Mark old certificate as invalid
        cert.isValid = false;
        
        // Create new certificate record (in practice, you might want a history)
        cert.certificateHash = newCertificateHash;
        cert.validFrom = newValidFrom;
        cert.validTo = newValidTo;
        cert.isValid = true;
        cert.recordedAt = block.timestamp;
        
        // Update domain record
        domainRecords[domain].sslCertificateHash = newCertificateHash;
        domainRecords[domain].expirationDate = newValidTo;
        
        emit SSLCertificateRecorded(domain, newCertificateHash, newValidFrom, newValidTo);
    }

    function validateDomainOwnership(
        string memory domain,
        address claimedOwner
    ) external view returns (bool isValid, uint256 verificationDate) {
        DomainRecord memory record = domainRecords[domain];
        
        isValid = record.isActive && 
                 record.isVerified && 
                 record.owner == claimedOwner;
        verificationDate = record.verificationDate;
        
        return (isValid, verificationDate);
    }

    function checkSSLValidity(string memory domain) 
        external 
        view 
        returns (
            bool isValid,
            uint256 validFrom,
            uint256 validTo,
            string memory certificateHash
        ) 
    {
        SSLCertificate memory cert = sslCertificates[domain];
        
        isValid = cert.isValid && 
                 cert.validFrom <= block.timestamp && 
                 cert.validTo > block.timestamp;
        
        return (isValid, cert.validFrom, cert.validTo, cert.certificateHash);
    }

    function getDomainRecord(string memory domain) 
        external 
        view 
        returns (DomainRecord memory) 
    {
        return domainRecords[domain];
    }

    function getSSLCertificate(string memory domain) 
        external 
        view 
        returns (SSLCertificate memory) 
    {
        return sslCertificates[domain];
    }

    function getDomainsByOwner(address owner) 
        external 
        view 
        returns (string[] memory) 
    {
        return ownerDomains[owner];
    }

    function getAllDomains() 
        external 
        view 
        onlyRole(AUDITOR_ROLE) 
        returns (string[] memory) 
    {
        return allDomains;
    }

    function getVerificationAuditTrail() 
        external 
        view 
        onlyRole(AUDITOR_ROLE) 
        returns (bytes32[] memory) 
    {
        return allEvidenceHashes;
    }

    function revokeDomainVerification(string memory domain, string memory reason) 
        external 
        onlyRole(VERIFIER_ROLE) 
    {
        require(domainRecords[domain].isVerified, "Domain not verified");
        
        DomainRecord storage record = domainRecords[domain];
        record.isVerified = false;
        record.isActive = false;
        
        // In a real implementation, you'd want to log the reason
        // emit DomainRevoked(domain, msg.sender, reason, block.timestamp);
    }

    function bulkVerifyDomains(
        string[] memory domains,
        bytes32[] memory evidenceHashes
    ) external onlyRole(VERIFIER_ROLE) {
        require(domains.length == evidenceHashes.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < domains.length; i++) {
            if (domainRecords[domains[i]].isActive && 
                !domainRecords[domains[i]].isVerified &&
                !verifiedEvidence[evidenceHashes[i]]) {
                
                domainRecords[domains[i]].isVerified = true;
                domainRecords[domains[i]].evidenceHash = evidenceHashes[i];
                verifiedEvidence[evidenceHashes[i]] = true;
                allEvidenceHashes.push(evidenceHashes[i]);
                
                emit DomainVerified(domains[i], msg.sender, block.timestamp);
            }
        }
    }

    function getVerificationStats() 
        external 
        view 
        returns (
            uint256 totalDomains,
            uint256 verifiedDomains,
            uint256 activeCertificates,
            uint256 expiredCertificates
        ) 
    {
        totalDomains = allDomains.length;
        
        for (uint256 i = 0; i < allDomains.length; i++) {
            string memory domain = allDomains[i];
            
            if (domainRecords[domain].isVerified) {
                verifiedDomains++;
            }
            
            SSLCertificate memory cert = sslCertificates[domain];
            if (cert.isValid && cert.validTo > block.timestamp) {
                activeCertificates++;
            } else if (cert.recordedAt > 0 && cert.validTo <= block.timestamp) {
                expiredCertificates++;
            }
        }
        
        return (totalDomains, verifiedDomains, activeCertificates, expiredCertificates);
    }
}

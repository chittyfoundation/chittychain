class ChittyChainSDK {
  constructor(config) {
    this.endpoint = config.endpoint || 'http://localhost:8545';
    this.contracts = {
      capability: '0x...', // Deploy address
      domain: '0x...',
      property: '0x...'
    };
  }
  
  async recordCapability(source, target, name, type) {
    const hash = this.calculateHash(`${source}:${name}:${Date.now()}`);
    
    // Record on-chain
    const tx = await this.capabilityContract.recordCapability(
      source, target, name, type
    );
    
    // Also save locally for fast access
    await this.saveToCache(hash, { source, target, name, type });
    
    return { hash, txHash: tx.hash };
  }
  
  async verifyDomain(fqdn) {
    // Get SSL cert
    const sslHash = await this.getSSLCertHash(fqdn);
    
    // Record verification
    const tx = await this.domainContract.verifyDomain(fqdn, sslHash);
    
    return { verified: true, sslHash, txHash: tx.hash };
  }
  
  calculateHash(data) {
    const crypto = require('crypto');
    return '0x' + crypto.createHash('sha256').update(data).digest('hex');
  }
}

module.exports = ChittyChainSDK;

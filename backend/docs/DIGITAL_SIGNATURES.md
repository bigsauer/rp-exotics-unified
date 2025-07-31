# Digital Signature System with Legal Compliance

This document explains how to use the digital signature system for signing agreements using API keys, with full legal compliance for electronic signatures.

## Overview

The digital signature system allows both internal users and external customers/dealers to sign documents electronically using secure API keys. The system provides:

- **Legal Compliance**: Full compliance with electronic signature laws and regulations
- **API Key Management**: Create and manage API keys for different entities
- **Digital Signatures**: Sign documents with drawn or typed signatures
- **Signature Verification**: Verify signature authenticity and integrity
- **Audit Trail**: Complete tracking of all signature activities
- **Consent Management**: Proper recording of legal consent requirements

## Legal Compliance Requirements

The system ensures compliance with all legal requirements for electronic signatures:

### 1. Intent to Sign
- User must clearly agree to sign electronically
- Recorded with timestamp and IP address
- Required checkbox: "I agree to sign this document electronically"

### 2. Consent to Do Business Electronically
- Must be recorded with timestamp
- Required checkbox: "I consent to conduct business electronically"
- User acknowledges electronic signatures are legally binding

### 3. Clear Signature Association
- Signature must be clearly linked to a specific person/document
- Identity verification through API keys
- Complete audit trail of signer identity

### 4. Integrity of the Signed Document
- Once signed, document must be tamper-evident
- Cryptographic hashing ensures document integrity
- Hash includes all consent data and signature information

## API Key Management

### Creating API Keys

API keys can be created for different entity types:

- **Internal Users**: Staff members who can sign documents
- **Customers**: External customers who need to sign agreements
- **Dealers**: External dealers who need to sign documents
- **System**: Automated system keys for bulk operations

### API Key Permissions

Each API key has configurable permissions:

- `signAgreements`: Can sign documents
- `viewDocuments`: Can view document details
- `createSignatures`: Can create signature requests

### API Key Security

- API keys are cryptographically secure (32-byte random hex)
- Keys can be set to expire automatically
- Usage tracking and monitoring
- Ability to regenerate keys if compromised

## API Endpoints

### API Key Management

#### Get All API Keys (Admin Only)
```http
GET /api/apikeys
Authorization: Bearer <jwt_token>
```

#### Create API Key (Admin Only)
```http
POST /api/apikeys
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Customer Signature Key",
  "description": "API key for customer document signing",
  "type": "customer",
  "entityId": "507f1f77bcf86cd799439011",
  "entityType": "User",
  "permissions": {
    "signAgreements": true,
    "viewDocuments": true,
    "createSignatures": false
  },
  "expiresAt": "2025-12-31T23:59:59.000Z"
}
```

#### Validate API Key
```http
POST /api/apikeys/validate
Content-Type: application/json

{
  "key": "rpex_abc123..."
}
```

### Digital Signatures

#### Create Signature Request
```http
POST /api/signatures/request
x-api-key: rpex_abc123...
Content-Type: application/json

{
  "documentId": "507f1f77bcf86cd799439011",
  "documentType": "purchase_agreement",
  "signerName": "John Doe",
  "signerEmail": "john@example.com",
  "signerType": "customer"
}
```

#### Record Intent to Sign (NEW)
```http
POST /api/signatures/consent/intent-to-sign
x-api-key: rpex_abc123...
Content-Type: application/json

{
  "signatureId": "sig_abc123...",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

#### Record Electronic Business Consent (NEW)
```http
POST /api/signatures/consent/electronic-business
x-api-key: rpex_abc123...
Content-Type: application/json

{
  "signatureId": "sig_abc123...",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

#### Sign Document
```http
POST /api/signatures/sign
x-api-key: rpex_abc123...
Content-Type: application/json

{
  "signatureId": "sig_abc123...",
  "signatureImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "typedSignature": "John Doe",
  "coordinates": {
    "x": 100,
    "y": 200,
    "page": 1
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

#### Get Signature Status
```http
GET /api/signatures/status/sig_abc123...
```

#### Verify Signature
```http
POST /api/signatures/verify/sig_abc123...
```

#### Get Legal Compliance Report (NEW)
```http
GET /api/signatures/compliance/sig_abc123...
```

## Frontend Integration

### API Key Management Component

The `ApiKeyManagement` component provides a full interface for managing API keys:

- Create new API keys
- View and edit existing keys
- Regenerate keys
- Monitor usage
- Set permissions

### Document Signature Component

The `DocumentSignature` component provides a signature interface for customers with legal compliance:

- **Step 1**: Legal consent checkboxes (Intent to Sign + Electronic Business Consent)
- **Step 2**: Signature creation (draw or type)
- **Step 3**: Completion with compliance verification
- Real-time signature preview
- Secure submission with full audit trail

### Signature Compliance Report Component (NEW)

The `SignatureComplianceReport` component provides detailed legal compliance reporting:

- Overall compliance status
- Individual requirement verification
- Timestamp and IP address tracking
- Export capabilities for legal documentation

## Usage Examples

### 1. Creating a Customer API Key

```javascript
// Admin creates API key for customer
const response = await fetch('/api/apikeys', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Customer John Doe',
    description: 'API key for John Doe to sign purchase agreement',
    type: 'customer',
    entityId: customerId,
    entityType: 'User',
    permissions: {
      signAgreements: true,
      viewDocuments: true,
      createSignatures: false
    }
  })
});

const { apiKey } = await response.json();
// Send apiKey.key to customer
```

### 2. Customer Signs Document with Legal Compliance

```javascript
// Step 1: Record intent to sign
await fetch('/api/signatures/consent/intent-to-sign', {
  method: 'POST',
  headers: {
    'x-api-key': customerApiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    signatureId: 'sig_abc123...',
    ipAddress: '192.168.1.1',
    userAgent: navigator.userAgent
  })
});

// Step 2: Record electronic business consent
await fetch('/api/signatures/consent/electronic-business', {
  method: 'POST',
  headers: {
    'x-api-key': customerApiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    signatureId: 'sig_abc123...',
    ipAddress: '192.168.1.1',
    userAgent: navigator.userAgent
  })
});

// Step 3: Sign the document
const signatureResponse = await fetch('/api/signatures/sign', {
  method: 'POST',
  headers: {
    'x-api-key': customerApiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    signatureId: 'sig_abc123...',
    signatureImage: canvas.toDataURL(),
    ipAddress: '192.168.1.1',
    userAgent: navigator.userAgent
  })
});
```

### 3. Verifying Signatures and Compliance

```javascript
// Verify signature authenticity
const verifyResponse = await fetch('/api/signatures/verify/sig_abc123...');
const { isValid, legalCompliance, signature } = await verifyResponse.json();

if (isValid && legalCompliance.isCompliant) {
  console.log('Signature is valid and legally compliant');
  console.log('Signed by:', signature.signerName);
  console.log('Signed at:', signature.signatureData.timestamp);
}

// Get detailed compliance report
const complianceResponse = await fetch('/api/signatures/compliance/sig_abc123...');
const compliance = await complianceResponse.json();

console.log('Compliance Status:', compliance.compliance);
console.log('Requirements:', compliance.requirements);
```

## Security Features

### Signature Integrity

- Each signature generates a cryptographic hash
- Hash includes document ID, signer ID, timestamp, signature data, and consent data
- Tampering with any component invalidates the signature

### Legal Compliance Verification

- Automatic verification of all legal requirements
- Timestamp and IP address tracking for all consent actions
- Identity verification through API keys
- Complete audit trail for legal documentation

### API Key Security

- Keys are stored hashed in the database
- Rate limiting on API key usage
- Automatic expiration handling
- Usage monitoring and alerts

### Audit Trail

- All signature activities are logged
- IP address and user agent tracking
- Timestamp and coordinate tracking
- Complete signature history with consent records

## Legal Compliance

The digital signature system is designed to meet all legal requirements:

- **Authentication**: API keys provide strong authentication
- **Integrity**: Cryptographic hashing ensures document integrity
- **Non-repudiation**: Complete audit trail prevents denial
- **Timestamp**: Precise timestamp for each signature and consent action
- **Consent**: Clear consent mechanisms with proper recording
- **Association**: Clear linking of signatures to specific persons and documents

### Compliance Verification

The system automatically verifies compliance with:

1. **Intent to Sign**: User must explicitly agree to sign electronically
2. **Electronic Business Consent**: User must consent to electronic business
3. **Signature Association**: Clear linking of signature to person and document
4. **Document Integrity**: Tamper-evident protection of signed documents

## Best Practices

### API Key Management

1. **Rotate Keys Regularly**: Set expiration dates for all keys
2. **Principle of Least Privilege**: Only grant necessary permissions
3. **Monitor Usage**: Track key usage for suspicious activity
4. **Secure Distribution**: Send keys through secure channels

### Signature Process

1. **Clear Communication**: Explain the signature process to customers
2. **Document Review**: Ensure customers can review documents before signing
3. **Consent Confirmation**: Get explicit consent for electronic signatures
4. **Record Keeping**: Maintain complete records of all signatures and consent

### Legal Compliance

1. **Always Require Consent**: Never skip the consent checkboxes
2. **Record Everything**: Log all consent actions with timestamps
3. **Verify Identity**: Ensure proper identity verification
4. **Maintain Integrity**: Protect document integrity with hashing

### Security

1. **HTTPS Only**: Always use HTTPS for all API communications
2. **Input Validation**: Validate all signature data
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Monitoring**: Monitor for unusual signature patterns

## Troubleshooting

### Common Issues

1. **Invalid API Key**: Check if key is active and not expired
2. **Permission Denied**: Verify API key has required permissions
3. **Signature Not Found**: Check signature ID is correct
4. **Consent Not Recorded**: Ensure consent checkboxes are completed
5. **Legal Compliance Failed**: Check all four legal requirements are met

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=signatures:*
```

This will log all signature-related activities for troubleshooting.

## Support

For technical support or questions about the digital signature system:

1. Check the API documentation
2. Review the audit logs
3. Contact the development team
4. Check the system status page
5. Review legal compliance reports for specific signatures 
# SSH Key Setup for GitHub Actions Deployment

## Problem
Exit code 255 indicates SSH authentication failure. The SSH key format in GitHub Secrets needs to be exactly correct.

## Solution Steps

### 1. Get the Correct SSH Private Key from Server

Connect to your Digital Ocean server and get the EXACT private key:

```bash
ssh root@qquadro.com
cat ~/.ssh/id_rsa
```

### 2. Copy the COMPLETE Private Key

The key must include:
- `-----BEGIN OPENSSH PRIVATE KEY-----` (start line)
- All the key content (multiple lines)
- `-----END OPENSSH PRIVATE KEY-----` (end line)

Example format:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABFwAAAAdzc2gtcn
... (many lines of base64 encoded data) ...
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
-----END OPENSSH PRIVATE KEY-----
```

### 3. Update GitHub Secret

1. Go to: https://github.com/Acidsyd/BOB_inbox/settings/secrets/actions
2. Click on `DEPLOY_SSH_KEY` secret
3. Click "Update"
4. Paste the COMPLETE private key (including BEGIN/END lines)
5. Click "Update secret"

### 4. Alternative: Generate New SSH Key Pair

If the current key doesn't work, generate a new pair:

**On your Digital Ocean server:**
```bash
# Generate new key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_deploy -N ""

# Add public key to authorized_keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Display private key for GitHub Secrets
cat ~/.ssh/github_deploy
```

**Then update GitHub Secret with the new private key.**

### 5. Test SSH Connection Locally

Before updating GitHub, test the SSH connection:
```bash
# Save the private key to a file
echo "-----BEGIN OPENSSH PRIVATE KEY-----
... your key content ...
-----END OPENSSH PRIVATE KEY-----" > test_key.pem

# Set correct permissions
chmod 600 test_key.pem

# Test connection
ssh -i test_key.pem -o StrictHostKeyChecking=no root@qquadro.com "echo 'Connection successful'"

# Clean up
rm test_key.pem
```

### 6. Common Issues

- **Missing BEGIN/END lines**: Key must have complete headers
- **Wrong line endings**: Use Unix line endings (LF, not CRLF)
- **Extra spaces**: No trailing spaces or extra characters
- **Wrong key**: Make sure it's the PRIVATE key, not public key
- **Wrong format**: Should be OpenSSH format, not PEM

### 7. Verification

After updating the GitHub Secret, the workflow should show:
- ✅ SSH connection test passes
- ✅ Deployment executes successfully
- ✅ 413 error fixes applied to production
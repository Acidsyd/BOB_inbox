# Quick SSH Key Fix - Step by Step

The GitHub Actions workflow is now detecting an invalid SSH key format. Here's how to fix it:

## Step 1: Get the Correct SSH Key from Your Server

```bash
# Connect to your Digital Ocean server
ssh root@qquadro.com

# Display the complete private key
cat ~/.ssh/id_rsa
```

## Step 2: Copy the EXACT Output

The key must look EXACTLY like this format:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEAy8Js3wefr+k8R3WR1m/s8nP8H7UwjISDFG8JKLmnwJHYWZ9
... (many more lines of base64 encoded data) ...
AAAAB3NzaC1yc2EAAAADAQABAAABAQDLwmzfB5+v6TxHdZHWb+zyc/wftTCMhIMU
-----END OPENSSH PRIVATE KEY-----
```

**CRITICAL POINTS:**
- Must include the `-----BEGIN OPENSSH PRIVATE KEY-----` line
- Must include all the base64 content (multiple lines)
- Must include the `-----END OPENSSH PRIVATE KEY-----` line
- No extra spaces, no missing characters

## Step 3: Update GitHub Secrets

1. Go to: https://github.com/Acidsyd/BOB_inbox/settings/secrets/actions
2. Click on `DEPLOY_SSH_KEY`
3. Click "Update"
4. Paste the COMPLETE key (all lines from BEGIN to END)
5. Click "Update secret"

## Step 4: Trigger New Deployment

After updating the secret, push any small change to trigger a new deployment:

```bash
# Make a small change to trigger deployment
echo "# SSH key updated $(date)" >> README.md
git add README.md
git commit -m "trigger deployment after SSH key fix"
git push origin main
```

## Alternative: Generate Fresh SSH Key Pair

If you can't find the existing key, generate a new one:

```bash
# On your Digital Ocean server
ssh root@qquadro.com

# Generate new SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_actions -N ""

# Add the public key to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Display the private key for GitHub Secrets
echo "Copy this ENTIRE output to GitHub Secrets:"
echo "=================================================="
cat ~/.ssh/github_actions
echo "=================================================="
```

Then copy the complete output and update the GitHub Secret.

## What Happens Next

Once the SSH key is properly formatted:
- ✅ GitHub Actions workflow will pass SSH validation
- ✅ SSH connection test will succeed
- ✅ Deployment will execute successfully
- ✅ Your 413 error fixes will be applied to production
- ✅ CSV uploads will work with 200MB limit

## Troubleshooting

If you're still having issues:
1. Check the GitHub Actions logs for specific error messages
2. The workflow now shows the first 50 characters of your key for debugging
3. Make sure there are no trailing spaces or extra characters
4. Ensure you're copying the PRIVATE key, not the public key (.pub file)
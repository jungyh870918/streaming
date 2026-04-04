# Remove the old git repository
if (Test-Path .git) {
    Remove-Item -Path .git -Recurse -Force
    Write-Host "Removed old .git folder"
}

# Initialize new git repository
git init
Write-Host "Initialized new git repository"

# Configure git user
git config user.name "Daniel"
git config user.email "jungyh870918@gmail.com"
Write-Host "Configured git user"

# Show git status
Write-Host "`nGit Status:"
git status

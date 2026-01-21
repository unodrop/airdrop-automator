#!/bin/bash

# Check if a version argument is provided
if [ -z "$1" ]; then
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh 0.1.1"
  exit 1
fi

NEW_VERSION=$1

# Update package.json version
# Using sed for cross-platform compatibility (macOS/Linux)
# macOS requires an empty string argument for -i
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$NEW_VERSION\"/" package.json
  sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
else
  sed -i "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$NEW_VERSION\"/" package.json
  sed -i "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
fi

echo "Updated version to $NEW_VERSION in package.json and tauri.conf.json"

# Git operations
git add package.json src-tauri/tauri.conf.json
git commit -m "chore(release): v$NEW_VERSION"
git tag "v$NEW_VERSION"

echo "Created git tag v$NEW_VERSION"
echo "Pushing to remote..."

git push origin main
git push origin "v$NEW_VERSION"

echo "Done! GitHub Action should now start building the release."

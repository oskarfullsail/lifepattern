#!/bin/bash

echo "🌐 Cloning LifePattern AI project using HTTPS..."

# Check for Git
if ! command -v git &> /dev/null
then
    echo "❌ Git is not installed. Please install Git and try again."
    exit 1
fi

# Clone the repo
echo "📥 You may be prompted to enter your GitHub username and a Personal Access Token (PAT)."
echo "🔐 If you don't have a PAT, create one at https://github.com/settings/tokens with 'repo' access."

git clone https://github.com/oskarfullsail/lifepattern.git

# Navigate into the project folder
cd lifepattern || exit

echo "✅ Repository cloned successfully into $(pwd)"

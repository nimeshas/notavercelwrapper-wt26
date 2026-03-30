#!/usr/bin/env bash
set -euo pipefail

PACKAGES=(
  docker
  git
  unzip
  tar
  curl
)

echo "Updating package metadata..."
sudo dnf makecache --refresh

echo "Installing worker dependencies..."
sudo dnf install -y "${PACKAGES[@]}"

echo "Enabling and starting Docker..."
sudo systemctl enable docker
sudo systemctl start docker

CURRENT_USER="$(whoami)"
if id -nG "$CURRENT_USER" | grep -qw docker; then
  echo "User $CURRENT_USER is already in the docker group."
else
  echo "Adding $CURRENT_USER to docker group..."
  sudo usermod -aG docker "$CURRENT_USER"
fi

echo "Bootstrap complete."
echo "Docker version:"
sudo docker --version
echo "Docker service status:"
sudo systemctl --no-pager --full status docker | sed -n '1,12p'
echo
echo "If you were just added to the docker group, start a new session before running docker without sudo."

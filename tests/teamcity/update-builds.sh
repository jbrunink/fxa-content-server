#!/usr/bin/env bash

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

set -o errexit # exit on first command with non-zero status

function update_needed() {
  echo -n "Checking whether Firefox binaries should be updated... "

  if [ ! -f "$LASTUPDATE_FILE" ]; then
    touch "$LASTUPDATE_FILE" # ensure it exists
  fi

  # allow environment override of $update_interval
  local update_interval=${UPDATE_INTERVAL:-86400}

  # isn't date math in bash so much fun?
  local now=$(date +%s)
  local was=$(date -r "$LASTUPDATE_FILE" +%s)
  local age=$(( $now - $was ))
  local fresh=$(( $age < $update_interval ))

  return $fresh
}

CHANNELS_DIR=$1
if [ -z "$1" ]; then
  CHANNELS_DIR="$HOME/firefox-channels"
fi

FXDOWNLOAD_DIR=$2
if [ -z "$2" ]; then
  FXDOWNLOAD_DIR="$HOME/fxdownload"
fi

LASTUPDATE_FILE="$CHANNELS_DIR/.lastupdate"
mkdir -p $CHANNELS_DIR

if ! update_needed; then
  echo No update of Firefox builds is needed at this time.
  exit 0
fi
echo Firefox builds update needed. Beginning update.

echo Updating jrgm/fxdownload repo, if needed ...
if [ ! -d $FXDOWNLOAD_DIR ]; then
  git clone git://github.com/jrgm/fxdownload $FXDOWNLOAD_DIR
else
  (cd $FXDOWNLOAD_DIR && git pull)
fi

cd $FXDOWNLOAD_DIR && npm install

for d in beta release esr; do
  ./index.js --install-dir $CHANNELS_DIR --channel $d
done

for d in latest-beta latest latest-esr; do
  $CHANNELS_DIR/$d/en-US/firefox/firefox-bin --version
done

touch "$LASTUPDATE_FILE"
echo Firefox binaries update complete!

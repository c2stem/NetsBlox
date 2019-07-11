# This script will update the client submodule
git fetch
git submodule update
npm run install
pm2 update dev

# This script will update the client submodule
cd src/browser
git fetch c2stem
git checkout c2stem/netsblox
npm run postinstall
pm2 update editor --update-env

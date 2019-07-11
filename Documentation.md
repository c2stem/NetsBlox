
### Code base

Dev branch

- Server: Copy of 'Master' branch from 'c2stem/Netsblox' (editor) 
- Client: The submodule (browser code)of dev branch is the 'Netsblox' branch of 'c2stem/snap-physics'.
  
### Checkout dev branch locally.

 - `git clone git@github.com:c2stem/NetsBlox.git --recursive`
 - Make sure to switch to branch dev
	 - `git branch -a` (shows available branches)
	 - `git checkout dev`
	 - `npm install`

The local version should be ready to be worked on.
 
### Run Netsblox locally.
Start the server with `npm start` and navigate to `localhost:8080` in a web browser to try it out!

### Commit

 Always get the latest copy before any commit. Do a `git pull` to make sure you have a current copy. Update the client submodules by running `git submodule update` and run `npm install` to install any new packages. Once you are ready to commit

 - You can track status with `git status`
 - stage all you changes with `git add .` or specific changes with `git add <filename>`
 - Always commit your code with a message. `git commit -m "message"`
 - On successful commit Push your changes to the repository. `git push`

The code should be available for other to use from there and to be pushed on to the server.

### Server handling
Work with Naveed for this at least initially for few changes to make sure we have a standard. 

If you have ssh access to the server get in an find your way to dev directory from the root `cd dev`. We follow the similar procedure of commit from here. Except, there is an update shell script that helps in updating the submodules in the directory. It can be run by `./update.sh` This will fetch and update the submodules which in our case is the browser code. 

   

 

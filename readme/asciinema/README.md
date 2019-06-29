# Asciinema instructions

## setup

1. install https://asciinema.org/docs/installation
1. install https://github.com/marionebl/svg-term-cli
1. `cd readme/asciinema`
1. run `cat .bashrc >> ~/.bashrc` (if you haven't already) to set the prompt
1. create a new repo with a simple readme and example source code file

## record

1. run `ASCIINEMA_REC=1 asciinema rec demo.cast --command bash` and record the session
1. run `svg-term --in demo.cast --out demo.svg --window`
1. run `cp demo.* ../embedme/readme/asciinema`

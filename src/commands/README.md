# Commands Folder

Every command exports a `data` slash command builder and an `execute` function. Put commands in a category folder so `/help` and future maintainers can find them quickly.

Message-based commands live in `src/prefixCommands` so slash commands and prefix commands can evolve independently.

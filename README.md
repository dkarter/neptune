# Neptune

## Setup Instructions

## Set up the app for running it locally

```bash
mix setup
```

## Run locally

```bash
mix phx.server
```

You should now be able to visit the server in your browser on http://localhost:4000

## Run **Production** Release Locally

### Set environment variables
Make sure you have Direnv installed for this to work.

```bash
cp .envrc.example .envrc
```

Edit the `SECRET_KEY_BASE` to a stable value which you can generate using `mix phx.gen.secret`. Here's a handy script

```bash
sed 's@SECRET_KEY_BASE=.*@SECRET_KEY_BASE='"$(mix phx.gen.secret)"'@' .envrc
```

Check that it changed, and then enable it with:

```bash
direnv allow
```

### Build the Production Release

```bash
MIX_ENV=prod mix release --overwrite
```

### Build Docker Image

```bash
docker build -t neptune .
```

### Run in Docker Container

This command will pass env vars from the terminal session to the container and will run it in daemon mode

```bash
docker run --rm -d -p $PORT:$PORT -e PORT -e SECRET_KEY_BASE -e DATABASE_URL --name neptune neptune
```

You should now be able to visit the server in your browser on http://localhost:4000

### Stop Docker Container

```bash
docker stop neptune
```


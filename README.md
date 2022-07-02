<p align="center">
  <img
    src="./assets/images/logo.svg"
    alt="Neptune Logo"
    width="220"
  />
</p>

<p align="center">
  <h3>Neptune</h3>
  <h5>Example Elixir Cluster on K8s</h5>
</p>

![screenshot](./screenshot.png)

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

Edit the `SECRET_KEY_BASE` to a stable value, which you can generate using `mix phx.gen.secret`. Here's a handy script

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

## Run more nodes

Make sure the `.hosts.erlang` file has the right hostname for your machine.

Get the hostname this way:

```bash
hostname
```

Run in two different terminals:

```bash
MIX_ENV=prod PORT=4000 iex --sname node4000 -S mix phx.server
```

```bash
MIX_ENV=prod PORT=4001 iex --sname node4001 -S mix phx.server
```

The nodes should automatically connect via libcluster :sparkles:

# Kubernetes
This app can be run locally using Minikube

## Setup
First set up the cluster:

```bash
minikube start -p neptune-mk -n 2
```

(this will create a 2 node cluster)

## Secrets
You will need to create a secrets file

```bash
kubectl create secret generic neptune-secret
```

And then edit it to include a few secrets:

```bash
kubectl edit secrets neptune-secret
```

It should look something like this:

```yaml
apiVersion: v1
data:
  database_password: <base64 encoded password>
  database_url: <base64 encoded database url e.g. ecto://postgres:mysecretpassword@postgres-service/neptune_prod>
  secret_key_base: <base64 encoded generated secret e.g. from mix phx.gen.secret>
kind: Secret
metadata:
  creationTimestamp: "2022-06-17T04:08:33Z"
  name: neptune-secret
  namespace: default
  resourceVersion: "27981"
  uid: b9d65217-4fa0-42a7-b230-b611de14ad10
type: Opaque
```

## Applying configurations

```bash
kubectl apply -f k8s
```

This should create all necessary pods and services

## Accessing the tunnel
To access the cluster you can use

```bash
minikube tunnel
```

Then to find the IP address of the cluster:

```bash
kubectl get pods -o wide
```

And look for the external IP of the neptune-service, which you can plug into your browser e.g. `http://10.106.243.99:4000`

## Connecting to Postgres DB

First list the pods to find the Cluster IP of the postgres service

```bash
kubectl get pods
```

```
NAME               TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
kubernetes         ClusterIP      10.96.0.1        <none>        443/TCP          27d
neptune-headless   ClusterIP      None             <none>        <none>           6s
neptune-service    LoadBalancer   10.99.44.84      10.99.44.84   4000:31793/TCP   6s
postgres-service   ClusterIP      10.110.129.226   <none>        5432/TCP         5s
```

Then use that IP to connect to the database via psql

```bash
psql -U postgres -h 10.110.129.226
```


# Deployment

## Semi-Auto

This project uses Pulumi to deploy the K8s cluster to DigitalOcean.

First install Pulumi on your machine, then cd into the `infra` directory and set all the required secrets for the stack (dev):

```bash
pulumi config set --secret digitalocean:token <DO_API_TOKEN>
pulumi config set domain example.com # make sure you have the nameservers pointed at digitalocean since this is how we manage the DNS
pulumi config set subdomain k8s # can be anything
pulumi config set --secret database_password <pass>
pulumi config set --secret database_url 'ecto://<user>:<pass>@postgres-service/neptune_prod'
pulumi config set --secret secret_key_base '<generate via mix phx.gen.secret>'
```

Then run

```bash
pulumi up
```

## Full Auto (Continuous Deployment + Preview Envs)

Coming soon...!

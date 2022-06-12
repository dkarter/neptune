# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :neptune,
  ecto_repos: [Neptune.Repo]

# Configures the endpoint
config :neptune, NeptuneWeb.Endpoint,
  url: [host: "localhost"],
  render_errors: [view: NeptuneWeb.ErrorView, accepts: ~w(html json), layout: false],
  pubsub_server: Neptune.PubSub,
  live_view: [signing_salt: "eN9kQLJA"]

# config :libcluster,
#   topologies: [
#     # Using erlang port mapper and specifying the hosts
#     # epmd_example: [
#     #   strategy: Cluster.Strategy.Epmd,
#     #   config: [
#     #     hosts: [:"node4000@pop-os", :"node4001@pop-os"]
#     #   ]
#     # ],

#     # when all the nodes are on the same machine they can connect automatically
#     # local_epmd_example: [
#     #   strategy: Cluster.Strategy.LocalEpmd
#     # ],

#     # use .hosts.erlang to specify hosts
#     # erlang_hosts_example: [
#     #   strategy: Cluster.Strategy.ErlangHosts
#     # ]
#   ]
#

config :libcluster,
  topologies: [
    k8s_example: [
      strategy: Elixir.Cluster.Strategy.Kubernetes.DNS,
      config: [
        service: "neptune-headless",
        application_name: "neptune"
      ]
    ]
  ]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :neptune, Neptune.Mailer, adapter: Swoosh.Adapters.Local

# Swoosh API client is needed for adapters other than SMTP.
config :swoosh, :api_client, false

# Configure esbuild (the version is required)
config :esbuild,
  version: "0.14.0",
  default: [
    args:
      ~w(js/app.js --bundle --target=es2017 --outdir=../priv/static/assets --external:/fonts/* --external:/images/*),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"

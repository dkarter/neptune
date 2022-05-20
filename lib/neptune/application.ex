defmodule Neptune.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    topologies = Application.get_env(:libcluster, :topologies) || []

    children = [
      # Start the Ecto repository
      Neptune.Repo,
      # Start the Telemetry supervisor
      NeptuneWeb.Telemetry,
      # Start the PubSub system
      {Phoenix.PubSub, name: Neptune.PubSub},
      # Start the Endpoint (http/https)
      NeptuneWeb.Endpoint,
      {Cluster.Supervisor, [topologies, [name: Neptune.ClusterSupervisor]]}
    ]

    opts = [strategy: :one_for_one, name: Neptune.Supervisor]

    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    NeptuneWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end

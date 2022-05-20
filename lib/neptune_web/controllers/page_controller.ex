defmodule NeptuneWeb.PageController do
  use NeptuneWeb, :controller

  def index(conn, _params) do
    this_node = node()
    other_nodes = Node.list()

    conn
    |> render("index.html", %{
      this_node: this_node,
      other_nodes: other_nodes
    })
  end
end

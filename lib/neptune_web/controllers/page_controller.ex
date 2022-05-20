defmodule NeptuneWeb.PageController do
  use NeptuneWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end

defmodule Waje.Vault do
  use GenServer

  def start_link() do
    GenServer.start_link(__MODULE__, :ok, [name: :vault])
  end

  defp fetch_url(url) do
    contents = HTTPotion.get(url)
    GenServer.call(:vault, {:insert, url, contents})
    contents
  end

  def fetch(url) do
    case GenServer.call(:vault, {:lookup, url}) do
      {:found, contents} -> contents
      {:not_found} -> fetch_url(url)
    end
  end

  def init(:ok) do
    table = :ets.new(:vault, [])
    {:ok, table}
  end

  def handle_call({:lookup, url}, _from, table) do
    case :ets.lookup(table, url) do
      [contents] -> {:reply, {:found, contents}, table}
      [] -> {:reply, {:not_found}, table}
    end
  end

  def handle_call({:insert, url, contents}, _from, table) do
    :ets.insert(table, {url, contents})
    {:reply, nil, table}
  end
end

defmodule Waje.Vault do
  use GenServer

  def start_link() do
    GenServer.start_link(__MODULE__, :ok, [name: :vault])
  end

  defp fetch_url(url) do
    contents = HTTPotion.get(url).body
    GenServer.call(:vault, {:insert, url, contents})
    contents
  end

  def fetch(url) do
    case GenServer.call(:vault, {:lookup, url}) do
      {:found, contents} -> contents
      {:not_found} -> fetch_url(url)
    end
  end

  defp path_from_url(url) do
    "./vault/" <> String.replace(url, "/", ":")
  end

  def handle_call({:lookup, url}, _from, state) do
    case File.read(path_from_url(url)) do
      {:ok, contents} -> {:reply, {:found, contents}, state}
      {:error, :enoent} -> {:reply, {:not_found}, state}
    end
  end

  def handle_call({:insert, url, contents}, _from, state) do
    File.mkdir_p!("./vault/")
    File.write!(path_from_url(url), contents)
    {:reply, nil, state}
  end
end

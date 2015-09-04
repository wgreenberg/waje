defmodule Waje.Fetcher do
  def start_link() do
    GenEvent.start_link([name: :fetcher_events])
  end

  def fetch_asset(url) do
    {:ok, asset} = Waje.Fetcher.Asset.start_link()
    Waje.Fetcher.Asset.start_fetch(asset, url)
    asset
  end
end

defmodule Waje.Fetcher.Asset do
  use GenServer

  def start_link() do
    GenServer.start_link(__MODULE__, {:ok})
  end

  def init({:ok}) do
    {:ok, nil}
  end

  def start_fetch(asset, url) do
    GenServer.cast(asset, {:start_fetch, url})
  end

  def handle_cast({:start_fetch, url}, state) do
    asset_id = url

    GenEvent.notify(:fetcher_events, {:fetch_start, asset_id})

    parsed_uri = URI.parse(url)
    contents =
      case String.split(parsed_uri.authority, ".") do
        [_, "wikipedia", "org"] -> Waje.Wiki.fetch_asset(parsed_uri, asset_id)
      end

    GenEvent.notify(:fetcher_events, {:fetch_done, asset_id})

    {:noreply, state}
  end
end

defmodule Waje.Fetcher.Watcher do
  use GenEvent

  def handle_event(event, parent) do
    IO.inspect(event)
    {:ok, parent}
  end
end

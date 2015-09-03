defmodule Waje.Fetcher do
  use GenServer

  def start_link() do
    GenServer.start_link(__MODULE__, :ok, [name: :fetcher])
    GenEvent.start_link([name: :fetcher_event])
  end

  def fetch_asset(url) do
    GenEvent.notify(:fetcher_event, {:fetching, url})

    parsed_url = URI.parse(url)

    case String.split(parsed_url.authority, ".") do
      [_, "wikipedia", "org"] -> Waje.Wiki.fetch_asset(parsed_url)
    end
  end
end

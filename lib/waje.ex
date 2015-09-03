defmodule Waje do

  def fetch() do
    {:ok, _} = Waje.Fetcher.start_link()
    {:ok, _} = Waje.Vault.start_link()

    GenEvent.add_handler(:fetcher_events, Waje.Fetcher.Watcher, self())

    url = "https://en.wikipedia.org/wiki/Category:Cats"
    Waje.Fetcher.fetch_asset(url)
  end

end

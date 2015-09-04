defmodule Waje.Wiki do

  defp make_api_request(parsed_uri, params) do
    api_params = URI.encode_query(Dict.merge(params, %{ "format" => "json" }))
    api_uri = "#{parsed_uri.scheme}://#{parsed_uri.authority}/w/api.php?#{api_params}"
    results = Waje.Vault.fetch(api_uri) |> :jsx.decode

    if Dict.has_key?(results, "continue") do
      [results | make_api_request(parsed_uri, Dict.merge(params, results["continue"]))]
    else
      [results]
    end
  end

  defp fetch_article(article_id, parsed_uri, asset_id) do
    [contents] = make_api_request(parsed_uri, %{ "action" => "query",
                                                 "titles" => article_id,
                                                 "redirects" => "",
                                                 "prop" => "revisions|info|categories",
                                                 "inprop" => "url|displaytitle",
                                                 "cllimit" => "max",
                                                 "clshow" => "!hidden",
                                                 "rvprop" => "timestamp", })

    image_info = make_api_request(parsed_uri, %{ "action" => "query",
                                                 "titles" => article_id,
                                                 "redirects" => "",
                                                 "generator" => "images",
                                                 "gimlimit" => "max",
                                                 "iiprop" => "url|dimensions|extmetadata|user|mediatype",
                                                 "iiurlwidth" => 800,
                                                 "prop" => "imageinfo", })

    images = image_info |>
      Enum.filter(fn(r) -> r["query"] end) |>
      Enum.map(fn(r) -> r["query"]["pages"] end) |>
      Enum.map(fn(r) -> Dict.values(r) end) |>
      Enum.concat |>
      Enum.map(fn(r) -> r["imageinfo"] end) |>
      Enum.concat |>
      Enum.filter(fn(r) -> !r["missing"] end) |>
      Enum.filter(fn(r) -> r["mediatype"] != "AUDIO" and r["mediatype"] != "VIDEO" end)

    GenEvent.notify(:fetcher_events, {:num_assets, asset_id, length(images)})
    Enum.map(images, fn(i) -> fetch_image(i, asset_id) end)
  end

  defp fetch_image(image_dict, asset_id) do
    image_url = image_dict["url"]
    image_binary = Waje.Vault.fetch(image_url)
    GenEvent.notify(:fetcher_events, {:fetch_progress, asset_id, image_url})
  end

  def fetch_asset(parsed_uri, asset_id) do
    "/wiki/" <> article_id = parsed_uri.path
    fetch_article(article_id, parsed_uri, asset_id)
  end
end

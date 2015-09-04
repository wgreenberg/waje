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

  defp fetch_by_title(parsed_uri, title) do
    title_url = String.replace(title, " ", "_")
    title_url = URI.encode_www_form(title_url)
    uri = "#{parsed_uri.scheme}://#{parsed_uri.authority}/wiki/#{title_url}"
    Waje.Fetcher.fetch_asset(uri)
  end

  defp fetch_article(article_id, parsed_uri) do
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
                                                 "iiprop" => "url|dimensions|extmetadata|user",
                                                 "iiurlwidth" => 800,
                                                 "prop" => "imageinfo", })

    images = image_info |>
      Enum.filter(fn(r) -> r["query"] end) |>
      Enum.map(fn(r) -> r["query"]["pages"] end) |>
      Enum.map(fn(r) -> Dict.values(r) end) |>
      Enum.concat |>
      Enum.map(fn(r) -> r["imageinfo"] end) |>
      Enum.concat |>
      Enum.filter(fn(r) -> !r["missing"] end)
  end

  defp fetch_category(article_id, parsed_uri) do
    results = make_api_request(parsed_uri, %{ "action" => "query",
                                              "cmtitle" => article_id,
                                              "list" => "categorymembers" })
    results = results |> Enum.map(fn(r) -> r["query"]["categorymembers"] end) |> Enum.concat

    titles = results |> Enum.map(fn(r) -> r["title"] end)
    Enum.each(titles, fn(r) -> fetch_by_title(parsed_uri, r) end)
  end

  def fetch_asset(parsed_uri) do
    "/wiki/" <> article_id = parsed_uri.path

    case article_id do
      # XXX: language codes?
      "Category:" <> _category -> fetch_category(article_id, parsed_uri)
      _ -> fetch_article(article_id, parsed_uri)
    end
  end

end

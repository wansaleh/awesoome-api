require 'json'
require 'dot_hash'
require "nokogiri"
require "excon"
require "pastel"
require 'awesome_print'

$github = DotHash.load JSON.parse File.read '../github.json'

$pastel = Pastel.new




def processItem(item, i, total, prefix = '')

  title = item.text.strip
  url = item[:href]
  full_name = url.sub('https://github.com/', '').split('/')
  full_name = full_name[0] + '/' + full_name[1]
  url = 'https://github.com/' + full_name

  percent = '%.2f' % (100 * (i.to_f / total))

  puts prefix + $pastel.blue("#{i}/#{total} (#{percent}%)")
    + $pastel.yellow("#{prefix}Repo: ") + full_name

  repo_res = Excon.get("https://api.github.com/repos/#{full_name}", :headers => {
    'Authorization' => "token #{$github.token}",
    'User-Agent' => 'Scraper'
  })
  repo_data = JSON.parse repo_res.body

  owner = repo_data['owner'] ? repo_data['owner']['login'] : null
  owner_url = repo_data['owner'] ? repo_data['owner']['html_url'] : null
  description = repo_data['description']
  stargazers = repo_data['stargazers_count']
  homepage = repo_data['homepage']

  puts prefix + $pastel.green("Repo info ✅ ")

  commits_res = Excon.get("https://api.github.com/repos/#{full_name}/commits", :headers => {
    'Authorization' => "token #{$github.token}",
    'User-Agent' => 'Scraper'
  })
  commits_data = JSON.parse commits_res.body

  last_commit = commits_data[0]['commit']['author']['date']
  last_commit_by = commits_data[0]['commit']['author']['name']

  puts last_commit

  puts $pastel.green(" Commits ✅")

  subitems_ul = item.next_element

  if (subitems_ul)

    subitems = subitems_ul.css('> li > a')

    puts $pastel.blue("Subitems: Total: #{subitems.count}")

    subitems_out = []
    k = 0
    subitems.each do |item|
      k += 1
      subitems_out.push processItem(item, k, subitems.count, prefix + '    ')
    end

    return {
      'id' => full_name,
      'title' => title,
      'url' => url,
      # 'description' => description,
      # 'owner' => owner,
      # 'owner_url' => owner_url,
      # 'homepage' => homepage,
      'stargazers' => stargazers,
      'last_commit' => last_commit,
      # 'last_commit_by' => last_commit_by,
      'items' => subitems,
    }

  else

    return {
      'id' => full_name,
      'title' => title,
      'url' => url,
      # 'description' => description,
      # 'owner' => owner,
      # 'owner_url' => owner_url,
      # 'homepage' => homepage,
      'stargazers' => stargazers,
      'last_commit' => last_commit,
      # 'last_commit_by' => last_commit_by,
    }

  end

end














puts $pastel.green("Reading #{$github.repo}...")

response = Excon.get("https://api.github.com/repos/#{$github.repo}/readme", :headers => {
  'Authorization' => "token #{$github.token}",
  'Accept' => 'application/vnd.github.v3.html',
  'User-Agent' => 'Scraper'
})

@readme = Nokogiri::HTML(response.body)

categories = @readme.at_css('.entry-content').at_css('h2').next_element.css('> li > a')

puts $pastel.blue("Total categories: #{categories.count}")

data = {
  'things' => []
}

# loop through categories
categories.each do |category|

  id = category[:href].strip[1..-1]
  title = category.text.strip

  if (id != 'platforms')
    break
  end

  puts $pastel.green("Category:") + " " + title

  items = @readme.at_css("a[id='user-content-#{id}']").parent.next_element.css('> li > a')

  puts $pastel.blue("Total items: #{items.count}")

  items_out = []

  i = 0
  items.each do |item|
    i += 1
    items_out.push(processItem(item, i, items.count))
  end

  data['things'].push({
    'id' => id,
    'title' => title,
    'items' => items_out
  })

end





puts
puts JSON.pretty_generate(data)